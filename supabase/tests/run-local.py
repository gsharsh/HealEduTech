#!/usr/bin/env python3
"""Replay the backend and concurrent regressions in a new local-only database.

Requires Python 3.10+, PostgreSQL initdb/pg_ctl/psql on PATH and a POSIX host.
Accepts no database URL or existing connection. Every run creates and destroys
its own private-socket cluster. The Auth shim is not a Supabase integration.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import tempfile
import time


ROOT = Path(__file__).resolve().parents[2]
USER = {
    "admin": "60000000-0000-4000-8000-000000000001",
    "staff": "60000000-0000-4000-8000-000000000002",
    "one": "60000000-0000-4000-8000-000000000003",
    "two": "60000000-0000-4000-8000-000000000004",
}
BOOK = "61000000-0000-4000-8000-000000000001"
COPIES = ["62000000-0000-4000-8000-000000000001", "62000000-0000-4000-8000-000000000002"]
BOOTSTRAP = """create role anon nologin;
create role authenticated nologin;
create role authenticator nologin;
create schema auth;
create schema extensions;
create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, created_at timestamptz default now(),
  raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$
select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
  nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid;
$$;
grant usage on schema auth, public to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
"""


def auth(name: str) -> str:
    claims = json.dumps({"sub": USER[name], "role": "authenticated"})
    return f"set local role authenticated; select set_config('request.jwt.claims','{claims}',true);"


def checkout(request: str, borrower: str, copy: int) -> str:
    return f"select (public.checkout_circulation_copy('{request}','{USER[borrower]}','{COPIES[copy]}',current_date+7)).id;"


class LocalAudit:
    def __init__(self, output: Path):
        self.output = output
        # Ignore inherited connection/service options, including PGHOSTADDR.
        self.env = {key: value for key, value in os.environ.items() if not key.startswith("PG")}
        self.cluster = Path(tempfile.mkdtemp(prefix="evg-local-sql-"))
        self.data = self.cluster / "data"
        self.socket = self.cluster / "socket"
        self.socket.mkdir(mode=0o700)
        self.base = ["psql", "-X", "-h", str(self.socket), "-p", "6543", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose", "-At"]
        self.started = False
        self.report = {
            "runtime": subprocess.check_output(["psql", "--version"], env=self.env, text=True).strip(),
            "cluster": str(self.cluster), "tcp_listener": False,
            "auth_runtime": "minimal auth.users/auth.uid shim; no GoTrue, PostgREST or signed JWT verification",
            "hosted_writes": False, "migrations": [], "suites": [], "concurrency": [],
            "migration_guards": [],
        }

    def run(self, args: list[str], label: str, code: str | None = None, check: bool = True):
        result = subprocess.run(args, input=code, cwd=ROOT, env=self.env, text=True, capture_output=True, timeout=60)
        (self.output / f"{label}.log").write_text(result.stdout + result.stderr)
        if check and result.returncode:
            raise RuntimeError(f"{label}: {result.stderr[-2000:]}")
        return result

    def sql(self, code: str, label: str) -> str:
        return self.run(self.base, label, code).stdout.strip()

    def start(self):
        self.run(["initdb", "-D", str(self.data), "--auth=trust", "--encoding=UTF8", "--no-locale"], "initdb")
        # PostgreSQL's -o option uses shell-style parsing internally.
        options = f"-k {shlex.quote(str(self.socket))} -p 6543 -c listen_addresses=''"
        self.run(["pg_ctl", "-D", str(self.data), "-l", str(self.output / "postgres.log"), "-o", options, "-w", "start"], "startup")
        self.started = True
        self.sql(BOOTSTRAP, "bootstrap")

    def replay(self):
        sources = [*sorted((ROOT / "supabase/migrations").glob("*.sql")), *sorted((ROOT / "supabase/tests").glob("*.sql"))]
        self.report["source_sha256"] = {str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest() for path in sources}
        for migration in sorted((ROOT / "supabase/migrations").glob("*.sql")):
            self.run(self.base + ["-f", str(migration)], "migration-" + migration.stem)
            self.report["migrations"].append({"file": migration.name, "status": "pass"})
        for suite in sorted((ROOT / "supabase/tests").glob("*.sql")):
            result = self.run(self.base + ["-f", str(suite)], "suite-" + suite.stem, check=False)
            self.report["suites"].append({"file": suite.name, "status": "pass" if result.returncode == 0 else "fail", "error": result.stderr[-2000:] or None})
        state = self.sql("""select json_build_object(
          'auth_users',(select count(*) from auth.users),
          'circulation_enabled',(select enabled from public.circulation_policy),
          'books',(select count(*) from public.books),'copies',(select count(*) from public.book_copies),
          'loans',(select count(*) from public.loans),'reading_records',(select count(*) from public.reading_records),
          'interests',(select count(*) from public.learner_interests),
          'learning_projects',(select count(*) from learning_private.projects),
          'learning_comments',(select count(*) from learning_private.comments),
          'learning_encouragements',(select count(*) from learning_private.encouragements));""", "post-suite-state")
        self.report["post_suite_state"] = json.loads(state)
        private_empty = all(self.report["post_suite_state"][key] == 0 for key in ["auth_users", "loans", "reading_records", "interests", "learning_projects", "learning_comments", "learning_encouragements"])
        if not private_empty or self.report["post_suite_state"]["circulation_enabled"]:
            raise RuntimeError("SQL suites must roll back private fixture data and leave lending disabled")

    def check_migration_guards(self):
        # Replaying the candidate against an unrelated existing hook must stop
        # before changing it. All settings belong to this disposable database.
        migration = ROOT / "supabase/migrations/20261106175337_enforce_authenticated_request_budget.sql"
        self.sql("alter role authenticator in database postgres set pgrst.db_pre_request='operator_private.existing_hook';", "request-budget-conflict-setup")
        result = self.run(self.base + ["-f", str(migration)], "request-budget-conflict", check=False)
        setting = self.sql("""select setting from pg_db_role_setting s cross join lateral unnest(s.setconfig) setting
          where s.setrole=(select oid from pg_roles where rolname='authenticator')
          and s.setdatabase=(select oid from pg_database where datname=current_database())
          and setting like 'pgrst.db_pre_request=%';""", "request-budget-conflict-final")
        passed = result.returncode != 0 and "existing PostgREST pre-request hook" in result.stderr and setting == "pgrst.db_pre_request=operator_private.existing_hook"
        self.report["migration_guards"].append({"name": "preserve conflicting pre-request hook", "pass": passed})
        self.sql("alter role authenticator in database postgres set pgrst.db_pre_request='api_private.enforce_request_budget';", "request-budget-conflict-restore")
        if not passed:
            raise RuntimeError("Request-budget migration failed to preserve an existing operator hook")

    def pair(self, name: str, user: str, first: str, second: str, user2: str | None = None):
        marker = self.cluster / f"{name}.ready"
        # The marker is reached only after the first RPC succeeds while its
        # transaction is uncommitted; the second client then hits that lock.
        code = f"begin;set local statement_timeout='15s';{auth(user)}{first}\n\\! touch {shlex.quote(str(marker))}\nselect pg_sleep(1);commit;\n"
        process = subprocess.Popen(self.base, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=self.env, cwd=ROOT)
        try:
            process.stdin.write(code)
            process.stdin.close()
            process.stdin = None
            deadline = time.monotonic() + 8
            while not marker.exists() and process.poll() is None and time.monotonic() < deadline:
                time.sleep(0.01)
            if not marker.exists():
                raise RuntimeError(f"{name}: first transaction did not reach the barrier")
            later = self.run(self.base, name + "-second", f"begin;set local statement_timeout='15s';{auth(user2 or user)}{second}commit;", check=False)
            stdout, stderr = process.communicate(timeout=20)
            (self.output / f"{name}-first.log").write_text(stdout + stderr)
            sqlstate = re.search(r"ERROR:\s+([0-9A-Z]{5}):", later.stderr)
            return {"first_exit": process.returncode, "second_exit": later.returncode, "second_sqlstate": sqlstate.group(1) if sqlstate else None, "second_error": later.stderr[-2000:] or None}
        finally:
            if process.poll() is None:
                process.terminate()
                process.wait(timeout=5)

    def reset_loans(self):
        self.sql("delete from public.loan_contacts;delete from public.circulation_events;delete from public.loans;update public.book_copies set condition='usable';", "reset-probe-state")

    def concurrent(self):
        # All fixtures live only in the cluster created by this script. Never
        # use these cleanup statements against an existing/shared database.
        self.sql(f"""insert into auth.users(id,email,email_confirmed_at) values
          ('{USER['admin']}','audit-admin@example.invalid',now()),
          ('{USER['staff']}','audit-staff@example.invalid',now()),
          ('{USER['one']}','audit-one@example.invalid',now()),
          ('{USER['two']}','audit-two@example.invalid',now());
          insert into public.staff_members(user_id,role) values ('{USER['admin']}','administrator'),('{USER['staff']}','librarian');
          insert into public.books(id,title_en,title_vi,language,topic) values ('{BOOK}','Concurrency test','Sách thử nghiệm','bilingual','stories');
          insert into public.book_copies(id,book_id,inventory_code) values ('{COPIES[0]}','{BOOK}','EVG-AUDIT-001'),('{COPIES[1]}','{BOOK}','EVG-AUDIT-002');
          begin;{auth('admin')}select public.configure_circulation(true,1,'Asia/Ho_Chi_Minh');commit;
          begin;{auth('staff')}select public.register_circulation_borrower('{USER['one']}','Synthetic One');
          select public.register_circulation_borrower('{USER['two']}','Synthetic Two');commit;""", "concurrency-setup")
        checks = self.report["concurrency"]
        result = self.pair("interests-replacement", "one", "select public.replace_my_interests(array['nature']);", "select public.replace_my_interests(array['stories']);")
        topics = json.loads(self.sql(f"select json_agg(topic order by topic) from public.learner_interests where user_id='{USER['one']}';", "interests-final"))
        checks.append({"name": "concurrent interest replacement", "clients": result, "final_topics": topics, "pass": result['first_exit'] == 0 and result['second_exit'] == 0 and topics == ['stories']})
        self.reset_loans()
        result = self.pair("copy-single-active", "staff", checkout('63000000-0000-4000-8000-000000000001', 'one', 0), checkout('63000000-0000-4000-8000-000000000002', 'two', 0))
        count = int(self.sql(f"select count(*) from public.loans where copy_id='{COPIES[0]}' and resolved_at is null;", "copy-final"))
        checks.append({"name": "one active loan per copy", "clients": result, "active_loans": count, "pass": result['first_exit'] == 0 and result['second_exit'] != 0 and result['second_sqlstate'] == '23505' and count == 1})
        self.reset_loans()
        result = self.pair("borrower-limit", "staff", checkout('63000000-0000-4000-8000-000000000003', 'one', 0), checkout('63000000-0000-4000-8000-000000000004', 'one', 1))
        count = int(self.sql(f"select count(*) from public.loans where borrower_user_id='{USER['one']}' and resolved_at is null;", "borrower-final"))
        checks.append({"name": "concurrent borrower limit", "clients": result, "active_loans": count, "pass": result['first_exit'] == 0 and result['second_exit'] != 0 and result['second_sqlstate'] == '55000' and count == 1})
        self.reset_loans()
        same = checkout('63000000-0000-4000-8000-000000000005', 'one', 0)
        result = self.pair("checkout-retry", "staff", same, same)
        count = int(self.sql("select count(*) from public.loans;", "retry-final"))
        checks.append({"name": "concurrent same-request checkout", "clients": result, "loan_rows": count, "pass": result['first_exit'] == 0 and result['second_exit'] == 0 and count == 1})
        self.reset_loans()
        old = '64000000-0000-4000-8000-000000000001'
        self.sql(f"""insert into public.loans(id,request_id,borrower_user_id,copy_id,due_date,checked_out_by,resolved_at,resolution,return_condition,resolved_by)
          values ('{old}','63000000-0000-4000-8000-000000000006','{USER['one']}','{COPIES[0]}',current_date+7,'{USER['staff']}',now(),'returned','usable','{USER['staff']}');""", "correction-setup")
        result = self.pair("correction-vs-checkout", "staff", checkout('63000000-0000-4000-8000-000000000007', 'two', 0), f"select (public.correct_circulation_resolution('63000000-0000-4000-8000-000000000008','{old}','lost',null)).id;")
        final = json.loads(self.sql(f"""select json_build_object(
          'copy_condition',(select condition from public.book_copies where id='{COPIES[0]}'),
          'active_loans',(select count(*) from public.loans where copy_id='{COPIES[0]}' and resolved_at is null),
          'old_resolution',(select resolution from public.loans where id='{old}'));""", "correction-final"))
        checks.append({"name": "old resolution correction vs new checkout", "clients": result, "final": final, "pass": result['first_exit'] == 0 and result['second_exit'] != 0 and result['second_sqlstate'] == '55000' and final == {'copy_condition': 'usable', 'active_loans': 1, 'old_resolution': 'returned'}})
        contact_loan = '64000000-0000-4000-8000-000000000002'
        contact = f"select public.staff_record_loan_contact('63000000-0000-4000-8000-000000000010','{contact_loan}');"
        returned = f"select (public.resolve_circulation_loan('63000000-0000-4000-8000-000000000011','{contact_loan}','returned','usable')).id;"
        for name, first, second in [
            ("contact-retry", contact, contact),
            ("return-vs-contact", returned, contact),
            ("contact-vs-return", contact, returned),
        ]:
            self.reset_loans()
            self.sql(f"""insert into public.loans(id,request_id,borrower_user_id,copy_id,due_date,checked_out_by)
              values ('{contact_loan}','63000000-0000-4000-8000-000000000009','{USER['one']}','{COPIES[0]}',
              (now() at time zone 'Asia/Ho_Chi_Minh')::date-7,'{USER['staff']}');""", name + "-setup")
            result = self.pair(name, "staff", first, second)
            state = json.loads(self.sql(f"""select json_build_object(
              'contacts',(select count(*) from public.loan_contacts),
              'resolved',(select resolved_at is not null from public.loans where id='{contact_loan}'));""", name + "-final"))
            expected = {"contacts": 0 if name == "return-vs-contact" else 1, "resolved": name != "contact-retry"}
            second_ok = result['second_exit'] != 0 and result['second_sqlstate'] == '55000' if name == "return-vs-contact" else result['second_exit'] == 0
            checks.append({"name": name, "clients": result, "final": state, "pass": result['first_exit'] == 0 and second_ok and state == expected})
        self.sql("update public.circulation_policy set enabled=false;", "disable-circulation")
        # PostgreSQL pre-request quota is shared across requests/processes.
        # Simulate trusted PostgREST metadata; API/JWT mapping is separate QA.
        budget_request = "select set_config('request.method','POST',true); select api_private.enforce_request_budget();"
        self.sql(f"""insert into api_private.request_budgets(user_id,window_started_at,request_count)
          values ('{USER['one']}',clock_timestamp(),119);""", "budget-boundary-setup")
        result = self.pair("budget-last-slot", "one", budget_request, budget_request)
        count = int(self.sql(f"select request_count from api_private.request_budgets where user_id='{USER['one']}';", "budget-boundary-final"))
        checks.append({"name": "concurrent request-budget last slot", "clients": result, "count": count,
                       "pass": result['first_exit'] == 0 and result['second_exit'] != 0 and result['second_sqlstate'] == 'PGRST' and count == 120})
        self.sql(f"update api_private.request_budgets set request_count=119,window_started_at=clock_timestamp() where user_id='{USER['one']}';", "budget-isolation-setup")
        result = self.pair("budget-independent-users", "one", budget_request, budget_request, user2="two")
        counts = json.loads(self.sql(f"select json_build_array((select request_count from api_private.request_budgets where user_id='{USER['one']}'),(select request_count from api_private.request_budgets where user_id='{USER['two']}'));", "budget-isolation-final"))
        checks.append({"name": "concurrent request-budget account isolation", "clients": result, "counts": counts,
                       "pass": result['first_exit'] == 0 and result['second_exit'] == 0 and counts == [120, 1]})

    def concurrent_learning(self):
        checks = self.report["concurrency"]
        project = '65000000-0000-4000-8000-000000000001'
        def save(identity: str, title: str, version: str | None = None):
            expected = "null" if version is None else "'" + version + "'::timestamptz"
            return f"select public.save_learning_project('{identity}','Synthetic book','{title}','review','Summary','Lesson','Recommended','Question',{expected});"
        self.sql(f"begin;{auth('one')}{save(project, 'Original')}commit;", "learning-concurrency-setup")
        version = self.sql(f"select updated_at from learning_private.projects where id='{project}';", "learning-edit-version")
        result = self.pair("learning-stale-edit", "one", save(project, "Winner", version), save(project, "Lost edit", version))
        title = self.sql(f"select title from learning_private.projects where id='{project}';", "learning-edit-final")
        checks.append({"name": "concurrent learning edits reject stale writer", "clients": result, "title": title,
                       "pass": result['first_exit'] == 0 and result['second_sqlstate'] == 'PT409' and title == 'Winner'})
        self.sql(f"begin;{auth('one')}select public.submit_learning_project('{project}',(select updated_at from public.list_my_learning_projects() where id='{project}'));commit;", "learning-submit-setup")
        version = self.sql(f"select updated_at from learning_private.projects where id='{project}';", "learning-submit-version")
        result = self.pair("learning-withdraw-vs-publish", "one", f"select public.withdraw_learning_project('{project}','{version}');",
                           f"select public.staff_review_learning_project('{project}','publish','','{version}');", user2="staff")
        status = self.sql(f"select status from learning_private.projects where id='{project}';", "learning-withdraw-final")
        checks.append({"name": "withdrawal wins over stale staff publication", "clients": result, "status": status,
                       "pass": result['first_exit'] == 0 and result['second_sqlstate'] == '42501' and status == 'draft'})
        self.sql(f"""insert into learning_private.projects(id,owner_id,book_title,title,format)
          select md5('learning-cap-'||i)::uuid,'{USER['two']}','Book','Draft '||i,'review' from generate_series(1,24) i;""", "learning-cap-setup")
        result = self.pair("learning-final-notebook-slot", "two", save('65000000-0000-4000-8000-000000000002', 'Slot winner'), save('65000000-0000-4000-8000-000000000003', 'Slot loser'))
        count = int(self.sql(f"select count(*) from learning_private.projects where owner_id='{USER['two']}';", "learning-cap-final"))
        checks.append({"name": "concurrent notebook creation respects 25 project cap", "clients": result, "count": count,
                       "pass": result['first_exit'] == 0 and result['second_sqlstate'] == '54000' and count == 25})
        self.sql(f"""update learning_private.projects set status='published',published_at=clock_timestamp() where id='{project}';
          insert into learning_private.comments(id,project_id,owner_id,body)
          select md5('learning-comment-cap-'||i)::uuid,'{project}','{USER['two']}','Comment '||i from generate_series(1,4) i;""", "learning-comment-cap-setup")
        result = self.pair("learning-final-comment-slot", "two", f"select public.submit_learning_comment('66000000-0000-4000-8000-000000000001','{project}','Winner');",
                           f"select public.submit_learning_comment('66000000-0000-4000-8000-000000000002','{project}','Loser');")
        count = int(self.sql(f"select count(*) from learning_private.comments where project_id='{project}';", "learning-comment-cap-final"))
        checks.append({"name": "concurrent comments respect author per-project cap", "clients": result, "count": count,
                       "pass": result['first_exit'] == 0 and result['second_sqlstate'] == '54000' and count == 5})
        version = self.sql(f"select updated_at from learning_private.projects where id='{project}';", "learning-comment-withdraw-version")
        comment_version = self.sql("select updated_at from learning_private.comments where id='66000000-0000-4000-8000-000000000001';", "learning-comment-review-version")
        result = self.pair("learning-withdraw-vs-comment-review", "one", f"select public.withdraw_learning_project('{project}','{version}');",
                           f"select public.staff_review_learning_comment('66000000-0000-4000-8000-000000000001','approve','','{comment_version}');", user2="staff")
        public = json.loads(self.sql(f"select public.get_learning_project_feedback('{project}');", "learning-feedback-final"))
        checks.append({"name": "withdrawal prevents concurrent comment publication", "clients": result, "feedback": public,
                       "pass": result['first_exit'] == 0 and result['second_sqlstate'] == '42501' and public == {'encouragement_count': 0, 'comments': []}})

    def close(self):
        # Check actual cluster state even if startup raised after launching it.
        status = subprocess.run(["pg_ctl", "-D", str(self.data), "status"], env=self.env, capture_output=True, text=True, timeout=10)
        if status.returncode == 0:
            self.run(["pg_ctl", "-D", str(self.data), "-w", "stop"], "shutdown")
        status = subprocess.run(["pg_ctl", "-D", str(self.data), "status"], env=self.env, capture_output=True, text=True, timeout=10)
        if status.returncode == 0:
            raise RuntimeError("Disposable cluster still running; directory preserved")
        self.started = False
        self.report["cluster_stopped"] = True
        shutil.rmtree(self.cluster)
        self.report["cluster_removed"] = not self.cluster.exists()

    def concurrent_catalogue(self):
        self.reset_loans()
        book = '67000000-0000-4000-8000-000000000001'
        copy = '67000000-0000-4000-8000-000000000002'
        self.sql(f"""begin;{auth('admin')}select public.configure_circulation(true,1,'Asia/Ho_Chi_Minh');commit;
          insert into public.books(id,title_en,title_vi,language,topic) values ('{book}','Removal concurrency','Sách thử nghiệm','bilingual','stories');
          insert into public.book_copies(id,book_id,inventory_code) values ('{copy}','{book}','REMOVE-CONCURRENT');""", "catalogue-removal-setup")
        checkout_sql = f"select public.checkout_circulation_copy('67000000-0000-4000-8000-000000000003','{USER['one']}','{copy}',current_date+7);"
        snapshot = {"title_en": "Removal concurrency", "title_vi": "Sách thử nghiệm", "author": "", "language": "bilingual", "topic": "stories",
                    "description_en": "", "description_vi": "", "cover_url": "", "total_copies": 1}
        expected = json.dumps(snapshot).replace("'", "''")
        remove_sql = f"select public.remove_unused_catalogue_book('{book}','{expected}'::jsonb);"
        result = self.pair("checkout-vs-remove-book", "staff", checkout_sql, remove_sql)
        state = json.loads(self.sql(f"select json_build_array((select count(*) from public.books where id='{book}'),(select count(*) from public.loans where copy_id='{copy}'));", "checkout-vs-remove-final"))
        self.report['concurrency'].append({"name": "concurrent checkout prevents catalogue removal", "clients": result, "book_and_loans": state,
            "pass": result['first_exit'] == 0 and result['second_sqlstate'] == 'P0001' and 'EVG_BOOK_HAS_HISTORY' in (result['second_error'] or '') and state == [1,1]})
        self.reset_loans()
        edit_sql = f"select public.set_book_copy_count('{book}','Changed concurrently','Sách thử nghiệm','','bilingual','stories','','',1);"
        result = self.pair("edit-book-vs-stale-remove", "staff", edit_sql, remove_sql)
        title = self.sql(f"select title_en from public.books where id='{book}';", "edit-vs-remove-final")
        self.report['concurrency'].append({"name": "concurrent catalogue edit invalidates deletion confirmation", "clients": result, "title": title,
            "pass": result['first_exit'] == 0 and result['second_sqlstate'] == 'PT409' and title == 'Changed concurrently'})
        snapshot['title_en'] = 'Changed concurrently'
        expected = json.dumps(snapshot).replace("'", "''")
        remove_sql = f"select public.remove_unused_catalogue_book('{book}','{expected}'::jsonb);"
        result = self.pair("remove-book-vs-checkout", "staff", remove_sql, checkout_sql)
        state = json.loads(self.sql(f"select json_build_array((select count(*) from public.books where id='{book}'),(select count(*) from public.loans where copy_id='{copy}'));", "remove-vs-checkout-final"))
        self.report['concurrency'].append({"name": "catalogue removal prevents concurrent checkout of deleted copy", "clients": result, "book_and_loans": state,
            "pass": result['first_exit'] == 0 and result['second_sqlstate'] == '23503' and state == [0,0]})
        self.sql("update public.circulation_policy set enabled=false;", "catalogue-removal-disable-circulation")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, help="New/empty directory for retained synthetic logs and JSON; defaults to a new temp directory")
    args = parser.parse_args()
    for tool in ["initdb", "pg_ctl", "psql", "touch"]:
        if not shutil.which(tool):
            parser.error(f"Required local executable is missing: {tool}")
    output = args.output.resolve() if args.output else Path(tempfile.mkdtemp(prefix="healedutech-sql-evidence-"))
    if output.exists() and any(output.iterdir()):
        parser.error("Evidence output must be a new or empty directory")
    output.mkdir(parents=True, exist_ok=True)
    audit = LocalAudit(output)
    try:
        audit.start()
        audit.replay()
        audit.check_migration_guards()
        audit.concurrent()
        audit.concurrent_learning()
        audit.concurrent_catalogue()
    except Exception as error:
        audit.report["error"] = str(error)
    finally:
        try:
            audit.close()
        except Exception as error:
            audit.report["cleanup_error"] = str(error)
        (output / "results.json").write_text(json.dumps(audit.report, indent=2))
    success = not audit.report.get("error") and not audit.report.get("cleanup_error") and all(s['status'] == 'pass' for s in audit.report['suites']) and len(audit.report['concurrency']) == 18 and all(c['pass'] for c in audit.report['concurrency'])
    print(json.dumps({"pass": success, "migrations": len(audit.report['migrations']), "sql_suites_passed": sum(s['status'] == 'pass' for s in audit.report['suites']), "concurrency_passed": sum(c['pass'] for c in audit.report['concurrency']), "cluster_removed": audit.report.get('cluster_removed', False), "evidence": str(output)}, indent=2))
    return 0 if success else 1


if __name__ == "__main__":
    raise SystemExit(main())
