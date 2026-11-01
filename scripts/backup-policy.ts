/** Conservative repository-local limits. Account-wide free-tier spending is confirmed separately. */
export const MAX_ENCRYPTED_BACKUP_BYTES = 10 * 1024 * 1024;
export const MAX_BACKUP_SOURCE_BYTES = 9 * 1024 * 1024;
export const MAX_REPOSITORY_ARTIFACT_BYTES = 200 * 1024 * 1024;
export const BACKUP_RETENTION_DAYS = 14;
export const AGE_VERSION = '1.3.2';
export const AGE_RELEASES = {
  'linux-x64': { asset: 'linux-amd64', sha256: 'cbe24006683f8eb669266162894b9a522a1af52f2665fbc63a4bb032ed26ac10' },
  'darwin-arm64': { asset: 'darwin-arm64', sha256: 'e2020b073c44f692685a24d6abc378817eb81ffaaf49fd0531ef8565f767f2f5' },
  'darwin-x64': { asset: 'darwin-amd64', sha256: '1d1e4bc66e1427edad7739ae7616157de0e79db8b6d2a1497d7d9925fb06a539' },
} as const;

export function backupArtifactName(date = new Date()): string {
  if (!Number.isFinite(date.getTime())) throw new Error('A valid backup date is required.');
  return `evg-db-backup-${date.toISOString().slice(0, 10)}`;
}
export function validateAgeRecipient(value: string | undefined): string {
  const recipient = value?.trim() ?? '';
  if (!/^age1[a-z0-9]{58}$/.test(recipient)) throw new Error('Configure one standard age public recipient in AGE_BACKUP_RECIPIENT; a private identity is never accepted.');
  return recipient;
}
export interface RepositoryArtifact { name: string; size_in_bytes: number; expired: boolean }
export function validateArtifactBudget(artifacts: RepositoryArtifact[], incomingBytes: number, date = new Date()) {
  if (!Number.isSafeInteger(incomingBytes) || incomingBytes < 1 || incomingBytes > MAX_ENCRYPTED_BACKUP_BYTES) throw new Error('The encrypted backup exceeds its 10 MiB ceiling or is empty.');
  let existingBytes = 0;
  let alreadyBackedUp = false;
  for (const artifact of artifacts) {
    if (typeof artifact.name !== 'string' || typeof artifact.expired !== 'boolean' || !Number.isSafeInteger(artifact.size_in_bytes) || artifact.size_in_bytes < 0) throw new Error('GitHub returned an invalid artifact inventory; refusing upload.');
    if (artifact.expired) continue;
    existingBytes += artifact.size_in_bytes;
    if (!Number.isSafeInteger(existingBytes)) throw new Error('Artifact inventory size overflow; refusing upload.');
    if (artifact.name === backupArtifactName(date)) alreadyBackedUp = true;
  }
  if (alreadyBackedUp) throw new Error('A successful backup artifact already exists for this UTC date; keep the original and try tomorrow.');
  if (existingBytes + incomingBytes > MAX_REPOSITORY_ARTIFACT_BYTES) throw new Error('Repository artifacts would exceed the 200 MiB ceiling; no backup uploaded.');
  return { existing_bytes: existingBytes, incoming_bytes: incomingBytes, maximum_bytes: MAX_REPOSITORY_ARTIFACT_BYTES, artifact_name: backupArtifactName(date) };
}
