export function buildBookSearchFilter(value: string): string | null {
  const term = value.trim().replace(/[%,_\r\n]/g, ' ').trim();
  if (!term) return null;
  const escaped = term.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const pattern = `%${escaped}%`;
  return `title_en.ilike."${pattern}",title_vi.ilike."${pattern}",author.ilike."${pattern}"`;
}
