/** Encrypt a completed export with the official age CLI. No private decryption key is required. */
import { createHash } from 'node:crypto';
import { createReadStream, lstatSync, readdirSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync, chmodSync } from 'node:fs';
import { resolve, join, sep } from 'node:path';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { AGE_VERSION, MAX_BACKUP_SOURCE_BYTES, MAX_ENCRYPTED_BACKUP_BYTES, validateAgeRecipient } from './backup-policy.ts';

const sourceNames = ['database.dump', 'roles.sql', 'manifest.json'];
const cipherName = 'database-backup.tar.age';
const checksumName = 'SHA256SUMS';
const maximumCipherBytes = MAX_ENCRYPTED_BACKUP_BYTES - 32 * 1024;
const artifactOverheadReserve = 16 * 1024;
async function sha256(path: string): Promise<string> {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  return digest.digest('hex');
}
function completed(process: ChildProcess, name: string): Promise<void> {
  // Child stderr is intentionally discarded; raw exports/connection details never enter workflow logs.
  process.stderr?.resume();
  return new Promise((resolvePromise, reject) => {
    process.once('error', () => reject(new Error(`${name} could not start.`)));
    process.once('close', code => code === 0 ? resolvePromise() : reject(new Error(`${name} failed; no encrypted backup is ready for upload.`)));
  });
}
export async function encryptBackup(options: { source: string; output: string; recipient: string; ageBinary?: string }) {
  const source = resolve(options.source);
  const output = resolve(options.output);
  const recipient = validateAgeRecipient(options.recipient);
  const ageBinary = options.ageBinary || 'age';
  if (output === source || output.startsWith(source + sep) || source.startsWith(output + sep)) throw new Error('Use separate source and encrypted-output directories.');
  let total = 0;
  for (const name of sourceNames) {
    const file = lstatSync(join(source, name));
    if (!file.isFile() || file.isSymbolicLink()) throw new Error('Only regular completed-export files can be encrypted.');
    total += file.size;
  }
  if (total < 1 || total > MAX_BACKUP_SOURCE_BYTES) throw new Error('The plaintext export exceeds the conservative 9 MiB source limit; nothing uploaded.');
  const manifest = JSON.parse(readFileSync(join(source, 'manifest.json'), 'utf8')) as { mode?: string; status?: string; files?: Record<string, string> };
  if (manifest.mode !== 'backup' || manifest.status !== 'exported_not_yet_restore_verified') throw new Error('Only a successfully completed database export can be encrypted.');
  for (const name of ['database.dump', 'roles.sql']) if (manifest.files?.[name] !== await sha256(join(source, name))) throw new Error('Source export checksum mismatch; nothing encrypted.');
  const version = spawnSync(ageBinary, ['--version'], { encoding: 'utf8', timeout: 10000 });
  if (version.error || version.status !== 0 || !new RegExp(`^v?${AGE_VERSION.replaceAll('.', '\\.')}\\s*$`).test(version.stdout)) throw new Error(`Use the verified official age ${AGE_VERSION} executable.`);
  mkdirSync(output, { mode: 0o700 }); // Atomic refusal to overwrite an existing destination.
  const partial = join(output, `${cipherName}.partial`);
  const tar = spawn('tar', ['-cf', '-', '-C', source, ...sourceNames], { stdio: ['ignore', 'pipe', 'pipe'] });
  const age = spawn(ageBinary, ['--encrypt', '--recipient', recipient, '--output', partial], { stdio: ['pipe', 'ignore', 'pipe'] });
  const operations = [completed(tar, 'Archive creation'), completed(age, 'age encryption'), pipeline(tar.stdout!, age.stdin!)];
  try {
    await Promise.all(operations);
    if (statSync(partial).size > maximumCipherBytes) throw new Error('The encrypted backup exceeds its free-storage size ceiling; nothing uploaded.');
    chmodSync(partial, 0o600);
    const final = join(output, cipherName);
    renameSync(partial, final);
    writeFileSync(join(output, checksumName), `${await sha256(final)}  ${cipherName}\n`, { mode: 0o600 });
    return await inspectEncryptedBackup(output);
  } catch (error) {
    tar.kill(); age.kill();
    await Promise.allSettled(operations);
    rmSync(output, { recursive: true, force: true });
    throw error;
  }
}
export async function inspectEncryptedBackup(directory: string) {
  const path = resolve(directory);
  if (JSON.stringify(readdirSync(path).sort()) !== JSON.stringify([cipherName, checksumName].sort())) throw new Error('The upload directory must contain ciphertext and its checksum only.');
  let bytes = 0;
  for (const name of [cipherName, checksumName]) {
    const file = lstatSync(join(path, name));
    if (!file.isFile() || file.isSymbolicLink()) throw new Error('Only regular ciphertext and checksum files may be uploaded.');
    bytes += file.size;
  }
  const expected = readFileSync(join(path, checksumName), 'utf8');
  if (expected !== `${await sha256(join(path, cipherName))}  ${cipherName}\n`) throw new Error('Encrypted backup checksum mismatch; refusing upload.');
  if (statSync(join(path, cipherName)).size < 1 || bytes + artifactOverheadReserve > MAX_ENCRYPTED_BACKUP_BYTES) throw new Error('Encrypted artifact exceeds the 10 MiB ceiling or is empty.');
  return { directory: path, payload_bytes: bytes, reserved_artifact_bytes: bytes + artifactOverheadReserve, cipher_file: join(path, cipherName), checksum_file: join(path, checksumName) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const value = (flag: string) => process.argv.includes(flag) ? process.argv[process.argv.indexOf(flag) + 1] : undefined;
  const source = value('--source'); const output = value('--output');
  if (!source || !output) throw new Error('Usage: node scripts/encrypt-backup.ts --source /completed/export --output /new/encrypted-directory');
  console.log(JSON.stringify(await encryptBackup({ source, output, recipient: process.env.AGE_BACKUP_RECIPIENT ?? '', ageBinary: process.env.EVG_AGE_BINARY })));
}
