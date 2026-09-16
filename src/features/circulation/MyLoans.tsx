import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccount } from '../auth/context';
import { listLoans, type Loan } from './data';
import './translations';
import './circulation.css';

export function MyLoans() {
  const { t, i18n } = useTranslation();
  const { user } = useAccount();
  const [state, setState] = useState<{ userId: string | null; loans: Loan[]; loading: boolean; error: boolean }>({ userId: null, loans: [], loading: false, error: false });
  const [retryKey, setRetryKey] = useState(0);
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    let active = true;
    void listLoans('own', { userId, signal: controller.signal })
      .then(nextLoans => { if (active) setState({ userId, loans: nextLoans, loading: false, error: false }); })
      .catch(error => {
        if (active && error?.name !== 'AbortError') setState({ userId, loans: [], loading: false, error: true });
      })
    return () => {
      active = false;
      controller.abort();
    };
  }, [userId, retryKey]);
  if (!user) return null;
  const keyedState = state.userId === user.id ? state : { userId: user.id, loans: [], loading: true, error: false };
  const dateFormatter = new Intl.DateTimeFormat(i18n.language === 'vi' ? 'vi-VN' : 'en-SG', { dateStyle: 'medium' });
  const formatDate = (value: string) => dateFormatter.format(new Date(`${value}T00:00:00`));
  return <section className="circulation-card"><h2>{t('circulation.ownTitle')}</h2><p className="circulation-muted">{t('circulation.ownBody')}</p>{keyedState.loading ? <p role="status">{t('circulation.loading')}</p> : keyedState.error ? <div role="alert"><p>{t('circulation.failed')}</p><button className="secondary" type="button" onClick={() => { setState(value => ({ ...value, error: false, loading: true })); setRetryKey(value => value + 1); }}>{t('circulation.retry')}</button></div> : keyedState.loans.length === 0 ? <p>{t('circulation.ownEmpty')}</p> : <ul>{keyedState.loans.map(loan => <li key={loan.id}>{loan.book_copies?.books?.title_en ?? loan.book_copies?.inventory_code ?? loan.copy_id} · {t('circulation.dueOn', { date: formatDate(loan.due_date) })} · {loan.resolved_at ? t('circulation.resolved') : t('circulation.active')}</li>)}</ul>}</section>;
}
