# Supabase local data

## Connecting the HealEduTech project

The hosted HealEduTech project ref is `znftduqfbwfrprhawgxh`. Before applying migrations, seeds, or staff changes through an AI connector, confirm the Supabase connection can list that exact project.

In Codex, open the Supabase plugin connection flow, sign in to the Supabase account that owns or has access to the EVG HealEduTech organization, and grant access to the organization containing `znftduqfbwfrprhawgxh`. If the connector still only lists another project, disconnect/reconnect the Supabase plugin and choose the EVG organization during OAuth.

The project can also be scoped manually with Supabase's hosted MCP URL:

```txt
https://mcp.supabase.com/mcp?project_ref=znftduqfbwfrprhawgxh&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching
```

Only apply the HealEduTech migrations or seed data after the connector, CLI, or database URL is pointed at `znftduqfbwfrprhawgxh`.

## Public availability view security

`20261021090000_secure_book_availability.sql` fixes the Security Definer View
advisor warning for `public.book_availability`. The view uses
`security_invoker = true`, while a private helper returns only the public
`book_id`, `total_copies`, and `available_copies` aggregate. The helper deliberately
uses definer privileges so guest and learner counts include all copies and active
loans without granting access to private inventory or borrower records.

Setting the original view to invoker without this helper would cause guest
permission errors and incorrect learner counts under the existing inventory RLS.

Apply the complete migration through the SQL Editor or an authenticated database
connection for the confirmed project. For example:

```sh
psql "$SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction \
  -f supabase/migrations/20261021090000_secure_book_availability.sql
```

Then rerun the Supabase Security Advisor and check public catalogue availability.
The local SQL suite checks the view setting, aggregate counts, and private-table
access with synthetic users in a disposable PostgreSQL cluster:

```sh
python3 supabase/tests/run-local.py
```

## Staff role assignment from Supabase Dashboard

The staff migration bootstraps `gsharsh11235@gmail.com` as the approved first application administrator. After that account exists and is confirmed in Authentication, sign in to `/admin` and claim administrator access.

For direct dashboard assignment, run this in the SQL Editor for the HealEduTech project:

```sql
select *
from staff_private.assign_staff_from_dashboard(
  'staff-member@example.com',
  'librarian',
  'gsharsh11235@gmail.com'
);
```

Use `'administrator'` for staff who should manage roles. The target email must already exist under Authentication → Users. This helper is private to trusted Dashboard SQL operators and is not callable by website users.

`seed.sql` adds a small, idempotent sample catalogue for local development and demos. Supabase applies it after migrations when running `supabase start` for a fresh local database or `supabase db reset`.

The sample books are public-domain Project Gutenberg records with source URLs and licensing notes in the seed file. The seed uses fixed UUIDs and `EVG-SEED-*` inventory codes so repeated runs update the same records instead of creating duplicate books or copies. It intentionally stores no remote cover image URLs.

To verify the seed against a local Supabase database:

```sh
supabase db reset --local
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -f supabase/tests/seed.sql
```

The seed test runs inside a transaction, includes the seed twice, checks the expected book/copy counts and topic coverage, confirms every seeded book has at least two copies, and rolls back.

To apply the sample catalogue to a hosted project, first confirm your CLI or database connection is pointed at the intended EVG project, then run the seed file once:

```sh
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/seed.sql
```

Do not apply this through a connector or saved connection that is authenticated to a different Supabase project.
