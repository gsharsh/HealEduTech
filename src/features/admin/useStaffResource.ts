import { useEffect, useState } from 'react';
import { useAccount } from '../auth/context';

/** Keep results tied to both the request and staff session, including during account changes. */
export function useStaffResource<T>(key: string, load: (signal: AbortSignal) => Promise<T>) {
  const { user, staffRole, accessStatus } = useAccount();
  const requestKey = user && staffRole && accessStatus === 'ready' ? `${user.id}:${staffRole}:${key}` : null;
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; data: T | null; loading: boolean; error: boolean } | null>(null);

  useEffect(() => {
    if (!requestKey) return;
    let active = true;
    let controller: AbortController | undefined;
    const refresh = () => {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      setResult(previous => ({ key: requestKey, data: previous?.key === requestKey ? previous.data : null, loading: true, error: false }));
      void load(signal).then(data => {
        if (active && !signal.aborted) setResult({ key: requestKey, data, loading: false, error: false });
      }).catch(() => {
        if (active && !signal.aborted) setResult({ key: requestKey, data: null, loading: false, error: true });
      });
    };
    const refreshVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('staff-data-changed', refresh);
    document.addEventListener('visibilitychange', refreshVisible);
    return () => {
      active = false;
      controller?.abort();
      window.removeEventListener('focus', refresh);
      window.removeEventListener('staff-data-changed', refresh);
      document.removeEventListener('visibilitychange', refreshVisible);
    };
  }, [requestKey, load, revision]);

  const current = requestKey !== null && result?.key === requestKey ? result : null;
  return { data: current?.data ?? null, loading: current?.loading ?? true, error: current?.error ?? false, reload: () => setRevision(value => value + 1) };
}
