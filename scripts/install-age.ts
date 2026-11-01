/** Install only the upstream age executables from a pinned, SHA-256-verified official release. */
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { AGE_RELEASES, AGE_VERSION } from './backup-policy.ts';

const index = process.argv.indexOf('--output');
if (index < 0 || !process.argv[index + 1]) throw new Error('Usage: node scripts/install-age.ts --output /existing-parent/new-tool-directory');
const destination = resolve(process.argv[index + 1]);
if (existsSync(destination)) throw new Error('Choose a new age tool directory.');
const release = AGE_RELEASES[`${process.platform}-${process.arch}` as keyof typeof AGE_RELEASES];
if (!release) throw new Error('This installer supports Linux x64 and macOS arm64/x64 only.');
const url = `https://github.com/FiloSottile/age/releases/download/v${AGE_VERSION}/age-v${AGE_VERSION}-${release.asset}.tar.gz`;
const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
if (!response.ok || !response.body) throw new Error('Official age release download failed.');
const chunks: Uint8Array[] = [];
let length = 0;
for await (const chunk of response.body) {
  length += chunk.length;
  if (length > 32 * 1024 * 1024) throw new Error('Official age archive exceeded the expected size bound.');
  chunks.push(chunk);
}
const archive = Buffer.concat(chunks);
if (createHash('sha256').update(archive).digest('hex') !== release.sha256) throw new Error('Official age archive checksum mismatch; no executable installed.');
mkdirSync(destination, { mode: 0o700 });
try {
  const archivePath = join(destination, 'verified-age.tar.gz');
  writeFileSync(archivePath, archive, { mode: 0o600 });
  const result = spawnSync('tar', ['-xzf', archivePath, '-C', destination, 'age/age', 'age/age-keygen'], { encoding: 'utf8', timeout: 30000 });
  if (result.error || result.status !== 0) throw new Error('Verified age executable extraction failed.');
  for (const executable of ['age', 'age-keygen']) chmodSync(join(destination, 'age', executable), 0o700);
  rmSync(archivePath);
  console.log(JSON.stringify({ version: AGE_VERSION, age: join(destination, 'age', 'age'), age_keygen: join(destination, 'age', 'age-keygen'), verified_sha256: release.sha256 }));
} catch (error) {
  rmSync(destination, { recursive: true, force: true });
  throw error;
}
