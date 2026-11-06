/** Map only known staff-operation failures; do not expose raw database details. */
export function staffAccessErrorKey(error: unknown): 'failed' | 'missingAccount' | 'lastAdministrator' | 'permission' {
  if (!error || typeof error !== 'object') return 'failed';
  const failure = error as { code?: unknown; message?: unknown };
  if (failure.code === '42501') return 'permission';
  if (failure.code === '23503') return 'missingAccount';
  if (failure.code === '55000' && failure.message === 'At least one administrator must remain') return 'lastAdministrator';
  return 'failed';
}
