# Free-first architecture and request protection

Decision record · 7 November 2026 · Branch candidate, not a hosting migration

## Recommended direction

Keep React, TypeScript, Vite, and Supabase PostgreSQL/Auth for the current library. They are a credible stack for this workload. Reliability comes from clear data ownership, database constraints, authorization, bounded requests, tested recovery, and operating limits. Adding a second database, an always-on server, or microservices before there is a need would add failure modes and maintenance cost.

For a future commercial version that must start at $0, evaluate **Cloudflare Pages (or Workers Static Assets) + a small TypeScript Worker API + Supabase PostgreSQL/Auth**. Keep the existing frontend and SQL rather than rebuilding them. Introduce the server API when there is a concrete need for protected vendor calls, shared public caching, or enforcement before database access. A lightweight router such as Hono is optional; the service boundary matters more than the router.

This sprint does not move hosting, provision paid services, or introduce AI calls. The existing Vercel deployment is unchanged. Vercel's current Hobby documentation limits that plan to personal, non-commercial use, so a commercial client deployment needs a hosting-plan decision. [Vercel Hobby](https://vercel.com/docs/plans/hobby)

| Layer | Current candidate | Next addition, only when needed |
| --- | --- | --- |
| UI | React 19 + TypeScript + Vite; shared bilingual design tokens and accessible HTML | Keep it; use a query library if private caching grows beyond the present small feature set |
| Durable data | Supabase PostgreSQL, reviewed SQL migrations, constraints and transactional RPCs | Keep PostgreSQL as the source of truth; add indexes from actual slow queries |
| Identity | Supabase Auth; tab-scoped sessions; server-enforced roles and row ownership | Review email delivery, abuse controls and account lifecycle before learner enrolment |
| Public delivery | Existing Vercel static build and diagnostic function | Evaluate Cloudflare static hosting for a commercial free-first pilot; port headers, rewrites, 404 and diagnostics together |
| Protected integrations | None; no Groq/DeepSeek keys or calls | Small server-only API with verified JWTs, per-user quota, project budget, request deadline and validated output |
| QA | Node tests, Playwright desktop/phone journeys, axe, local SQL/concurrency tests, backup drill | Real-device, learner/staff acceptance and production observation |
| Operations | Git branches/CI, release manifest, privacy-preserving diagnostics, encrypted backup tooling | Named support/recovery owners and independently stored, tested recovery keys |

Cloudflare Workers Free currently includes 100,000 requests/day with a 10ms CPU allowance per invocation; this is a capacity limit, not an availability guarantee. Pages Free currently allows 500 builds/month. Any migration needs its own compatibility and restore checks. [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Pages limits](https://developers.cloudflare.com/pages/platform/limits/)

Supabase Free currently includes a 500MB database, 50,000 monthly active users, 5GB egress and 1GB file storage, and may pause after a week of inactivity. Those are provider limits, not a tested capacity statement for this app. A dependable paid client SLA cannot be promised on free tiers alone. Keep the pilot free, measure real usage, and make the upgrade decision from uptime/support requirements. [Supabase pricing](https://supabase.com/pricing)

## What this sprint changes

### Reduce useful work before blocking work

- Public catalogue reads share in-flight requests and a 15-second memory cache. The cache holds at most 24 list pages, 48 details, and 24 related-book groups. It never stores private learner records, rejected requests, or incomplete availability results.
- Typing catalogue queries waits 300ms before dispatch; direct URL loads, history navigation, filters, pagination and explicit retries remain immediate. Cancellation alone cannot undo database work already received.
- Independent readers can cancel without cancelling another reader's shared work. Catalogue mutations and staff data-change events invalidate old snapshots and in-flight generations.
- Staff catalogue editing requests fresh inventory, bypassing completed public snapshots. Database transactions still decide whether a copy can be lent or removed; cached availability never authorizes a mutation.
- Reading history uses stable cursor pages and 100-ID book batches. Editors reuse the loaded reading record instead of fetching the full history for each card.
- Incidental focus/visibility events are coalesced for five seconds. Explicit refresh and mutation events remain immediate. No background polling or AI connector is introduced.
- Database requests have automatic SDK retries disabled. The transport has a 15-second deadline and preserves caller cancellation. A timeout does not prove a write failed; circulation request IDs and partial-catalogue recovery remain necessary.
- Rate-limit feedback explains the wait and preserves drafts. It is translated into English and Vietnamese without exposing raw database error text.

Browser cache and refresh controls reduce normal traffic. They are not a security boundary and cannot stop someone calling Supabase directly.

### Server-enforced budget: pending hosted rollout

The new migration `20261106175337_enforce_authenticated_request_budget.sql` installs a private PostgREST pre-request hook. It allows 120 authenticated POST/PUT/PATCH/DELETE requests in read/write transactions per account in a fixed 60-second window anchored on the first accepted request. The atomic database counter serializes concurrent clients. Identity comes from verified JWT context through `auth.uid()`, never a caller-supplied IP, user ID, payload, or request ID. Excess work is rejected with HTTP 429, `EVG_RATE_LIMITED`, `Retry-After`, and `Cache-Control: no-store`.

One private counter row is retained per account and removed with that account. There is no IP-address or request-content log. Existing pre-request hooks are detected so the migration refuses to silently replace them. RLS and existing staff/ownership checks remain in force.

The counter is part of the request transaction. Failed or rolled-back requests do not consume the quota. The limit therefore bounds committed write-capable work; it is not a cap on every incoming attempt, a sliding-window guarantee, a distributed denial-of-service shield, or protection for every Supabase product.

PostgREST read-only transactions are not counted. This includes GET/HEAD and POST calls to STABLE/IMMUTABLE read-only functions, such as catalogue search; those transactions cannot commit a counter update or application mutation. Anonymous requests, Supabase Auth, Storage and Realtime are outside this hook. Auth has its own provider rate limits. Read protection must be addressed at the actual API ingress; putting a firewall only in front of the website does not protect a publicly reachable Supabase URL. [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api), [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits)

Hosted read-only inspection on 7 November found statement timeouts of 3 seconds for `anon` and 8 seconds for `authenticated`, plus an 8-second authenticator lock timeout. Those bound query/lock duration, not request frequency. No hosted settings were changed.

### Release procedure for the quota

1. Review the migration and the latest local SQL/HTTP evidence. Keep the existing backup and rollback procedures available.
2. Inspect the target PostgREST `db-pre-config`, `db-pre-request`, `db-config`, role settings and exposed schemas. Compose any existing operator/provider hook explicitly; do not bypass the migration's conflict refusal.
3. Apply the reviewed migration to the intended backend during a separately approved deployment. This sprint leaves it unapplied to the hosted project.
4. Confirm configuration reload and check successful authenticated requests, denial with 429/Retry-After, independent account budgets, and unchanged public GET behaviour using dedicated synthetic accounts. SQL tests alone do not prove an HTTP hook is active.
5. Re-export migration history and run the release checker. The older hosted 20-migration backend will intentionally fail parity against this 23-migration candidate (request budget, classroom learning, and staff reading/catalogue changes).
6. Monitor normal staff work before tuning the quota. Changes must preserve concurrency tests and user-facing retry guidance.

For rollback, restore the previously recorded pre-request configuration and reload PostgREST; retain the private counter table until the rollback is verified. Do not remove database authorization checks to restore throughput.

## What to add when AI recommendations arrive

This candidate starts with deterministic book ranking using explicit interests, recent reading topics, language preference, and transparent reasons, plus a small curated external resource set. See [Explore design](EXPLORE_LEARNING_DESIGN_2026-11-07.md) for bounds and suitability limitations. Evaluate whether a model improves relevance before adding recurring inference cost.

If Groq or DeepSeek is later introduced, route calls through one server adapter. Keep provider keys out of `VITE_` variables and the browser. Authenticate each caller, validate the request, cap input/output size, enforce per-account and project-wide budgets, bound concurrency, and retain a deterministic fallback when the provider is unavailable or the budget is exhausted. Cache only safe reusable results with explicit invalidation. Do not send learner names, email addresses, or private reflections by default.

Model output must reference approved resource IDs and be validated before display. A language model must not decide staff permissions, lending eligibility, rewards, or publication approval. Test relevance, privacy and failure behaviour on synthetic cases before any learner pilot. No current UI claims that this service exists.

An edge rate limit is useful for protecting this future vendor API, but only if clients cannot bypass it through an unrestricted alternative endpoint. Global paid-token budgets need durable atomic accounting; an in-memory counter inside a serverless instance is insufficient. Cloudflare documents that its edge rate counters are distributed and may allow brief excess traffic, so they should complement application quotas rather than act as an exact billing ledger. [Cloudflare rate limiting](https://developers.cloudflare.com/waf/rate-limiting-rules/)
