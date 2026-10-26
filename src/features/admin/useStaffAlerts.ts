import { useEffect, useState } from 'react';
import { useAccount } from '../auth/context';
import { getStaffAlertCount } from './staffData';

/** Tag each response with its access context so an account switch cannot paint old data. */
export function useStaffAlerts(routeKey = '') {
  const { user, staffRole, accessStatus } = useAccount();
  const key = user && staffRole && accessStatus === 'ready' ? `${user.id}:${staffRole}:${routeKey}` : '';
  const [result, setResult] = useState<{ key: string; count: number | null; error: boolean } | null>(null);
  useEffect(() => {
    if (!key) return;
    let controller: AbortController | undefined;
    const refresh = () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      void getStaffAlertCount(request.signal).then(count => {
        if (!request.signal.aborted) setResult({ key, count, error: false });
      }).catch(() => {
        if (!request.signal.aborted) setResult({ key, count: null, error: true });
      });
    };
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('staff-data-changed', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      controller?.abort();
      window.removeEventListener('focus', refresh);
      window.removeEventListener('staff-data-changed', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [key]);
  const current = key && result?.key === key ? result : null;
  return { count: current?.count ?? null, error: current?.error ?? false, loading: Boolean(key && !current) };
}
