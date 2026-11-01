# Production release and operating checks

Updated 1 November 2026. This document records the published website and completed technical verification, including provider-aware recovery. Technical passes do not constitute EVG's approval to enrol learners; the operating and acceptance decisions below remain separate.

## Evidence recorded on 1 November 2026

| Check | Recorded outcome | Boundary |
| --- | --- | --- |
| TypeScript, lint and build | Passed, including the new Node tools and browser-test source | Local candidate; public pages pre-rendered from the same React components |
| Node regression tests | 80 passed after the recovery tools were added | Includes emitted API execution, archive/profile/service-tool guards and application/backup regressions |
| Browser journeys | 28 desktop/phone checks passed on `1f841560` CI | Synthetic intercepted APIs; includes same-browser-profile account persistence and cross-tab isolation regressions |
| SQL regression | 20 migrations, seven suites, eight concurrency probes passed | Disposable local PostgreSQL with an Auth shim |
| Index coverage | All 18 public foreign keys covered; replay introduces no duplicate indexes | Local schema verification; matching migration also applied live |
| Backup mechanism | Synthetic data, roles, RLS and grants restored; tampered archive rejected | Supplemented by the real off-site recovery below |
| Real protected backup | Read-only hosted export encrypted with age; recovery-key decryption reproduced all three source files exactly | Certificate and hostname verified with the official Supabase CA; encrypted payload 553,378 bytes; local only |
| Provider-aware database recovery | Existing off-site archive strictly restored: all 50 COPY tables, 368 rows and two sequence states matched their archived counts/SHA-256s | Fresh offline Supabase PostgreSQL 17.6 target; all 16 logical catalog categories, extension owners and database properties matched the separately captured source baseline; no errors skipped |
| Restored service recovery | 54 local Auth/PostgREST learner/staff checks passed with real local JWTs | Auth 2.197.0 and PostgREST 14.18; no migration overlays; supplemental provider profile/bootstrap required |
| First off-site backup | [Run 41296898107](https://github.com/gsharsh/HealEduTech/actions/runs/41296898107) succeeded; artifact digest, ciphertext checksum, decryption and recovered export checksums passed | PostgreSQL 17.11 client; encrypted artifact retained through 15 November; that exact archived snapshot was used for the provider-aware drill |
| Free backup billing | Existing account-wide Actions budget is $0 with usage blocked; current included storage shows 0 GB of 0.5 GB | Observed in signed-in GitHub settings; actual successful workflow runs establish operating status |
| Hosted HTTP report | 44 technical checks passed against deployed `1f8415606982b89d7dea456d054e1ece4c6ffb46` | Exact release/mode, public routes/headers, migration parity and diagnostic API rejection checks; earlier loopback preview had 40 checks |
| Hosted migration state | All 20 source migrations present | Four pending migrations and one index migration applied; filenames aligned to recorded versions without rewriting the live ledger |
| Hosted SQL role checks | Guest/student restrictions, learner separation, staff dashboard/directory and private-reflection exclusion passed | Read-only SQL under actual roles with transaction-local claims; not signed-JWT/PostgREST browser tests |
| Real hosted learner isolation | Two normally signed-in learners passed UI reload/re-login persistence, shared-device sign-out and bidirectional API read/update/delete isolation | Genuine JWTs validated by hosted Auth; forged-owner inserts, owner reassignment and learner access to staff/admin APIs denied; two temporary reading rows removed; original learner records unchanged |
| Email and callbacks | Recovery and signup requests accepted; user confirmed both emails arrived and both flows completed; both test accounts confirmed in Auth | No password/token copied into evidence; custom sender configuration and learner-scale delivery limits still need explicit verification |
| Dependencies | Zero known vulnerabilities in the final installed dependency scan | Patched build packages and a minimatch override verified by lint/build |

Sanitised evidence and screenshots are retained in the workspace `outputs/production-readiness-2026-11-01/` folder. The development preview is `http://127.0.0.1:4177`; the built preview with production headers is `http://127.0.0.1:4180`. `release.json` explicitly records whether its source worktree is dirty, so its base commit must not be presented as a committed release.

The main source checkout was preserved. Publication and encrypted backup activation were authorised on 1 November; the protected repository connection secret is configured. Real hosted learner persistence/isolation passed against deployed commit `1f8415606982b89d7dea456d054e1ece4c6ffb46`. That release fixes cross-tab Auth BroadcastChannel leakage while preserving reload persistence; CI and the real shared-profile rehearsal cover the correction. The existing off-site snapshot also passed provider-aware local database and service recovery. Sanitised records are `live-account-isolation-final.json`, `provider-restore-final.json` and `restored-services-final.json` in the evidence folder. Original restore reports remain preserved. Lending remains disabled. Named ownership, retention/support arrangements, physical inventory/lending acceptance and EVG's launch decision remain open.

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

The report checks delivered public HTML/metadata, bilingual public routes, machine-readable sitemap/robots and security headers. On a real HTTPS deployment it also checks that the diagnostic function rejects unsupported methods and cross-site requests, so a failed function compilation cannot hide behind successful static-page checks. Missing human/account/restore evidence is reported as **unverified**, never silently marked passed.
5. Repeat the signed-in rehearsal below. Verify guest denial of staff data using the actual public API, and student denial of staff endpoints with an authenticated student token. An anonymous error alone does not establish successful staff operation.
6. Roll back the frontend only to a commit compatible with the current schema. A website rollback does not reverse migrations or restore deleted records.

## Hosted account and email rehearsal

Use authorised synthetic identities and dedicated non-student mailboxes. Do not enter real learner data for a release test. Record expected/actual results and cleanup without copying tokens or passwords into evidence.

Recorded on 1 November: both real learner accounts completed normal sign-in, UI persistence through reload and sign-out/re-login, shared-browser A-to-B sign-in, guest/history/refresh checks and bidirectional backend isolation. Negative write probes left both accounts' own rows intact; the two temporary test rows were removed and test tabs closed. This is completed hosted account-isolation evidence. The remaining staff/operator journeys below still require their own acceptance; positive local staff JWT checks are recorded separately in the recovery evidence.

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

The selected free off-site mechanism is documented in [Free encrypted backups](FREE_ENCRYPTED_BACKUPS.md). Its daily workflow, encrypted-only artifacts and quota gates are enabled; current connection/billing/enablement facts are recorded there.

The user delegated the free backup choice. The mechanism uses daily GitHub Actions exports, age encryption and 14-day encrypted artifact retention, with conservative storage limits and no paid overage. The existing $0 Actions account budget was verified and the protected repository connection secret was configured with explicit user approval. Inspect the [backup runs](https://github.com/gsharsh/HealEduTech/actions/workflows/backup.yml) for a successful default-branch run and retained artifact; configuration alone does not establish operation. A named recovery owner, alert routing and acceptable loss/recovery times still need operational acceptance.

Use a direct database connection or a supported session connection, a compatible PostgreSQL client, and verified provider TLS settings. Read the connection from a secret manager into a named environment variable; never paste it into command arguments, chat or tracked files.

```sh
node scripts/backup-database.ts --database-url-env EVG_BACKUP_DATABASE_URL --output /protected/new-backup-directory --use-supabase-ca
```

The default prints a plan and does not connect. After approving the destination and connection, repeat with `--execute`. The source connection forces read-only transactions. Remote connections enforce `sslmode=verify-full`, verifying both the trusted certificate and server hostname. This site's `--use-supabase-ca` option checks the bundled official public CA's pinned file hash, certificate fingerprint and validity period before connecting; the daily workflow uses the same option. Other providers default to `sslrootcert=system`, with an explicit custom `sslrootcert` supported. Weaker TLS modes are rejected. Certificate failure stops the export without a downgrade. The tool exports schema/data/ACLs and role definitions **without role passwords**, validates the archive catalogue, writes checksums and uses restricted file permissions. Backups contain sensitive account and learner data, including Auth records; filesystem permissions are only one layer of protection. Encrypt the destination and verify access/retention through the agreed backup system.

Database exports do not contain Storage file bytes, SMTP/provider settings, signing keys or the platform configuration. Record separate recovery steps for those. A partial/failed export is never labelled restore-verified. Only restore trusted archives produced by the authorised backup process.

The generic PostgreSQL drill remains useful for synthetic tests. The completed Supabase recovery uses the provider-aware tool instead:

Prepare a free local container engine and pre-pull the exact digest-pinned images in `restore-supabase-local.ts` and `verify-restored-services.ts`: Supabase PostgreSQL 17.6.1.166, Auth 2.197.0 and PostgREST 14.18. The tools do not pull images during recovery. Review the versioned provider inputs and copy them to private files outside Git before starting.

```sh
DOCKER_HOST=unix:///explicit/local/docker.sock node scripts/restore-supabase-local.ts \
  --container evg-restore-new-unique-name \
  --archive /protected/recovered-export/database.dump \
  --provider-profile /protected/provider-profile.json \
  --provider-bootstrap-sql /protected/provider-bootstrap.sql \
  --locale en_US.UTF-8 \
  --output /protected/new-restore-report \
  --keep-for-service-checks
```

The default prints a plan. After reviewing the inputs, `--execute` creates new owned container/volume resources using the pinned ARM64 Supabase image, with no network, published ports or host binds. It restores schemas, each extension under its recorded owner, then every remaining archive entry exactly once. It preserves exported roles, ownership, ACLs, defaults and RLS; unsupported entries or restore errors stop the drill. `--keep-for-service-checks` explicitly retains a successful offline target for the subsequent local Auth/PostgREST checks; otherwise owned resources are removed.

The versioned [provider profile](../supabase/recovery/provider-profile-2026-11-01.json) and [provider bootstrap SQL](../supabase/recovery/provider-bootstrap-2026-11-01.sql) are supplemental recovery inputs, not contents of the original three-file encrypted archive. Review and copy them into private mode-0600 files outside Git before running the tool. Their hashes are recorded; the pinned bootstrap hash must match. Bootstrap SQL contains no credentials, transaction commands or psql metacommands. It reproduces the source's provider-owned objects/grants and database owner/ACL/settings that the raw dump alone does not establish. No fresh application/Auth/Storage migrations were layered over the snapshot. Refresh these inputs when provider ownership, privileges or database settings change; the daily three-file export does not capture them automatically.

Generate the matching source/local comparison query with `node scripts/restore-supabase-local.ts --print-verification-sql`; capture results privately. For a source capture matching the recovery point, add `--expected-metadata /protected/source-metadata.json` to require exact equality, including rows and sequence states. When newer live Auth activity has advanced those values, independently compute and retain a static-catalog/extension/database comparison alongside the tool's exact archive-data comparison. That evidence can support a separate fully verified report with its comparison scope recorded; preserve the original raw restore report unchanged. `--execute` without a baseline does not itself produce a service-ready verified report, and changing a status field alone establishes nothing.

Only after those checks pass, use the retained fully verified report with a separate **new sibling** output directory:

```sh
DOCKER_HOST=unix:///explicit/local/docker.sock node scripts/verify-restored-services.ts \
  --restore-report /protected/new-restore-report/verified-report.json \
  --output /protected/new-service-report
```

Review the plan, then add `--execute`. The service tool requires the successful ownership-labelled restore and both archive/source verification results. It shares the database's `network=none` container namespace, publishes no host ports and mounts no host files. It starts Auth without migrations and REST with fresh isolated credentials, then removes only its own service containers; database/volume cleanup remains the recovery owner's responsibility.

Verification separately matches the exact archived data and the current logical source catalog. Live sign-ins naturally advance Auth sessions and sequences; current live rows must not be substituted for the archived recovery point. The completed drill matched 50 tables/368 rows/two sequences against the archive, then all 16 catalog categories plus extension owners and database properties against the source baseline. Local Auth 2.197.0/PostgREST 14.18 passed 54 real-JWT learner/staff checks using four fresh local fixture accounts. Original account passwords were not tested on the restored copy. SMTP/OAuth, hosted signing keys and Storage file bytes remain separate recovery concerns. Storage objects and Vault secrets were both zero; the drill therefore did not test nonempty Storage recovery or original Vault-key portability.

This completes the recorded provider-aware local recovery drill, not a production replacement or owner acceptance. Cleanup removed both restored database containers/volumes, the task VM, temporary decrypted copies and detailed temporary configurations; the encrypted backup and private recovery key were retained. Keep outbound email disabled during future drills, retain protected reports, record the recovery point/elapsed time and repeat after provider or schema changes. Production restoration needs the incident owner's explicit approval because it may replace later work.

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
