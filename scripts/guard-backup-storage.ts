/** Read-only GitHub inventory guard; never deletes artifacts or reads database credentials. */
import { appendFileSync } from 'node:fs';
import { validateAgeRecipient, validateArtifactBudget, MAX_ENCRYPTED_BACKUP_BYTES, type RepositoryArtifact } from './backup-policy.ts';
import { inspectEncryptedBackup } from './encrypt-backup.ts';

if (process.env.BACKUPS_FREE_TIER_CONFIRMED !== 'true') throw new Error('Keep backups disabled until the account free allowance and zero paid Actions overage are confirmed.');
validateAgeRecipient(process.env.AGE_BACKUP_RECIPIENT);
const repository = process.env.GITHUB_REPOSITORY ?? '';
const token = process.env.GITHUB_TOKEN;
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !token) throw new Error('A repository-scoped read-only Actions token is required for the artifact cap check.');
const artifactList: RepositoryArtifact[] = [];
let complete = false;
for (let page = 1; page <= 20; page++) {
  const response = await fetch(`https://api.github.com/repos/${repository}/actions/artifacts?per_page=100&page=${page}`, {
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2026-03-10' },
    signal: AbortSignal.timeout(15000), redirect: 'error',
  });
  if (!response.ok) throw new Error(`Cannot verify repository artifact usage (HTTP ${response.status}); no upload permitted.`);
  const body = await response.json() as { artifacts?: RepositoryArtifact[] };
  if (!Array.isArray(body.artifacts)) throw new Error('GitHub returned an invalid artifact inventory.');
  artifactList.push(...body.artifacts);
  if (body.artifacts.length < 100) { complete = true; break; }
}
if (!complete) throw new Error('Artifact inventory exceeded the bounded scan; no upload permitted.');
const index = process.argv.indexOf('--directory');
const incoming = index >= 0 ? (await inspectEncryptedBackup(process.argv[index + 1])).reserved_artifact_bytes : MAX_ENCRYPTED_BACKUP_BYTES;
const result = validateArtifactBudget(artifactList, incoming);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `artifact_name=${result.artifact_name}\n`);
console.log(JSON.stringify({ ...result, account_allowance_verified_by_owner: true, note: 'The account-wide allowance is shared; the configured zero-overage budget is the final spending safeguard.' }));
