import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { passwordResetRedirectUrl, supabase } from '../../lib/supabase';
import { useAccount } from '../auth/context';
import { InterestPicker } from '../learning/InterestPicker';
import '../learning/reading.css';
import { getCoverImageSources } from '../library/coverImages';
import { accountTranslations, type AccountCopy } from './accountTranslations';
import { loadAccountReading, type AccountReadingSummary } from './accountSummary';
import './account.css';

type AccountReading = Awaited<ReturnType<typeof loadAccountReading>>;
type FormStatus = 'idle' | 'saving' | 'saved' | 'error';

function metadataString(user: { user_metadata?: Record<string, unknown> }, key: string) {
  const value = user.user_metadata?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function formatDate(value: string | undefined, language: string) {
  if (!value || Number.isNaN(Date.parse(value))) return '—';
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', { dateStyle: 'medium' }).format(new Date(value));
}

function initials(name: string, email: string) {
  const source = name.trim() || email.split('@')[0] || '?';
  const letters = source.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('');
  return (letters || '?').toUpperCase();
}

function titleFor(book: { title_en: string; title_vi: string }, language: string) {
  return language === 'vi' ? book.title_vi : book.title_en;
}

function Cover({ url, title }: { url: string | null; title: string }) {
  const sources = url ? getCoverImageSources(url) : null;
  if (!sources) return <div className="account-reading-item__cover account-reading-item__cover--empty" role="img" aria-label={title}>✦</div>;
  return <img className="account-reading-item__cover" src={sources.src} srcSet={sources.srcSet} sizes="64px" loading="lazy" decoding="async" alt="" />;
}

function ReadingItem({ record, book, language, copy }: { record: AccountReading['records'][number]; book: AccountReading['books'][number] | undefined; language: string; copy: AccountCopy }) {
  const title = book ? titleFor(book, language) : copy.openBook;
  return <li className="account-reading-item">
    <Cover url={book?.cover_url ?? null} title={title} />
    <div className="account-reading-item__copy"><h3>{title}</h3>{book?.author && <p>{book.author}</p>}<p className="account-reading-item__meta">{copy.updated} {formatDate(record.updated_at, language)} · {copy.private}</p><Link className="account-reading-item__link" to={`/library/${encodeURIComponent(record.book_id)}`}>{copy.openBook}</Link></div>
  </li>;
}

function EmptyReading({ body, link, label }: { body: string; link: string; label: string }) {
  return <div className="account-empty"><p>{body}</p><Link className="secondary" to={link}>{label}</Link></div>;
}

function roleLabel(role: ReturnType<typeof useAccount>['accountRole'], copy: AccountCopy) {
  if (role === 'administrator') return copy.roleAdministrator;
  if (role === 'librarian') return copy.roleLibrarian;
  return role === 'student' ? copy.roleStudent : copy.rolePublic;
}

export function AccountPage() {
  const { t, i18n } = useTranslation();
  const { user, loading, accountRole, staffRole, accessStatus, clearRecovery } = useAccount();
  const navigate = useNavigate();
  const copy = accountTranslations[i18n.language === 'vi' ? 'vi' : 'en'];
  if (loading) return <p role="status">{copy.loading}</p>;
  if (!user) return <section className="account-empty"><h1>{copy.profile}</h1><p>{copy.signedOut}</p><Link className="primary" to="/sign-in?next=/account">{t('auth.signIn')}</Link></section>;
  return <AccountDashboard key={user.id} user={user} accountRole={accountRole} staffRole={staffRole} accessStatus={accessStatus} clearRecovery={clearRecovery} navigate={navigate} copy={copy} language={i18n.language === 'vi' ? 'vi' : 'en'} />;
}

function AccountDashboard({ user, accountRole, staffRole, accessStatus, clearRecovery, navigate, copy, language }: { user: NonNullable<ReturnType<typeof useAccount>['user']>; accountRole: ReturnType<typeof useAccount>['accountRole']; staffRole: ReturnType<typeof useAccount>['staffRole']; accessStatus: ReturnType<typeof useAccount>['accessStatus']; clearRecovery: () => void; navigate: ReturnType<typeof useNavigate>; copy: AccountCopy; language: 'en' | 'vi' }) {
  const { i18n } = useTranslation();
  const [reading, setReading] = useState<AccountReading | null>(null);
  const [readingState, setReadingState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [name, setName] = useState(metadataString(user, 'display_name'));
  const [savedDisplayName, setSavedDisplayName] = useState(metadataString(user, 'display_name'));
  const storedLanguage = metadataString(user, 'preferred_language');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'vi'>(storedLanguage === 'vi' || storedLanguage === 'en' ? storedLanguage : language);
  const [profileStatus, setProfileStatus] = useState<FormStatus>('idle');
  const [passwordStatus, setPasswordStatus] = useState<FormStatus>('idle');
  const [passwordCooldown, setPasswordCooldown] = useState(0);
  const [signOutBusy, setSignOutBusy] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [signOutError, setSignOutError] = useState('');
  const [historyCount, setHistoryCount] = useState(3);
  const mountedRef = useRef(true);
  const profileRequestRef = useRef(0);
  const passwordRequestRef = useRef(0);
  const signOutRequestRef = useRef(0);
  const booksById = useMemo(() => new Map((reading?.books ?? []).map(book => [book.id, book])), [reading?.books]);
  const finished = reading?.records.filter(record => record.status === 'finished') ?? [];
  const current = reading?.records.filter(record => record.status === 'currently_reading') ?? [];
  const displayName = savedDisplayName || user.email || copy.profile;
  const displayRole = accessStatus === 'ready' ? roleLabel(accountRole, copy) : copy.signedIn;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      profileRequestRef.current += 1;
      passwordRequestRef.current += 1;
      signOutRequestRef.current += 1;
    };
  }, []);
  useEffect(() => {
    if (!passwordCooldown) return;
    const timer = window.setTimeout(() => setPasswordCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [passwordCooldown]);

  useEffect(() => {
    const controller = new AbortController();
    void loadAccountReading(user.id, controller.signal).then(value => {
      if (!controller.signal.aborted) { setReading(value); setReadingState('ready'); }
    }).catch(() => { if (!controller.signal.aborted) setReadingState('failed'); });
    return () => controller.abort();
  }, [attempt, user.id]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length > 80) { setProfileStatus('error'); setProfileError(copy.invalidName); return; }
    if (!supabase || profileStatus === 'saving') return;
    const requestId = ++profileRequestRef.current;
    setProfileStatus('saving'); setProfileError('');
    try {
      const { error } = await supabase.auth.updateUser({ data: { display_name: trimmedName, preferred_language: preferredLanguage } });
      if (error) throw error;
      if (!mountedRef.current || requestId !== profileRequestRef.current) return;
      setName(trimmedName); setSavedDisplayName(trimmedName); setProfileStatus('saved');
      if (preferredLanguage !== i18n.language && mountedRef.current && requestId === profileRequestRef.current) await i18n.changeLanguage(preferredLanguage);
    } catch {
      if (mountedRef.current && requestId === profileRequestRef.current) { setProfileStatus('error'); setProfileError(copy.saveError); }
    }
  }

  async function sendPasswordReset() {
    if (!supabase || !user.email || passwordStatus === 'saving' || passwordCooldown > 0) return;
    const requestId = ++passwordRequestRef.current;
    setPasswordStatus('saving'); setPasswordError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: passwordResetRedirectUrl('/account') });
      if (error) throw error;
      if (!mountedRef.current || requestId !== passwordRequestRef.current) return;
      setPasswordStatus('saved'); setPasswordCooldown(30);
    } catch (failure) {
      if (!mountedRef.current || requestId !== passwordRequestRef.current) return;
      const details = failure as { code?: string; status?: number };
      const rateLimited = details.status === 429 || details.code?.toLowerCase().includes('rate');
      setPasswordStatus('error'); setPasswordError(rateLimited ? copy.resetRateLimit : copy.resetError);
    }
  }

  async function signOut() {
    if (!supabase || signOutBusy) return;
    const requestId = ++signOutRequestRef.current;
    setSignOutBusy(true);
    setSignOutError('');
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      if (!mountedRef.current || requestId !== signOutRequestRef.current) return;
      clearRecovery(); navigate('/sign-in', { replace: true });
    } catch {
      if (mountedRef.current && requestId === signOutRequestRef.current) { setSignOutBusy(false); setSignOutError(copy.signOutError); }
    }
  }

  function retryReading() {
    setReadingState('loading');
    setReading(null);
    setAttempt(value => value + 1);
  }

  const summary: AccountReadingSummary = reading ?? { records: [], finishedCount: 0, currentCount: 0, reviewCount: 0 };
  return <div className="account-page">
    <header className="account-page__heading"><div><span className="eyebrow">{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.intro}</p></div></header>
    <section className="account-identity" aria-label={copy.profile}><div className="account-identity__avatar" aria-hidden="true">{initials(displayName, user.email ?? '')}</div><div className="account-identity__copy"><h2>{displayName}</h2><p>{user.email}</p></div><span className="account-identity__role">{displayRole}</span></section>
    <nav className="account-section-nav" aria-label={copy.sectionNav}><a href="#account-reading-heading">{copy.reading}</a><a href="#account-profile-heading">{copy.profile}</a><a href="#account-preferences">{copy.preferences}</a><a href="#account-security-heading">{copy.security}</a><a href="#account-guide-heading">{copy.quickGuide}</a></nav>
    <section className="account-section" aria-labelledby="account-reading-heading"><div className="account-section__heading"><h2 id="account-reading-heading">{copy.reading}</h2><p>{copy.readingBody}</p></div>{readingState === 'loading' ? <div className="account-card" role="status"><p>{copy.loading}</p></div> : readingState === 'failed' ? <div className="account-card" role="alert"><p>{copy.loadError}</p><button className="secondary" type="button" onClick={retryReading}>{copy.retry}</button></div> : <><div className="account-stat-grid"><article className="account-stat"><span className="account-stat__value">{summary.finishedCount}</span><span className="account-stat__label">{copy.booksRead}</span><p className="account-stat__body">{copy.booksReadBody}</p></article><article className="account-stat"><span className="account-stat__value">{summary.currentCount}</span><span className="account-stat__label">{copy.current}</span><p className="account-stat__body">{copy.currentBody}</p></article><article className="account-stat"><span className="account-stat__value">{summary.reviewCount}</span><span className="account-stat__label">{copy.reviews}</span><p className="account-stat__body">{copy.reviewsBody}</p></article><article className="account-stat"><span className="account-stat__value">{copy.unavailable}</span><span className="account-stat__label">{copy.explore}</span><p className="account-stat__body">{copy.exploreUnavailable}</p></article></div><div className="account-reading-grid"><section className="account-card" aria-labelledby="account-current-heading"><div className="account-section__heading"><h2 id="account-current-heading">{copy.currentTitle}</h2></div>{current.length === 0 ? <EmptyReading body={copy.currentEmpty} link="/library" label={copy.browseLibrary} /> : <><ul className="account-list">{current.slice(0, 4).map(record => <ReadingItem key={record.book_id} record={record} book={booksById.get(record.book_id)} language={language} copy={copy} />)}</ul><Link className="secondary" to="/learning">{copy.openReading}</Link></>}</section><section className="account-card" aria-labelledby="account-history-heading"><div className="account-section__heading"><h2 id="account-history-heading">{copy.historyTitle}</h2></div>{finished.length === 0 ? <EmptyReading body={copy.historyEmpty} link="/library" label={copy.browseLibrary} /> : <><ul className="account-list">{finished.slice(0, historyCount).map(record => <ReadingItem key={record.book_id} record={record} book={booksById.get(record.book_id)} language={language} copy={copy} />)}</ul>{finished.length > historyCount && <button className="secondary" type="button" onClick={() => setHistoryCount(value => value + 6)}>{copy.historyMore}</button>}</>}</section></div></>}</section>
    <section className="account-section" aria-labelledby="account-profile-heading"><div className="account-section__heading"><h2 id="account-profile-heading">{copy.profile}</h2><p>{copy.profileBody}</p></div><form className="account-card account-profile-form" onSubmit={event => void saveProfile(event)}><fieldset disabled={profileStatus === 'saving'}><div className="account-profile-grid"><label htmlFor="account-name">{copy.name}<input id="account-name" value={name} maxLength={80} onChange={event => { setName(event.target.value); setProfileStatus('idle'); }} placeholder={copy.namePlaceholder} /></label><label htmlFor="account-email">{copy.email}<input id="account-email" value={user.email ?? ''} readOnly /><small>{user.email_confirmed_at ? copy.verified : copy.unverified}</small></label><label htmlFor="account-language">{copy.language}<select id="account-language" value={preferredLanguage} onChange={event => { setPreferredLanguage(event.target.value === 'vi' ? 'vi' : 'en'); setProfileStatus('idle'); }}><option value="en">{copy.english}</option><option value="vi">{copy.vietnamese}</option></select></label><div><label>{copy.memberSince}<input value={formatDate(user.created_at, language)} readOnly /></label><small>{copy.role}: {displayRole}</small></div></div><div className="account-profile-actions"><button className="primary" type="submit">{profileStatus === 'saving' ? copy.saving : copy.saveChanges}</button>{profileStatus === 'saved' && <p className="account-status account-status--success" role="status">{copy.saved}</p>}{profileStatus === 'error' && <p className="account-status account-status--error" role="alert">{profileError}</p>}</div></fieldset></form></section>
    <div id="account-preferences"><InterestPicker /></div>
    <section className="account-section" aria-labelledby="account-security-heading"><div className="account-section__heading"><h2 id="account-security-heading">{copy.security}</h2><p className="account-security__copy">{copy.securityBody}</p></div><div className="account-card account-security"><p className="account-security__copy">{copy.resetHelp}</p><div className="account-security__actions"><button className="secondary" type="button" disabled={passwordStatus === 'saving' || passwordCooldown > 0} onClick={() => void sendPasswordReset()}>{passwordStatus === 'saving' ? copy.sendingReset : passwordCooldown > 0 ? `${copy.resetPassword} (${passwordCooldown}s)` : copy.resetPassword}</button>{staffRole && accessStatus === 'ready' && <Link className="secondary" to="/staff">{copy.staffDesk}</Link>}<button className="secondary" type="button" disabled={signOutBusy} onClick={() => void signOut()}>{signOutBusy ? copy.saving : copy.signOut}</button></div>{passwordStatus === 'saved' && <p className="account-status account-status--success" role="status">{copy.resetSent}</p>}{passwordStatus === 'error' && <p className="account-status account-status--error" role="alert">{passwordError}</p>}{signOutError && <p className="account-status account-status--error" role="alert">{signOutError}</p>}</div></section>
    <section className="account-section account-card account-guide" aria-labelledby="account-guide-heading">
      <div className="account-section__heading"><h2 id="account-guide-heading">{copy.quickGuide}</h2><p>{copy.quickGuideBody}</p></div>
      <Link className="secondary" to="/start">{copy.openQuickGuide}</Link>
    </section>
  </div>;
}
