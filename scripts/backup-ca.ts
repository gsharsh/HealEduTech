/** Public Supabase CA from the signed-in project's Download certificate link; never a private key. */
import { createHash, X509Certificate } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const SUPABASE_CA = {
  source: 'https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt',
  file_sha256: '700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7',
  certificate_der_sha256: '807025AD50D4ED219D2C9C7D299C004F824EB00CF7F65AFEF607D07B72E6CAFA',
};
const bundledPath = fileURLToPath(new URL('../supabase/certificates/prod-ca-2021.crt', import.meta.url));

export function verifiedSupabaseCA(path = bundledPath, at = new Date()) {
  const contents = readFileSync(path);
  if (/PRIVATE KEY/.test(contents.toString('utf8'))) throw new Error('The backup trust file must contain a public CA certificate only.');
  if (createHash('sha256').update(contents).digest('hex') !== SUPABASE_CA.file_sha256) throw new Error('Bundled Supabase CA file checksum mismatch; no connection attempted.');
  const certificate = new X509Certificate(contents);
  if (!certificate.ca || certificate.fingerprint256.replaceAll(':', '') !== SUPABASE_CA.certificate_der_sha256) throw new Error('Bundled Supabase CA identity mismatch; no connection attempted.');
  const now = at.getTime();
  if (!Number.isFinite(now) || now < Date.parse(certificate.validFrom) || now >= Date.parse(certificate.validTo)) throw new Error('Bundled Supabase CA is outside its validity period; obtain and review the current official provider CA.');
  return { path, ...SUPABASE_CA, valid_from: certificate.validFrom, valid_to: certificate.validTo };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(verifiedSupabaseCA()));
