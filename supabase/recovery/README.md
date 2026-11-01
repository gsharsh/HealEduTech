# Provider recovery inputs

These are recovery fixtures, not application migrations. They were used for the
successful offline restore of the 1 November 2026 backup with Supabase Postgres
17.6.1.166. They contain public role names, extension ownership, grants and a
non-secret token lifetime; they contain no credentials or user records.

The logical archive does not include every provider initialization detail or
database-level property. The profile records the observed extension owners and
pins the exact supplementary SQL by SHA-256. The SQL restores provider-created
function/view owners, grantors, schema privileges and database properties. These
files are additional recovery inputs; they were not present inside the original
encrypted backup.

Before a future recovery, review these inputs against the intended snapshot and
provider version. Copy them to an owner-only directory outside the repository,
with file permissions `0600`, before supplying them to
`scripts/restore-supabase-local.ts`. The tool rejects unknown extensions and a
bootstrap whose bytes do not match the profile. Bootstrap SQL is trusted SQL
executed transactionally in a disposable database; keep transaction commands and
psql metacommands out of it.

See the [recovery procedure](../../docs/PRODUCTION_RELEASE_2026-11-01.md#backup-and-restore-procedure)
for the restore and offline Auth/API checks. Storage file bytes, external Auth
providers, email delivery, signing keys and platform configuration require their
own recovery arrangements.
