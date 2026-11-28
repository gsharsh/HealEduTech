#!/usr/bin/env python3
"""Verify the request budget through a real, disposable PostgREST HTTP server.

Requires an installed PostgREST 14.18 executable and local PostgreSQL tools.
Accepts no database/service URL: creates a private-socket database and binds
HTTP only to loopback. Synthetic JWTs use a fresh in-memory signing key; this
does not test GoTrue, hosted email, CDN/WAF or production configuration.
"""
from __future__ import annotations

import argparse
import base64
from concurrent.futures import ThreadPoolExecutor
import hashlib
import hmac
import importlib.util
import json
from pathlib import Path
import re
import secrets
import socket
import subprocess
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("local_database_audit", HERE / "run-local.py")
local = importlib.util.module_from_spec(spec)
spec.loader.exec_module(local)
ONE = "85000000-0000-4000-8000-000000000001"
TWO = "85000000-0000-4000-8000-000000000002"
BOOK = "85000000-0000-4000-8000-000000000003"
STAFF = "85000000-0000-4000-8000-000000000004"


def jwt(user_id: str, secret: bytes) -> str:
    def encode(value):
        return base64.urlsafe_b64encode(json.dumps(value, separators=(",", ":")).encode()).rstrip(b"=")
    payload = encode({"alg": "HS256", "typ": "JWT"}) + b"." + encode({
        "sub": user_id, "role": "authenticated", "aud": "authenticated", "exp": int(time.time()) + 600,
    })
    signature = base64.urlsafe_b64encode(hmac.new(secret, payload, hashlib.sha256).digest()).rstrip(b"=")
    return (payload + b"." + signature).decode()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--postgrest", required=True, type=Path, help="Verified local PostgREST 14.18 executable")
    parser.add_argument("--output", type=Path, help="New/empty evidence directory")
    args = parser.parse_args()
    binary = args.postgrest.resolve()
    if not binary.is_file():
        parser.error("PostgREST executable does not exist")
    output = args.output.resolve() if args.output else Path(tempfile.mkdtemp(prefix="evg-http-budget-"))
    if output.exists() and any(output.iterdir()):
        parser.error("Evidence output must be a new or empty directory")
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    audit = local.LocalAudit(output)
    process = None
    checks = []
    report = {"synthetic_only": True, "hosted_writes": False, "database_tcp_listener": False,
              "http_listener": "127.0.0.1", "checks": checks,
              "auth_boundary": "real PostgREST HS256 JWT validation with a minimal local auth.users/auth.uid shim; no GoTrue",
              "budget_boundary": "authenticated committed write-capable POST/PUT/PATCH/DELETE transactions; not read-only RPCs, anonymous reads, Auth, Storage or DDoS protection"}

    def check(name: str, success: bool, **evidence):
        checks.append({"name": name, "pass": success, **evidence})
        if not success:
            raise RuntimeError("Failed HTTP check: " + name)

    try:
        version = subprocess.check_output([str(binary), "--version"], env=audit.env, text=True, timeout=10).strip()
        if version != "PostgREST 14.18":
            raise RuntimeError("This regression is pinned to PostgREST 14.18")
        report["postgrest_version"] = version
        report["postgrest_binary_sha256"] = hashlib.sha256(binary.read_bytes()).hexdigest()
        audit.start()
        audit.replay()
        check("All migrations and SQL suites pass before HTTP tests", all(s["status"] == "pass" for s in audit.report["suites"]))
        audit.sql(f"""alter role authenticator login;
          grant anon, authenticated to authenticator;
          insert into auth.users(id,email) values ('{ONE}','http-budget-one@example.invalid'),('{TWO}','http-budget-two@example.invalid'),('{STAFF}','http-budget-staff@example.invalid');
          insert into public.staff_members(user_id,role) values ('{STAFF}','librarian');
          insert into public.books(id,title_en,title_vi,language,topic) values ('{BOOK}','HTTP budget fixture','Sách thử nghiệm','bilingual','stories');""", "http-setup")
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            port = probe.getsockname()[1]
        secret = secrets.token_urlsafe(48).encode()
        environment = {**audit.env,
            "PGRST_DB_URI": f"postgresql://authenticator@/postgres?host={quote(str(audit.socket), safe='')}&port=6543",
            "PGRST_DB_SCHEMAS": "public", "PGRST_DB_ANON_ROLE": "anon", "PGRST_DB_CONFIG": "true",
            "PGRST_JWT_SECRET": secret.decode(), "PGRST_JWT_AUD": "authenticated", "PGRST_DB_POOL": "4",
            "PGRST_SERVER_HOST": "127.0.0.1", "PGRST_SERVER_PORT": str(port), "PGRST_LOG_LEVEL": "error",
        }
        # Do not pass DB_PRE_REQUEST: prove that the migration's database-specific
        # authenticator setting is the source actually loaded by PostgREST.
        config = subprocess.check_output([str(binary), "--dump-config"], env=environment, text=True, timeout=15)
        hook = re.search(r'^db-pre-request\s*=\s*"([^"]*)"$', config, re.MULTILINE)
        check("Database-specific pre-request hook is loaded without an environment override",
              bool(hook and hook.group(1) == "api_private.enforce_request_budget"))
        del config  # The full config contains this run's temporary signing key.
        token_one, token_two, token_staff = jwt(ONE, secret), jwt(TWO, secret), jwt(STAFF, secret)
        forged_token = jwt(ONE, secrets.token_bytes(32))
        with (output / "postgrest.log").open("w") as server_log:
            process = subprocess.Popen([str(binary)], env=environment, stdout=server_log, stderr=server_log)
        origin = f"http://127.0.0.1:{port}"

        def http(path: str, method="GET", token=None, body=None, headers=None):
            request_headers = {"Content-Type": "application/json", "Origin": "http://127.0.0.1:4179", **(headers or {})}
            if token:
                request_headers["Authorization"] = "Bearer " + token
            data = None if body is None else json.dumps(body).encode()
            request = Request(origin + path, data=data, method=method, headers=request_headers)
            try:
                response = urlopen(request, timeout=10)
            except HTTPError as error:
                response = error
            with response:
                raw = response.read().decode()
                try:
                    value = json.loads(raw) if raw else None
                except json.JSONDecodeError:
                    value = None
                # CORS middleware can append a second expose-headers field.
                # Browsers combine list-valued headers, so preserve every value.
                response_headers = {key.lower(): ", ".join(response.headers.get_all(key)) for key in response.headers.keys()}
                return response.status, response_headers, value

        deadline = time.monotonic() + 15
        while True:
            if process.poll() is not None:
                raise RuntimeError("Local PostgREST process exited during startup")
            try:
                status, _, body = http(f"/books?select=id&id=eq.{BOOK}")
                if status == 200 and body == [{"id": BOOK}]:
                    break
            except (URLError, TimeoutError):
                pass
            if time.monotonic() >= deadline:
                raise RuntimeError("Local PostgREST did not become ready")
            time.sleep(0.1)
        check("Anonymous catalogue GET is available", True, http_status=status)
        status, _, _ = http("/books?select=id&limit=1", "HEAD")
        check("Anonymous HEAD stays read-only", status == 200, http_status=status)
        status, _, _ = http("/rpc/replace_my_interests", "POST", forged_token, {"p_topics": ["nature"]})
        check("A token signed with another key is rejected", status == 401, http_status=status)

        record = {"user_id": ONE, "book_id": BOOK, "status": "currently_reading", "reflection": "Private synthetic HTTP note."}
        status, _, _ = http("/reading_records", "POST", token_one, record)
        check("A valid signed learner can save a private reading record", status == 201, http_status=status)
        status, _, _ = http("/reading_records", "POST", token_one, {**record, "user_id": TWO})
        check("RLS still rejects a forged row owner", status == 403, http_status=status)
        count = int(audit.sql(f"select request_count from api_private.request_budgets where user_id='{ONE}';", "http-count-after-denied"))
        check("Failed RLS transactions roll back their quota increment", count == 1, committed_requests=count)
        status, _, body = http("/rpc/search_books?select=id", "POST", token_one, {"p_query": "HTTP budget fixture"})
        check("Authenticated POST to STABLE catalogue search runs in a read-only transaction",
              status == 200 and body == [{"id": BOOK}], http_status=status)
        status, _, body = http("/rpc/staff_alert_count", "POST", token_staff, {})
        check("Authenticated POST to STABLE staff alerts remains available", status == 200 and body == 0, http_status=status)
        status, _, body = http("/rpc/staff_dashboard_stats", "POST", token_staff, {"p_weeks": 4})
        check("Authenticated POST to STABLE staff dashboard remains available",
              status == 200 and isinstance(body, dict) and "loan_health" in body, http_status=status)
        counters = json.loads(audit.sql(f"select json_build_array((select request_count from api_private.request_budgets where user_id='{ONE}'),(select count(*) from api_private.request_budgets where user_id='{STAFF}'));", "http-readonly-counters"))
        check("Read-only POST RPCs neither increment nor create write-budget counters", counters == [1, 0], counters=counters)
        status, _, _ = http("/request_budgets", "PATCH", token_one, {"request_count": 1}, {"Content-Profile": "api_private"})
        check("Clients cannot select the private counter schema", status == 406, http_status=status)

        for _ in range(119):
            status, _, _ = http("/rpc/replace_my_interests", "POST", token_one, {"p_topics": ["nature"]})
            if status != 200:
                raise RuntimeError("Eligible request within quota was rejected")
        status, headers, body = http("/rpc/replace_my_interests", "POST", token_one, {"p_topics": ["science"]},
                                     {"X-Forwarded-For": "203.0.113.42", "X-User-Id": TWO})
        lower_headers = {key.lower(): value for key, value in headers.items()}
        retry_after = lower_headers.get("retry-after", "")
        check("Request 121 returns a safe 429 and Retry-After despite spoofed headers",
              status == 429 and body.get("code") == "EVG_RATE_LIMITED" and retry_after.isdigit() and 1 <= int(retry_after) <= 60,
              http_status=status, retry_after=retry_after)
        report["cors_expose_headers"] = lower_headers.get("access-control-expose-headers", "")
        check("Cross-origin browser code can read Retry-After",
              "retry-after" in {value.strip().lower() for value in report["cors_expose_headers"].split(",")})
        check("Rejected requests are not cached", lower_headers.get("cache-control") == "no-store")
        status, _, body = http("/reading_records?select=reflection", token=token_one)
        check("GET works after the write budget is exhausted", status == 200 and body == [{"reflection": record["reflection"]}], http_status=status)
        status, _, body = http("/rpc/search_books?select=id", "POST", token_one, {"p_query": "HTTP budget fixture"})
        check("Read-only POST search still works with an exhausted write budget", status == 200 and body == [{"id": BOOK}], http_status=status)
        status, _, _ = http("/rpc/replace_my_interests", "POST", token_two, {"p_topics": ["stories"]})
        check("Another account has an independent quota", status == 200, http_status=status)
        status, _, body = http("/reading_records?select=reflection", token=token_two)
        check("Another account cannot read the first learner's note", status == 200 and body == [], http_status=status)

        audit.sql(f"update api_private.request_budgets set window_started_at=clock_timestamp()-interval '61 seconds' where user_id='{ONE}';", "http-expire-window")
        status, _, _ = http("/rpc/replace_my_interests", "POST", token_one, {"p_topics": ["science"]})
        count = int(audit.sql(f"select request_count from api_private.request_budgets where user_id='{ONE}';", "http-reset-count"))
        check("An expired window permits a retry and resets to one", status == 200 and count == 1, http_status=status, committed_requests=count)

        audit.sql(f"update api_private.request_budgets set request_count=119,window_started_at=clock_timestamp() where user_id='{ONE}';", "http-race-setup")
        with ThreadPoolExecutor(max_workers=8) as executor:
            statuses = list(executor.map(lambda _: http("/rpc/replace_my_interests", "POST", token_one, {"p_topics": ["science"]})[0], range(8)))
        count = int(audit.sql(f"select request_count from api_private.request_budgets where user_id='{ONE}';", "http-race-count"))
        check("Eight concurrent HTTP requests cannot exceed the final quota slot", statuses.count(200) == 1 and statuses.count(429) == 7 and count == 120,
              statuses=sorted(statuses), committed_requests=count)
        # Classroom RPCs share the same real HTTP/JWT/pre-request boundary.
        # Reset only this disposable cluster's synthetic counters for an
        # independently measurable service workflow.
        audit.sql("delete from api_private.request_budgets;", "http-learning-budget-reset")
        project_id = "87000000-0000-4000-8000-000000000001"
        comment_id = "87000000-0000-4000-8000-000000000002"
        draft = {"p_id": project_id, "p_book_title": "A synthetic classroom book", "p_title": "What I learned",
                 "p_format": "review", "p_summary": "A useful summary", "p_takeaways": "Ask thoughtful questions",
                 "p_recommendation": "For curious readers", "p_question": "What would you try?", "p_expected_updated_at": None}
        status, _, body = http("/rpc/list_published_learning_projects", "POST", body={})
        check("Anonymous read-only classroom RPC is available", status == 200 and body == [], http_status=status)
        status, _, item = http("/rpc/save_learning_project", "POST", token_one, draft)
        check("A signed learner creates a durable private classroom project", status == 200 and item.get("status") == "draft", http_status=status)
        status, _, body = http("/rpc/list_my_learning_projects", "POST", token_two, {})
        check("Another account cannot list a private project", status == 200 and body == [], http_status=status)
        status, _, body = http("/rpc/staff_list_learning_projects", "POST", token_staff, {})
        check("Staff cannot list an unsubmitted private draft", status == 200 and body == [], http_status=status)
        status, _, _ = http("/rpc/staff_list_learning_projects", "POST", token_two, {})
        check("A learner cannot access classroom moderation", status == 403, http_status=status)
        status, _, _ = http("/projects", "PATCH", token_one, {"status": "published"}, {"Content-Profile": "learning_private"})
        check("Raw classroom tables cannot bypass checked RPC transitions", status == 406, http_status=status)
        counters = json.loads(audit.sql(f"select json_build_array((select request_count from api_private.request_budgets where user_id='{ONE}'),(select count(*) from api_private.request_budgets where user_id in ('{TWO}','{STAFF}')));", "http-learning-read-counters"))
        check("Classroom stable reads do not consume write budgets", counters == [1, 0], counters=counters)
        status, _, submitted = http("/rpc/submit_learning_project", "POST", token_one, {"p_id": project_id, "p_expected_updated_at": item["updated_at"]})
        check("Learner explicitly submits work for review", status == 200 and submitted.get("status") == "submitted", http_status=status)
        status, _, body = http("/rpc/staff_list_learning_projects", "POST", token_staff, {"p_user_id": ONE})
        check("Staff can identify the submitted learner through a restricted projection",
              status == 200 and len(body) == 1 and body[0].get("owner_user_id") == ONE and "display_name" in body[0], http_status=status)
        status, _, published = http("/rpc/staff_review_learning_project", "POST", token_staff,
                                    {"p_id": project_id, "p_action": "publish", "p_review_note": "Private moderation note", "p_expected_updated_at": submitted["updated_at"]})
        check("Verified staff can publish a submitted classroom project", status == 200 and published.get("status") == "published", http_status=status)
        status, _, body = http("/rpc/list_published_learning_projects", "POST", body={})
        check("Public classroom projection omits learner identity and moderation notes",
              status == 200 and len(body) == 1 and set(body[0]) == {"id", "book_title", "title", "format", "summary", "takeaways", "recommendation", "question", "published_at"}, http_status=status)
        status, _, _ = http("/rpc/save_learning_project", "POST", token_one, {**draft, "p_title": "Unsafe overwrite", "p_expected_updated_at": item["updated_at"]})
        check("A stale classroom write produces HTTP 409", status == 409, http_status=status)
        for _ in range(2):
            status, _, body = http("/rpc/set_learning_project_encouragement", "POST", token_two, {"p_project_id": project_id, "p_enabled": True})
        check("Repeated encouragement remains unique through HTTP", status == 200 and body == {"encouraged": True, "encouragement_count": 1}, http_status=status)
        status, _, comment = http("/rpc/submit_learning_comment", "POST", token_two, {"p_id": comment_id, "p_project_id": project_id, "p_body": "A thoughtful lesson."})
        check("Reader comments enter moderation before publication", status == 200 and comment.get("status") == "pending", http_status=status)
        status, _, body = http("/rpc/get_learning_project_feedback", "POST", body={"p_project_id": project_id})
        check("Unreviewed comments are absent from anonymous feedback", status == 200 and body == {"encouragement_count": 1, "comments": []}, http_status=status)
        status, _, comment = http("/rpc/staff_review_learning_comment", "POST", token_staff,
                                  {"p_id": comment_id, "p_action": "approve", "p_review_note": "Private comment note", "p_expected_updated_at": comment["updated_at"]})
        check("Staff can approve a queued supportive comment", status == 200 and comment.get("status") == "approved", http_status=status)
        status, _, body = http("/rpc/get_learning_project_feedback", "POST", body={"p_project_id": project_id})
        check("Public comment projection contains no author or reviewer information", status == 200 and len(body["comments"]) == 1 and set(body["comments"][0]) == {"id", "body", "created_at"}, http_status=status)
        status, _, item = http("/rpc/withdraw_learning_project", "POST", token_one, {"p_id": project_id, "p_expected_updated_at": published["updated_at"]})
        check("Author withdrawal immediately returns published work to a private draft", status == 200 and item.get("status") == "draft", http_status=status)
        status, _, body = http("/rpc/get_learning_project_feedback", "POST", body={"p_project_id": project_id})
        check("Withdrawing a project hides its comments and encouragements", status == 200 and body == {"encouragement_count": 0, "comments": []}, http_status=status)
        status, _, body = http("/rpc/list_my_learning_feedback", "POST", token_two, {"p_project_id": project_id})
        check("Old public comments require a fresh review after withdrawal", status == 200 and body["comments"][0]["status"] == "pending" and body["encouraged"] is False, http_status=status)
        status, _, body = http("/rpc/list_my_learning_feedback", "POST", token_two, {"p_project_id": None})
        check("Authors can find their own comments after the parent project becomes private",
              status == 200 and len(body["comments"]) == 1 and body["comments"][0]["project_id"] == project_id
              and body["comments"][0]["is_published"] is False
              and set(body["comments"][0]) == {"id", "project_id", "body", "status", "review_note", "created_at", "updated_at", "is_published"}, http_status=status)
        status, _, _ = http("/rpc/withdraw_learning_comment", "POST", token_two, {"p_id": comment_id})
        removed_status, _, body = http("/rpc/list_my_learning_feedback", "POST", token_two, {})
        check("An author can remove their comment from a withdrawn project", status in (200, 204) and removed_status == 200 and body["comments"] == [], http_status=status)
        audit.sql(f"update api_private.request_budgets set request_count=120,window_started_at=clock_timestamp() where user_id='{ONE}';", "http-learning-exhaust")
        status, headers, body = http("/rpc/save_learning_project", "POST", token_one, {**draft, "p_title": "Over quota", "p_expected_updated_at": item["updated_at"]})
        check("Classroom mutations cannot bypass the shared authenticated request budget",
              status == 429 and body.get("code") == "EVG_RATE_LIMITED" and headers.get("retry-after", "").isdigit(), http_status=status)
        status, _, body = http("/rpc/list_my_learning_projects", "POST", token_one, {})
        check("Learner can still read their notebook after exhausting writes", status == 200 and len(body) == 1 and body[0]["title"] == draft["p_title"], http_status=status)
        removal_book = "88000000-0000-4000-8000-000000000001"
        snapshot = {"title_en": "HTTP removal fixture", "title_vi": "Sách thử nghiệm", "author": "", "language": "bilingual", "topic": "stories",
                    "description_en": "", "description_vi": "", "cover_url": "", "total_copies": 1}
        audit.sql(f"""insert into public.books(id,title_en,title_vi,language,topic) values('{removal_book}','HTTP removal fixture','Sách thử nghiệm','bilingual','stories');
          insert into public.book_copies(book_id) values('{removal_book}');""", "http-confirmed-removal-setup")
        status, _, body = http("/rpc/remove_unused_catalogue_book", "POST", token_staff, {"p_book_id": removal_book, "p_expected": None})
        check("Catalogue removal rejects a missing confirmation snapshot", status == 400 and body.get("code") == "22023", http_status=status)
        audit.sql(f"update public.books set title_en='Changed after confirmation' where id='{removal_book}';", "http-confirmed-removal-edit")
        status, _, body = http("/rpc/remove_unused_catalogue_book", "POST", token_staff, {"p_book_id": removal_book, "p_expected": snapshot})
        check("Stale catalogue metadata returns HTTP 409 instead of deleting the book", status == 409 and body.get("code") == "PT409", http_status=status)
        snapshot["title_en"] = "Changed after confirmation"
        audit.sql(f"insert into public.book_copies(book_id) values('{removal_book}');", "http-confirmed-removal-count")
        status, _, body = http("/rpc/remove_unused_catalogue_book", "POST", token_staff, {"p_book_id": removal_book, "p_expected": snapshot})
        check("Stale catalogue inventory returns HTTP 409 instead of deleting copies", status == 409 and body.get("code") == "PT409", http_status=status)
        snapshot["total_copies"] = 2
        status, _, body = http("/rpc/remove_unused_catalogue_book", "POST", token_staff, {"p_book_id": removal_book, "p_expected": snapshot})
        check("Freshly confirmed unused catalogue entry can be removed", status == 200 and body is True, http_status=status)
        status, _, body = http("/rpc/remove_unused_catalogue_book", "POST", token_staff, {"p_book_id": removal_book, "p_expected": snapshot})
        check("Repeating a completed catalogue removal safely reports absent", status == 200 and body is False, http_status=status)
        report["pass"] = True
    except Exception as error:
        report["pass"] = False
        report["error"] = str(error)
    finally:
        if process is not None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)
        report["http_process_stopped"] = process is None or process.poll() is not None
        try:
            audit.close()
        except Exception as error:
            report["cleanup_error"] = str(error)
            report["pass"] = False
        report["database_cluster_removed"] = audit.report.get("cluster_removed", False)
        (output / "results.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"pass": report["pass"], "checks_passed": sum(item["pass"] for item in checks),
                      "http_process_stopped": report["http_process_stopped"],
                      "database_cluster_removed": report["database_cluster_removed"], "evidence": str(output)}, indent=2))
    return 0 if report["pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
