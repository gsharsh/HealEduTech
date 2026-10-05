import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authRedirectUrl, passwordResetRedirectUrl, supabase } from '../../lib/supabase';
import { useAccount } from './context';
import { authCallbackErrorFromUrl, authErrorField, authErrorKey, safeBrowseTarget, safeNextPath, validEmail, validPassword, type AuthField } from './validation';
import './auth.css';

type Mode = 'sign-in' | 'register' | 'recover' | 'reset' | 'magic-link';
type PendingEmail = { email: string; signup: boolean; recovery?: boolean };

export function SignInPage() {
  const { t, i18n } = useTranslation();
  const { user, loading, accessStatus, staffRole, recovery, clearRecovery } = useAccount();
  const location = useLocation();
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement>(null);
  const isResetPath = location.pathname === '/reset-password';
  const isRecoveryPath = new URLSearchParams(location.search).get('mode') === 'recovery';
  const next = useMemo(() => safeNextPath(new URLSearchParams(location.search).get('next')), [location.search]);
  const callbackNext = useMemo(() => new URLSearchParams(location.search).get('next'), [location.search]);
  const browseTarget = useMemo(() => safeBrowseTarget(new URLSearchParams(location.search).get('next')), [location.search]);
  const [mode, setMode] = useState<Mode>(isResetPath ? 'reset' : isRecoveryPath ? 'reset' : 'sign-in');
  const [email, setEmail] = useState(''); const [name, setName] = useState('');
  const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AuthField, string>>>({});
  const [pending, setPending] = useState<PendingEmail | null>(null); const [busy, setBusy] = useState(false); const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState(() => authCallbackErrorFromUrl(window.location.href) ?? ''); const [notice, setNotice] = useState(''); const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => { if (authCallbackErrorFromUrl(window.location.href)) window.history.replaceState({}, document.title, window.location.pathname); }, []);
  useEffect(() => { if (!cooldown) return; const timer = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000); return () => window.clearTimeout(timer); }, [cooldown]);
  useEffect(() => {
    if (busy) return;
    const order: AuthField[] = mode === 'register' ? ['name', 'email', 'password', 'confirmation'] : mode === 'reset' ? ['password', 'confirmation'] : ['email', 'password'];
    const firstInvalid = order.find(field => Boolean(fieldErrors[field]));
    if (!firstInvalid) return;
    const ids: Record<AuthField, string> = {
      name: 'display-name', email: 'auth-email',
      password: mode === 'sign-in' ? 'current-password' : 'new-password',
      confirmation: 'confirm-password',
    };
    document.getElementById(ids[firstInvalid])?.focus();
  }, [busy, fieldErrors, mode]);
  useEffect(() => {
    if (!recovery) return;
    const timer = window.setTimeout(() => { setMode('reset'); setPending(null); setError(''); setFieldErrors({}); setPassword(''); setConfirmation(''); setShowPassword(false); }, 0);
    return () => window.clearTimeout(timer);
  }, [recovery]);

  function changeMode(nextMode: Mode) {
    setMode(nextMode); setPending(null); setError(''); setFieldErrors({}); setNotice(''); setPassword(''); setConfirmation(''); setShowPassword(false); setCooldown(0);
    if (nextMode === 'reset') navigate('/reset-password', { replace: true }); else if (location.pathname === '/reset-password') navigate('/sign-in', { replace: true });
  }

  function reportFieldError(field: AuthField, key: string) {
    setFieldErrors(current => ({ ...current, [field]: key }));
    setError(key);
  }

  function clearFieldError(field: AuthField) {
    const current = fieldErrors[field];
    if (!current) return;
    setFieldErrors(errors => { const nextErrors = { ...errors }; delete nextErrors[field]; return nextErrors; });
    if (error === current) setError('');
  }

  function setAuthFailure(failure: unknown) {
    const authFailure = failure as { code?: string; status?: number };
    const key = authErrorKey(authFailure);
    const field = authErrorField(authFailure);
    const visibleField = field === 'name' ? mode === 'register' : field === 'email' ? mode !== 'reset' && !pending : field === 'password' ? ['sign-in', 'register', 'reset'].includes(mode) && !pending : false;
    if (field && visibleField) reportFieldError(field, key);
    else { setFieldErrors({}); setError(key); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); if (!supabase || busy || pending) return; setError(''); setNotice('');
    setFieldErrors({});
    const address = email.trim();
    if (mode !== 'reset' && !validEmail(address)) { reportFieldError('email', 'auth.invalidEmail'); return; }
    if (mode === 'register') { if (!name.trim() || name.trim().length > 80) { reportFieldError('name', 'auth.invalidName'); return; } if (!validPassword(password)) { reportFieldError('password', 'auth.passwordHelp'); return; } if (password !== confirmation) { reportFieldError('confirmation', 'auth.passwordMismatch'); return; } }
    if (mode === 'sign-in' && !password) { reportFieldError('password', 'auth.invalidCredentials'); return; }
    if (mode === 'reset') { if (!validPassword(password)) { reportFieldError('password', 'auth.passwordHelp'); return; } if (password !== confirmation) { reportFieldError('confirmation', 'auth.passwordMismatch'); return; }
    }
    setBusy(true);
    try {
      if (mode === 'register') {
        const result = await supabase.auth.signUp({ email: address, password, options: { emailRedirectTo: authRedirectUrl(callbackNext), data: { display_name: name.trim(), preferred_language: i18n.language === 'vi' ? 'vi' : 'en' } } });
        if (result.error) throw result.error; setPassword(''); setConfirmation('');
        if (!result.data.session) { setPending({ email: address, signup: true }); setCooldown(60); } else navigate(next, { replace: true });
      } else if (mode === 'sign-in') {
        const result = await supabase.auth.signInWithPassword({ email: address, password }); if (result.error) throw result.error; setPassword(''); navigate(next, { replace: true });
      } else if (mode === 'magic-link') {
        const result = await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: false, emailRedirectTo: authRedirectUrl(callbackNext) } }); if (result.error) throw result.error; setPending({ email: address, signup: false }); setCooldown(60);
      } else if (mode === 'recover') {
        const result = await supabase.auth.resetPasswordForEmail(address, { redirectTo: passwordResetRedirectUrl(callbackNext) }); if (result.error) throw result.error; setPending({ email: address, signup: false, recovery: true }); setCooldown(60);
      } else {
        if (!recovery) { setError('auth.invalidRecovery'); return; }
        const result = await supabase.auth.updateUser({ password }); if (result.error) throw result.error;
        clearRecovery();
        let signOutFailed = false;
        try { const signOutResult = await supabase.auth.signOut({ scope: 'local' }); signOutFailed = Boolean(signOutResult.error); }
        catch { signOutFailed = true; }
        changeMode('sign-in');
        setNotice(signOutFailed ? 'auth.passwordUpdatedSignOutFailed' : 'auth.passwordUpdated');
      }
    } catch (failure) { setAuthFailure(failure); } finally { setBusy(false); }
  }

  async function resend() {
    if (!supabase || !pending || cooldown || busy) return; setBusy(true); setError('');
    try {
      const result = pending.recovery ? await supabase.auth.resetPasswordForEmail(pending.email, { redirectTo: passwordResetRedirectUrl(callbackNext) }) : pending.signup ? await supabase.auth.resend({ type: 'signup', email: pending.email, options: { emailRedirectTo: authRedirectUrl(callbackNext) } }) : await supabase.auth.signInWithOtp({ email: pending.email, options: { shouldCreateUser: false, emailRedirectTo: authRedirectUrl(callbackNext) } });
      if (result.error) throw result.error; setCooldown(60);
    } catch (failure) { setAuthFailure(failure); } finally { setBusy(false); }
  }

  async function signOut() { if (!supabase) return; setBusy(true); setError(''); try { const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' }); if (signOutError) throw signOutError; clearRecovery(); } catch { setError('auth.failed'); } finally { setBusy(false); } }

  async function resendConfirmation() {
    if (!supabase || !email.trim() || cooldown || busy || !validEmail(email.trim())) { setError('auth.invalidEmail'); return; }
    setBusy(true); setError('');
    try { const result = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: authRedirectUrl(callbackNext) } }); if (result.error) throw result.error; setPending({ email: email.trim(), signup: true }); setCooldown(60); }
    catch (failure) { setAuthFailure(failure); } finally { setBusy(false); }
  }

  const title = mode === 'reset' ? 'auth.resetTitle' : user ? 'auth.signedIn' : pending ? (pending.recovery ? 'auth.recoverTitle' : 'auth.verifyTitle') : mode === 'recover' ? 'auth.recoverTitle' : mode === 'register' ? 'auth.registerTitle' : 'auth.signInTitle';
  const passwordDescriptions = [mode !== 'sign-in' ? 'password-help' : '', fieldErrors.password ? 'auth-password-error' : ''].filter(Boolean).join(' ') || undefined;
  if (!loading && !busy && user && !recovery && mode !== 'reset' && !callbackNext && !error && notice !== 'auth.passwordUpdatedSignOutFailed') return <Navigate to="/account" replace />;
  return <main ref={mainRef} tabIndex={-1} className="sign-in-page"><section className="sign-in-card account-card" aria-labelledby="auth-title">
    <span className="brand-mark" aria-hidden="true">e.</span><span className="eyebrow">EVG VIETNAM</span><h1 id="auth-title">{t(title)}</h1>{mode === 'sign-in' && !user && <p className="auth-subtitle">{t('auth.signInSubtitle')}</p>}
    {loading ? <p role="status">{t('auth.loading')}</p> : user && mode !== 'reset' ? <div className="signed-in-account"><p className="signed-in-account__email">{user.email}</p><div className="signed-in-account__actions"><Link className="primary signed-in-account__continue" to={next}>{t('auth.continue')}</Link>{accessStatus === 'loading' && <p className="muted signed-in-account__status" role="status">{t('access.checking')}</p>}<div className="signed-in-account__secondary-actions">{accessStatus === 'ready' && staffRole && <Link className="secondary" to="/staff">{t('access.openDesk')}</Link>}<button className="secondary" type="button" disabled={busy} onClick={() => void signOut()}>{t('auth.signOut')}</button></div></div><p className="muted auth-shared-device signed-in-account__note">{t('auth.sharedDevice')}</p></div> : !supabase ? <><p role="status">{t('auth.notConfigured')}</p><p className="muted auth-shared-device">{t('auth.sharedDevice')}</p></> : <>
      <p className="muted auth-shared-device">{t('auth.sharedDevice')}</p>
      {!pending && mode !== 'reset' && <nav className="account-tabs" aria-label={t('auth.methods')}><button type="button" aria-pressed={mode === 'sign-in'} disabled={busy} onClick={() => changeMode('sign-in')}>{t('auth.signIn')}</button><button type="button" aria-pressed={mode === 'register'} disabled={busy} onClick={() => changeMode('register')}>{t('auth.register')}</button></nav>}
      {pending ? <div className="email-link-panel" role="status"><p>{t(pending.recovery ? 'auth.recoverCheckEmail' : 'auth.checkEmail', { email: pending.email })}</p><p className="muted">{t('auth.linkHelp')}</p></div> : mode === 'reset' && !recovery ? <p role="status" className="form-error">{t('auth.invalidRecovery')}</p> : <form className="data-form" onSubmit={event => void submit(event)} noValidate><fieldset disabled={busy}>
        {mode === 'register' && <><label htmlFor="display-name">{t('auth.name')}<input id="display-name" name="name" value={name} onChange={event => { setName(event.target.value); clearFieldError('name'); }} autoComplete="name" maxLength={80} required aria-invalid={Boolean(fieldErrors.name) || undefined} aria-describedby={fieldErrors.name ? 'auth-name-error' : undefined} /></label>{fieldErrors.name && <p className="field-error" id="auth-name-error">{t(fieldErrors.name)}</p>}</>}
        {mode !== 'reset' && <><label htmlFor="auth-email">{t('auth.email')}<input id="auth-email" name="email" type="email" value={email} onChange={event => { setEmail(event.target.value); clearFieldError('email'); }} autoComplete="username" maxLength={254} required aria-invalid={Boolean(fieldErrors.email) || undefined} aria-describedby={fieldErrors.email ? 'auth-email-error' : undefined} /></label>{fieldErrors.email && <p className="field-error" id="auth-email-error">{t(fieldErrors.email)}</p>}</>}
        {mode === 'sign-in' || mode === 'register' || mode === 'reset' ? <><label htmlFor={mode === 'reset' || mode === 'register' ? 'new-password' : 'current-password'}>{t('auth.passwordLabel')}<input id={mode === 'reset' || mode === 'register' ? 'new-password' : 'current-password'} name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={event => { setPassword(event.target.value); clearFieldError('password'); }} autoComplete={mode === 'reset' || mode === 'register' ? 'new-password' : 'current-password'} maxLength={128} required aria-invalid={Boolean(fieldErrors.password) || undefined} aria-describedby={passwordDescriptions} /></label>{mode !== 'sign-in' && <p className="muted" id="password-help">{t('auth.passwordHelp')}</p>}{fieldErrors.password && <p className="field-error" id="auth-password-error">{t(fieldErrors.password)}</p>}{(mode === 'register' || mode === 'reset') && <><label htmlFor="confirm-password">{t('auth.confirmPassword')}<input id="confirm-password" name="password-confirmation" type={showPassword ? 'text' : 'password'} value={confirmation} onChange={event => { setConfirmation(event.target.value); clearFieldError('confirmation'); }} autoComplete="new-password" maxLength={128} required aria-invalid={Boolean(fieldErrors.confirmation) || undefined} aria-describedby={fieldErrors.confirmation ? 'auth-confirmation-error' : undefined} /></label>{fieldErrors.confirmation && <p className="field-error" id="auth-confirmation-error">{t(fieldErrors.confirmation)}</p>}</>}<label className="checkbox-label" htmlFor="show-password"><input id="show-password" name="show-password" type="checkbox" checked={showPassword} onChange={event => setShowPassword(event.target.checked)} />{t('auth.showPassword')}</label></> : <p className="muted">{t(mode === 'recover' ? 'auth.recoverHelp' : 'auth.magicLinkHelp')}</p>}
        <button className="primary" type="submit">{t(busy ? 'auth.working' : mode === 'register' ? 'auth.create' : mode === 'sign-in' ? 'auth.signIn' : mode === 'recover' ? 'auth.sendReset' : mode === 'reset' ? 'auth.updatePassword' : 'auth.sendLink')}</button>
      </fieldset></form>}
      {!pending && mode === 'sign-in' && <div className="auth-links"><button type="button" className="text-link" onClick={() => changeMode('recover')}>{t('auth.forgotPassword')}</button><button type="button" className="text-link" onClick={() => changeMode('magic-link')}>{t('auth.magicLink')}</button></div>}
      {mode === 'reset' && !pending && <button type="button" className="secondary" onClick={() => changeMode('sign-in')}>{t('auth.back')}</button>}
      {pending && <div className="form-actions"><button type="button" className="secondary" disabled={busy || cooldown > 0} onClick={() => void resend()}>{cooldown > 0 ? t('auth.resendAfter', { seconds: cooldown }) : t('auth.resend')}</button><button type="button" className="secondary" disabled={busy} onClick={() => changeMode(mode === 'recover' || mode === 'magic-link' ? 'sign-in' : 'register')}>{t('auth.back')}</button></div>}
    </>}
    <div className="auth-card-footer">{notice && <p role="status" className="form-success">{t(notice)}</p>}{error && <p role="alert" className="form-error">{t(error)}</p>}{error === 'auth.unconfirmed' && !pending && <button type="button" className="text-link" disabled={busy || cooldown > 0} onClick={() => void resendConfirmation()}>{t(cooldown > 0 ? 'auth.resendAfter' : 'auth.resendConfirmation', { seconds: cooldown })}</button>}<div className="auth-card-footer__links"><Link className="text-link" to={browseTarget}>{t('auth.browse')}</Link><button type="button" className="language-button" onClick={() => void i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')}>{i18n.language === 'vi' ? 'English' : 'Tiếng Việt'}</button></div></div>
  </section></main>;
}
