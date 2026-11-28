import { useEffect, useState } from 'react';
import { useAccount } from '../auth/context';
import { getStaffAlertCount } from './staffData';
import { createRefreshGate } from '../../lib/readCache';

/** Tag each response with its access context so an account switch cannot paint old data. */
export function useStaffAlerts(_routeKey = '') {
  // Keep the existing hook API; navigation itself does not change loan counts.
  void _routeKey;
  const { user, staffRole, accessStatus } = useAccount();
  const key = user && staffRole && accessStatus === 'ready' ? `${user.id}:${staffRole}` : '';
  const [result, setResult] = useState<{ key: string; count: number | null; error: boolean } | null>(null);
  useEffect(() => {
    if (!key) return;
    let controller: AbortController | undefined;
    let pending = false;
    const allowRefresh = createRefreshGate(5_000);
    const fetchCount = (force: boolean) => {
      if ((!force && pending) || !allowRefresh(force)) return;
      controller?.abort();
      const request = new AbortController();
      controller = request;
      pending = true;
      void getStaffAlertCount(request.signal).then(count => {
        if (!request.signal.aborted) setResult({ key, count, error: false });
      }).catch(() => {
        if (!request.signal.aborted) setResult({ key, count: null, error: true });
      }).finally(() => { if (controller === request) pending = false; });
    };
    const refresh = () => fetchCount(true);
    const onVisible = () => { if (document.visibilityState === 'visible') fetchCount(false); };
    refresh();
    window.addEventListener('focus', onVisible);
    window.addEventListener('staff-data-changed', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      controller?.abort();
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('staff-data-changed', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [key]);
  const current = key && result?.key === key ? result : null;
  return { count: current?.count ?? null, error: current?.error ?? false, loading: Boolean(key && !current) };
}
