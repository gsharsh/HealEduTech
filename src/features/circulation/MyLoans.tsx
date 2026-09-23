import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccount } from '../auth/context';
import { getCirculationPolicy, listLoans, type Loan } from './data';
import { activeLoanStatus, dateInTimeZone } from './validation';
import './translations';
import './circulation.css';

export function MyLoans() {
  const { t, i18n } = useTranslation();
  const { user } = useAccount();
  const [state, setState] = useState<{ userId: string | null; loans: Loan[]; timezone: string; loading: boolean; error: boolean }>({ userId: null, loans: [], timezone: 'Asia/Ho_Chi_Minh', loading: false, error: false });
  const [retryKey, setRetryKey] = useState(0);
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    let active = true;
    void Promise.all([listLoans('own', { userId, signal: controller.signal }), getCirculationPolicy()])
      .then(([nextLoans, policy]) => { if (active) setState({ userId, loans: nextLoans, timezone: policy.timezone, loading: false, error: false }); })
      .catch(error => {
        if (active && error?.name !== 'AbortError') setState({ userId, loans: [], timezone: 'Asia/Ho_Chi_Minh', loading: false, error: true });
      })
    return () => {
      active = false;
      controller.abort();
    };
  }, [userId, retryKey]);
  if (!user) return null;
  const keyedState = state.userId === user.id ? state : { userId: user.id, loans: [], timezone: 'Asia/Ho_Chi_Minh', loading: true, error: false };
  const dateFormatter = new Intl.DateTimeFormat(i18n.language === 'vi' ? 'vi-VN' : 'en-SG', { dateStyle: 'medium' });
  const formatDate = (value: string) => dateFormatter.format(new Date(`${value}T00:00:00`));
  const centreToday = dateInTimeZone(new Date(), keyedState.timezone);
  function statusKey(loan: Loan) {
    if (!loan.resolved_at) return `circulation.${activeLoanStatus(loan.due_date, centreToday)}`;
    if (loan.resolution === 'lost') return 'circulation.resolvedLost';
    if (loan.return_condition === 'damaged') return 'circulation.resolvedDamaged';
    return 'circulation.resolvedUsable';
  }
  return <section className="circulation-card"><h2>{t('circulation.ownTitle')}</h2><p className="circulation-muted">{t('circulation.ownBody')}</p>{keyedState.loading ? <p role="status">{t('circulation.loading')}</p> : keyedState.error ? <div role="alert"><p>{t('circulation.failed')}</p><button className="secondary" type="button" onClick={() => { setState(value => ({ ...value, error: false, loading: true })); setRetryKey(value => value + 1); }}>{t('circulation.retry')}</button></div> : keyedState.loans.length === 0 ? <p>{t('circulation.ownEmpty')}</p> : <ul>{keyedState.loans.map(loan => {
    const loanStatusKey = statusKey(loan);
    const title = loan.book_copies?.books?.[i18n.language === 'vi' ? 'title_vi' : 'title_en'] ?? loan.book_copies?.inventory_code ?? loan.copy_id;
    return <li key={loan.id}>{title} · {t('circulation.dueOn', { date: formatDate(loan.due_date) })} · <span className={loanStatusKey === 'circulation.overdue' ? 'loan-status loan-status--overdue' : 'loan-status'}>{t(loanStatusKey)}</span></li>;
  })}</ul>}</section>;
}
