/** Accept remote-only exports; never mistake a local-only CLI row for an applied migration. */
export function parseHostedMigrationVersions(content: string): Set<string> {
  const clean = content.trim();
  if (clean.startsWith('[')) {
    const rows: unknown = JSON.parse(clean);
    if (!Array.isArray(rows)) throw new Error('Expected a remote migration array.');
    return new Set(rows.map(row => {
      const version = typeof row === 'string' ? row : row && typeof row === 'object' && 'version' in row ? row.version : null;
      if (typeof version !== 'string' || !/^\d{14}$/.test(version)) throw new Error('Each exported migration must have a fourteen-digit remote version.');
      return version;
    }));
  }
  const lines = clean.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const headerIndex = lines.findIndex(line => /\blocal\b/i.test(line) && /\bremote\b/i.test(line) && line.includes('|'));
  if (headerIndex >= 0) {
    const columns = lines[headerIndex].split('|').map(value => value.trim().toLowerCase());
    const remoteIndex = columns.indexOf('remote');
    if (remoteIndex < 0) throw new Error('The CLI table must identify the Remote column.');
    const remote = lines.slice(headerIndex + 1).filter(line => line.includes('|') && !/^[\s\-+|:]+$/.test(line)).map(line => line.split('|')[remoteIndex]?.trim() ?? '').filter(Boolean);
    if (remote.some(version => !/^\d{14}$/.test(version))) throw new Error('Unrecognised Remote-column migration version.');
    return new Set(remote);
  }
  if (lines.some(version => !/^\d{14}$/.test(version))) throw new Error('Supply a JSON remote-version array, a Supabase CLI Local/Remote table, or one applied remote version per line.');
  return new Set(lines);
}
