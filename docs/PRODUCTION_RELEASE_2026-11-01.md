# Production release and operating checks

Prepared 1 November 2026. This document describes the production-readiness candidate in `codex/production-readiness`. A local pass is not a deployment or approval to enrol learners. Record the exact deployed commit and hosted evidence below before acceptance.

## Evidence recorded on 1 November 2026

| Check | Recorded outcome | Boundary |
| --- | --- | --- |
| TypeScript, lint and build | Passed, including the new Node tools and browser-test source | Local candidate; public pages pre-rendered from the same React components |
| Node regression tests | 65 passed on the publication candidate | Helpers, configuration safety, diagnostic payloads, metadata, migration parsing, encrypted-backup policy and pinned provider trust |
| Browser journeys | 26 desktop/phone checks passed | Synthetic intercepted APIs; no production learner records used |
| SQL regression | 20 migrations, seven suites, eight concurrency probes passed | Disposable local PostgreSQL with an Auth shim |
| Index coverage | All 18 public foreign keys covered; replay introduces no duplicate indexes | Local schema verification; matching migration also applied live |
| Backup mechanism | Synthetic data, roles, RLS and grants restored; tampered archive rejected | Does not establish a hosted backup schedule or provider-compatible restore |
| Real protected backup | Read-only hosted export encrypted with age; recovery-key decryption reproduced all three source files exactly | Certificate and hostname verified with the official Supabase CA; encrypted payload 553,378 bytes; local only |
| Real restore attempt | Strict isolated restore stopped at incompatible managed-role grants; disposable cluster removed | Full recovery remains unverified; no errors were skipped and no hosted records were modified |
| Free backup billing | Existing account-wide Actions budget is $0 with usage blocked; current included storage shows 0 GB of 0.5 GB | Observed in signed-in GitHub settings; actual successful workflow runs establish operating status |
| Built HTTP report | 40 technical checks passed, including supplied actual hosted migration export | Loopback build preview with production headers/routing; not a Vercel deployment |
| Hosted migration state | All 20 source migrations present | Four pending migrations and one index migration applied; filenames aligned to recorded versions without rewriting the live ledger |
| Hosted SQL role checks | Guest/student restrictions, learner separation, staff dashboard/directory and private-reflection exclusion passed | Read-only SQL under actual roles with transaction-local claims; not signed-JWT/PostgREST browser tests |
| Email and callbacks | Recovery and signup requests accepted; user confirmed both emails arrived and both flows completed; both test accounts confirmed in Auth | No password/token copied into evidence; custom sender configuration and learner-scale delivery limits still need explicit verification |
| Dependencies | Zero known vulnerabilities in the final installed dependency scan | Patched build packages and a minimatch override verified by lint/build |

Sanitised evidence and screenshots are retained in the workspace `outputs/production-readiness-2026-11-01/` folder. The development preview is `http://127.0.0.1:4177`; the built preview with production headers is `http://127.0.0.1:4180`. `release.json` explicitly records whether its source worktree is dirty, so its base commit must not be presented as a committed release.

The main source checkout was preserved. The user approved publication of the reviewed frontend and activation of the encrypted backup workflow on 1 November; the protected repository connection secret is configured. Live schema changes and the authorised test signup/email requests were completed before publication. A real hosted export was read-only and its encrypted recovery was checked locally. Verify the exact public commit and the first retained off-site artifact through the release and workflow checks below. Lending remains disabled. Full signed-in persistence/isolation through real browser JWT sessions, a provider-compatible restore, named ownership/retention/support arrangements, and physical inventory/lending acceptance remain open launch evidence.

The former security-definer availability-view error is resolved and foreign-key indexing advisories are resolved. Remaining [security-definer function notices](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) refer to intentionally callable RPCs with explicit staff checks; read-only hosted checks verified student denial. RLS without direct policies on bootstrap/contact tables intentionally denies direct access. [Leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) remains disabled on the current Free plan; Supabase requires Pro or above for that feature. No paid upgrade was purchased.

## Candidate first-release scope

The candidate supports public information and activities, accounts, catalogue browsing, saved reading/reflections/interests, and authorised library operations. Temporary goal/project editing is excluded from normal learner use. Community examples remain labelled inspiration; publishing, facilitator feedback, rewards and recommendations remain deferred.

The interface shares the established cream/green palette, typography, controls, navigation, accessible feedback and responsive layouts. Privacy/help information belongs in the public footer and must be available in English and Vietnamese.

## Automated evidence

Run these from the repository root with Node.js 24+ and a clean install:

```sh
npm ci
node --test tests/*.test.ts
npm run lint
npm run build
npx playwright install --with-deps chromium
npm run test:browser
python3 supabase/tests/run-local.py
python3 scripts/test-backup-drill.py
```

A live build requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or the legacy public anon key). Set `VITE_SITE_URL` to the accepted public origin; its default is `https://heal-edu-tech.vercel.app`. The generated `release.json` records the commit, app mode and migration requirements. An intentional disconnected preview must explicitly use `VITE_APP_MODE=demo`. CI builds an explicitly labelled demo candidate, then starts a separately configured local server for synthetic API journeys. CI does not contain production credentials.

The browser suite runs desktop Chromium and a phone-sized Chromium viewport. It exercises catalogue search/deep links, EN/VI switching, outages/retry, form errors, guest and learner access boundaries, librarian screens, save/reload, draft preservation after a failed save, sign-out followed by another learner, absence of temporary learner editors and bilingual crash recovery. All API calls use an intercepted synthetic backend; unexpected outbound API requests fail the suite. Phone emulation does not prove Safari, screen-reader or real-device conformance.

The database suite replays all migrations in a brand-new private-socket PostgreSQL cluster, verifies permissions/constraints and tests concurrent clients. The Auth shim is not GoTrue, PostgREST or JWT validation. The backup-tool regression exports and restores only synthetic local data and verifies archive tampering is rejected. Both tools stop and remove their disposable clusters and retain evidence separately.

GitHub Actions is configured to run browser and database checks; it must run on the accepted remote commit before release. A green check proves the exercised candidate, not successful email delivery, complete physical inventory or a hosted restore.

## Verify the exact hosted release

1. Keep the preview and production backend identities explicit. Do not run destructive/concurrency suites against a hosted project.
2. Export the target project's actual applied migration versions, for example from Supabase migration history or `supabase migration list --linked`. Retain a dated export without passwords: either the complete CLI Local/Remote table, a JSON array of remote `version` records, or one applied remote version per line. The checker reads only the Remote column of CLI tables, so local-only versions cannot incorrectly satisfy parity. Compare all repository versions, including the October secure-availability and staff-oversight migrations. Review/apply missing migrations in order through the authorised release procedure; do not disable permissions to make a check pass.
3. Build/deploy the accepted commit with its intended public configuration. Record deployment ID, origin, commit, app mode and database identity. Never put service-role, database-password, SMTP or signing credentials in `VITE_` variables.
4. Run the read-only public report against that exact URL:

```sh
node scripts/check-release.ts --url https://your-accepted-origin.example --hosted-migrations /protected/hosted-migrations.txt
```

The report checks delivered public HTML/metadata, bilingual public routes, machine-readable sitemap/robots and security headers. Missing human/account/restore evidence is reported as **unverified**, never silently marked passed.
5. Repeat the signed-in rehearsal below. Verify guest denial of staff data using the actual public API, and student denial of staff endpoints with an authenticated student token. An anonymous error alone does not establish successful staff operation.
6. Roll back the frontend only to a commit compatible with the current schema. A website rollback does not reverse migrations or restore deleted records.

## Hosted account and email rehearsal

Use authorised synthetic identities and dedicated non-student mailboxes. Do not enter real learner data for a release test. Record expected/actual results and cleanup without copying tokens or passwords into evidence.

| Journey | Required result |
| --- | --- |
| External-address signup | Email is actually received, confirmation opens the accepted origin, and sign-in succeeds |
| Recovery and magic link | Actual mail receipt, correct redirect, successful recovery; expired/reused links fail with useful recovery |
| Learner A persistence | Reading status, private reflection and interests survive refresh and sign-out/re-login |
| Learner B separation | B cannot read/update A's records through the UI or authorised direct isolation requests |
| Shared computer | A signs out; Back/refresh and B's login show none of A's private information |
| Librarian | Catalogue, loans, student directory and dashboard load; administration/grant controls remain denied |
| Administrator | Intended management controls work; revoked staff access is denied by the backend |
| Interrupted save | UI retains the draft, reports failure and retries without duplicate lending/contact records |

Confirm supported custom SMTP/email-hook delivery, sender identity, redirect allowlist and appropriate rate limits in the actual hosted project. Supabase's default mailer is not intended for production. Test real delivery to an external test address; a successful request or displayed draft does not prove receipt. See [Supabase SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp).

## Backup and restore procedure

The selected free off-site mechanism is documented in [Free encrypted backups](FREE_ENCRYPTED_BACKUPS.md). Its daily workflow, encrypted-only artifacts and quota gates are prepared; current connection/billing/enablement facts are recorded there.

The user delegated the free backup choice. The mechanism uses daily GitHub Actions exports, age encryption and 14-day encrypted artifact retention, with conservative storage limits and no paid overage. The existing $0 Actions account budget was verified and the protected repository connection secret was configured with explicit user approval. Inspect the [backup runs](https://github.com/gsharsh/HealEduTech/actions/workflows/backup.yml) for a successful default-branch run and retained artifact; configuration alone does not establish operation. A named recovery owner, alert routing and acceptable loss/recovery times still need operational acceptance.

Use a direct database connection or a supported session connection, a compatible PostgreSQL client, and verified provider TLS settings. Read the connection from a secret manager into a named environment variable; never paste it into command arguments, chat or tracked files.

```sh
node scripts/backup-database.ts --database-url-env EVG_BACKUP_DATABASE_URL --output /protected/new-backup-directory --use-supabase-ca
```

The default prints a plan and does not connect. After approving the destination and connection, repeat with `--execute`. The source connection forces read-only transactions. Remote connections enforce `sslmode=verify-full`, verifying both the trusted certificate and server hostname. This site's `--use-supabase-ca` option checks the bundled official public CA's pinned file hash, certificate fingerprint and validity period before connecting; the daily workflow uses the same option. Other providers default to `sslrootcert=system`, with an explicit custom `sslrootcert` supported. Weaker TLS modes are rejected. Certificate failure stops the export without a downgrade. The tool exports schema/data/ACLs and role definitions **without role passwords**, validates the archive catalogue, writes checksums and uses restricted file permissions. Backups contain sensitive account and learner data, including Auth records; filesystem permissions are only one layer of protection. Encrypt the destination and verify access/retention through the agreed backup system.

Database exports do not contain Storage file bytes, SMTP/provider settings, signing keys or the platform configuration. Record separate recovery steps for those. A partial/failed export is never labelled restore-verified. Only restore trusted archives produced by the authorised backup process.

For a compatible local PostgreSQL installation, a disposable drill is available:

```sh
node scripts/backup-database.ts --restore-drill /protected/new-backup-directory/database.dump --output /protected/new-drill-report-directory
```

The default is again a plan. `--execute` creates a **brand-new local cluster with no TCP listener**, restores password-free roles and the archive, checks table/RLS presence, then stops/removes that cluster. It never accepts an existing destination database. The private socket isolates database state rather than the operating system; restore only trusted exports in a disposable test environment because SQL restoration can exercise source-superuser capabilities. Missing source extensions or incompatible provider features correctly fail the drill. Retained reports/logs are sensitive and require the same protection as the archive.

A local archive restore is supporting evidence. Complete a provider-compatible isolated staging restore and repeat real Auth, roles, private reading, inventory/availability and lending checks before accepting recovery. Disable outbound email in that restored environment. Record elapsed time and recoverable data loss. Production restoration needs the incident owner's explicit approval because it may replace later work.

## Content, privacy and operator acceptance

Before learner enrolment, EVG must confirm the actual support contact, who operates the site, what staff can see, retention/removal procedures, and who handles an account/data request. Public copy must match those decisions. Existing circulation history intentionally restricts destructive account deletion; use a reviewed retention/anonymisation procedure rather than deleting Auth users without checking references.

Reconcile real books, language, physical copies, shelf identifiers, condition and existing paper loans. Translated descriptions do not make an English book Vietnamese. Review activity suitability and translations with Vietnamese-speaking staff/learners on their actual devices/network.

Keep digital lending disabled until staff approve eligibility, limits, due dates/timezone, damaged/lost procedures and paper reconciliation. Rehearse checkout/return, duplicate retries, corrections and outage recovery. A browsing/reading pilot can explicitly defer lending.

Assign named programme, administration, library, technical and backup owners with tested independent access. Confirm billing limits, vendor ownership and expiry/renewal alerts. Rehearse a deployment, frontend rollback and isolated restore without the creator taking over.

## Release evidence record

Record each item with date, reviewer and retained evidence location; an empty entry remains open.

| Gate | Evidence to record |
| --- | --- |
| Candidate checks | Exact commit, Node/browser/PostgreSQL versions, test output, mobile/EN-VI screenshots |
| Hosted parity | Deployed commit/configuration and actual applied migration export |
| Accounts/email | Controlled identities, received mail and completed persistence/isolation/shared-device journeys |
| Recovery | Backup method/schedule/retention, encrypted destination, successful provider-compatible restore and measured recovery |
| Inventory/lending | Physical reconciliation, accepted policy and staff rehearsal, or explicit disabled-lending scope |
| Ownership/privacy | Named primary/backups, support contact, retention/removal decision and operating instructions |
| Acceptance | EVG's accepted scope, deferred features, remaining limitations and launch decision |
