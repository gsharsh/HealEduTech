# Free encrypted off-site database backups

Prepared 1 November 2026. The chosen mechanism uses this repository's GitHub Actions and artifact storage. It adds no paid storage service and no new account. The website remains TypeScript; the official age executable is a backup tool, not an application framework.

## Current setup

The existing repository is public, administrator access was verified using its existing configured Git credentials, and its artifact inventory contained zero artifacts at inspection. The public `AGE_BACKUP_RECIPIENT` repository variable has been configured. The corresponding private recovery identity was generated outside Git with owner-only permissions, and a synthetic encrypt/decrypt round-trip passed. No private identity is stored in the repository, workflow, Actions variables or Actions secrets.

The signed-in personal billing UI subsequently verified GitHub Free at $0/month, Actions storage at 0 GB of 0.5 GB included, no recorded usage/billable Actions, and an existing account Actions budget of $0/$0 with status **Usage blocked**. No financial setting was changed. `BACKUPS_FREE_TIER_CONFIRMED=true` was then set and read back. The earlier billing API HTTP 404 did not establish this control; the signed-in UI check resolved that evidence gap.

A real read-only export of the PostgreSQL 17 source using PostgreSQL 18 client tools succeeded with the official Supabase public CA and `verify-full`. The age-encrypted local artifact is 553,378 bytes, and decryption reproduced all three export files with matching checksums. Temporary plaintext source/recovery copies were removed. A strict native local restore stopped at source-managed role grants with an ADMIN-option permission incompatibility and removed its disposable cluster; it did not reach extension restoration. **Provider-compatible full recovery remains unverified.** The user approved publication and activation on 1 November. The database connection was encrypted locally to GitHub's repository public key before saving it as the protected `EVG_BACKUP_DATABASE_URL` Actions secret; its metadata was verified without reading back its value. The private recovery identity remains outside GitHub. Check the actual [backup runs](https://github.com/gsharsh/HealEduTech/actions/workflows/backup.yml) and their retained artifacts for current operating evidence; source publication alone does not establish a successful off-site backup.

## Chosen operating limits

| Setting | Selected value |
| --- | --- |
| Schedule | Daily at 02:17 UTC / 10:17 Singapore time |
| Retention | 14 days per encrypted artifact |
| Single artifact ceiling | 10 MiB, including a conservative packaging allowance |
| Source export ceiling | 9 MiB before encryption |
| Repository artifact ceiling | 200 MiB, including other workflows' non-expired artifacts |
| Daily duplication | Refuse a second successful backup artifact with the same UTC date |
| Runner | Standard GitHub-hosted Linux; no dependency cache |
| Job deadline | 10 minutes |
| Trigger scope | Default branch only; checkout is pinned to that trigger's immutable commit |
| Encryption | Official age 1.3.2, downloaded from upstream and verified against a fixed SHA-256 |

GitHub currently includes 500 MB artifact storage with GitHub Free, shared with Packages and other repositories' usage. Standard hosted runners are free for public repositories; private GitHub Free repositories receive 2,000 monthly minutes. These are vendor limits, not a promise that this account has unused allowance. The repository's 200 MiB guard cannot inspect or reserve account-wide shared storage, and another workflow can change inventory after a check. Keep the account's paid Actions overage blocked at zero; the observed signed-in billing evidence now permits the confirmation gate to be true. The guard checks inventory before export and again immediately before upload; it never deletes unrelated artifacts or silently purchases more space. [GitHub billing documentation](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

A limit violation fails the backup instead of increasing a storage budget. The first successful artifact of a UTC day is retained; manual retries after success are rejected. Automatic retention removes artifacts after 14 days. This is a short operational recovery window, not a long-term archive. GitHub schedules can be delayed or dropped and public-repository schedules can be disabled after inactivity; check actual successful runs rather than assuming an exact-time service. [Scheduled workflow behaviour](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)

## Enablement inputs

1. Securely configure an authorised direct PostgreSQL connection, or supported session connection, in the repository secret `EVG_BACKUP_DATABASE_URL`. Include the intended host/user/database and suitable dump permissions. Remote connections enforce `sslmode=verify-full`. This workflow explicitly selects the pinned public provider CA with `--use-supabase-ca`, so it needs no machine-specific certificate path in the database secret. Certificate errors stop the job without falling back to a weaker mode. The script forces read-only source transactions. Neither Supabase connector authentication nor a public frontend key supplies this PostgreSQL connection.
2. Confirm the public `AGE_BACKUP_RECIPIENT` variable matches the privately retained recovery identity. Keep a recoverable second copy of the private identity in an approved secure location outside GitHub; losing it makes these encrypted files unusable. The workflow needs only the public recipient.
3. Retain the verified zero paid-overage safeguard and available account allowance. The confirmation flag is now true based on the observed billing control; do not use it to bypass a failed quota check.
4. Put the reviewed [backup workflow](../.github/workflows/backup.yml) and its helper files on the default branch through the accepted source-release procedure. A selected feature-branch manual run is blocked.
5. Start one manual run, inspect its result, download the encrypted artifact and complete a provider-compatible isolated restore drill. Record the run/commit, ciphertext checksum, recovery location, elapsed recovery time and reviewer. Only then record the mechanism as operational.

Repository access does not mean the PostgreSQL secret or billing settings are known. Credentials must be configured through a secret manager or the private local setup flow, never through chat, tracked files, command-line values or `VITE_` variables.

## Trusted public CA and local use

The provider CA was downloaded using the **Download certificate** link in the signed-in project's database settings. It is bundled at `supabase/certificates/prod-ca-2021.crt`; it contains a public CA certificate, not a private key. The verification helper checks both the exact file bytes and the certificate identity before using it.

| Provenance | Value |
| --- | --- |
| Official download | [Supabase production CA](https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt) |
| Downloaded file SHA-256 | `700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7` |
| Certificate DER SHA-256 fingerprint | `807025AD50D4ED219D2C9C7D299C004F824EB00CF7F65AFEF607D07B72E6CAFA` |
| Certificate validity ends | 26 April 2031 at 10:56:53 UTC |

These are two different hashes: the first pins the downloaded PEM file, while the second identifies the parsed certificate. Obtain and review a replacement from the official settings link if the provider rotates it or before expiry. A changed, private-key-containing or expired file stops the tool. Do not disable hostname verification or replace the pin with an unchecked runtime download.

The system trust store failed certificate validation for the actual source connection. Explicit use of the verified provider CA succeeded with `verify-full`. The GitHub workflow uses the same bundled file through the explicit flag, retaining certificate and hostname checks without relying on a local private directory. Generic exports without that flag retain the system/custom-CA behaviour.

From the repository root, with the source connection configured securely in the named environment variable:

```sh
node scripts/backup-ca.ts
node scripts/backup-database.ts --database-url-env EVG_BACKUP_DATABASE_URL --output /protected/new-export-directory --use-supabase-ca
```

The first command prints public certificate provenance only. The second prints a plan without connecting; add `--execute` for the actual authorised read-only export. Neither command requires placing the password in its arguments. The explicit flag selects only the verified CA file and continues to enforce `verify-full`; it does not weaken TLS or alter the stored connection secret.

## What the job stores

The existing export utility creates schema/data/ACLs and role definitions without role passwords, then writes a checksum manifest. These files can contain sensitive Auth and learner records, so they stay in the runner's temporary owner-only directory.

The encryption helper accepts only those three regular export files, verifies that the export completed and its checksums match, then streams a tar archive into age. The upload directory must contain only `database-backup.tar.age` and `SHA256SUMS`. The workflow uploads those exact two files with compression disabled; it never uploads the plaintext directory, diagnostics or a private key. Temporary export/tool files are removed in an always-run cleanup step; GitHub also discards its hosted runner after the job. No claim of physical secure erasure is made.

The pinned age installer supports the current macOS work environment and Linux x64 runner. It checks the archive's fixed upstream digest before extracting either executable. Upstream also publishes Sigsum transparency proofs. This setup uses the fixed digest; it does not claim an independent security audit of the entire tool or a cryptographic signature from this site's owner. [Official age releases](https://github.com/FiloSottile/age/releases/tag/v1.3.2), [upstream verification guidance](https://github.com/FiloSottile/age/blob/main/SIGSUM.md)

The run summary records the source commit, workflow-run URL, artifact URL and GitHub artifact digest. The outer SHA-256 detects ciphertext corruption. Sender provenance still depends on downloading the artifact from this repository's trusted workflow, expected default-branch commit and successful run; anyone with the public age recipient can create a different encrypted file. Public artifact visibility does not reveal the data without the private identity.

## Recovery

Use the artifact attached to a trusted successful backup run. Download it into a new protected directory, verify `SHA256SUMS`, and use the checksum-verified age executable with the privately held recovery identity. Decrypt into a new protected file. Proceed only if age exits successfully; wrong identities or modified ciphertext must stop recovery. A failed decryption may leave a partial output file, which must not be extracted or restored.

The decrypted tar contains only `database.dump`, `roles.sql` and `manifest.json`. Extract into a new protected directory and follow the [database restore drill](PRODUCTION_RELEASE_2026-11-01.md#backup-and-restore-procedure). The existing drill validates the inner checksums and creates a brand-new local database with no TCP listener. A private socket isolates database state, not the operating system; restoring SQL can exercise source-superuser capabilities. Use trusted exports in a disposable test environment, not an untrusted archive on a working computer. A compatible Supabase staging restore and real sign-in/role checks remain necessary before declaring complete service recovery. Production restoration requires a separate explicit incident decision because it can replace later work.

Database exports exclude Storage file bytes, SMTP/provider settings, JWT signing keys and platform configuration. Keep their recovery arrangements separately. Do not put the backup recipient's private identity inside the database or an artifact encrypted only to that same identity.

## Verification and operation

The normal Node tests cover recipient shape, file/storage caps, daily duplication and fixed release digests. An explicit integration test uses the official installed age CLI and ephemeral synthetic keys/data to prove round-trip recovery, wrong-identity rejection, modified ciphertext failure, source checksum rejection, source-size rejection and rejection of unexpected plaintext in the upload directory. CI runs it after the existing synthetic database/restore tests. These tests neither export nor restore production data.

Review successful-run timestamps and enable GitHub Actions failure notifications for the responsible owner. A disabled workflow or silent schedule does not necessarily produce a failure email. After any failed/missed backup, preserve the last good artifact, inspect the reason, correct the input/cap/billing issue and manually retry if no successful artifact exists for that UTC date. Repeat an isolated restore periodically and after changing the database/backup tooling. Do not enable a paid plan to resolve a cap failure without a fresh user decision.
