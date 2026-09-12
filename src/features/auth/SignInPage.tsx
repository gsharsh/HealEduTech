import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authRedirectUrl, supabase } from '../../lib/supabase';
import { useAccount } from './context';
import { authCallbackErrorFromUrl, authErrorKey, validEmail, validPassword } from './validation';

type Mode = 'register' | 'password' | 'magic-link';
type PendingEmail = { email: string; signup: boolean };

export function SignInPage() {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAccount();
  const [mode, setMode] = useState<Mode>('register');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState<PendingEmail | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState(() => authCallbackErrorFromUrl(window.location.href) ?? '');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (authCallbackErrorFromUrl(window.location.href)) window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  function resetForm(nextMode: Mode) {
    setMode(nextMode);
    setPending(null);
    setError('');
    setPassword('');
    setConfirmation('');
    setCooldown(0);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || busy || pending) return;
    setError('');
    const address = email.trim();
    if (!validEmail(address)) { setError('auth.invalidEmail'); return; }
    if (mode === 'register') {
      if (!name.trim() || name.trim().length > 80) { setError('auth.invalidName'); return; }
      if (!validPassword(password)) { setError('auth.passwordHelp'); return; }
      if (password !== confirmation) { setError('auth.passwordMismatch'); return; }
    }
    if (mode === 'password' && !password) { setError('auth.invalidCredentials'); return; }
    setBusy(true);
    try {
      if (mode === 'register') {
        const result = await supabase.auth.signUp({ email: address, password, options: {
          emailRedirectTo: authRedirectUrl(),
          data: { display_name: name.trim(), preferred_language: i18n.language === 'vi' ? 'vi' : 'en' },
        } });
        if (result.error) throw result.error;
        setPassword(''); setConfirmation('');
        if (!result.data.session) { setPending({ email: address, signup: true }); setCooldown(60); }
      } else if (mode === 'password') {
        const result = await supabase.auth.signInWithPassword({ email: address, password });
        if (result.error) throw result.error;
        setPassword('');
      } else {
        const result = await supabase.auth.signInWithOtp({ email: address, options: {
          shouldCreateUser: false,
          emailRedirectTo: authRedirectUrl(),
        } });
        if (result.error) throw result.error;
        setPending({ email: address, signup: false }); setCooldown(60);
      }
    } catch (failure) { setError(authErrorKey(failure as { code?: string; status?: number })); }
    finally { setBusy(false); }
  }

  async function resend() {
    if (!supabase || !pending || cooldown || busy) return;
    setBusy(true); setError('');
    try {
      const result = pending.signup
        ? await supabase.auth.resend({ type: 'signup', email: pending.email, options: { emailRedirectTo: authRedirectUrl() } })
        : await supabase.auth.signInWithOtp({ email: pending.email, options: { shouldCreateUser: false, emailRedirectTo: authRedirectUrl() } });
      if (result.error) throw result.error;
      setCooldown(60);
    } catch (failure) { setError(authErrorKey(failure as { code?: string; status?: number })); }
    finally { setBusy(false); }
  }

  async function signOut() {
    if (!supabase) return;
    setBusy(true); setError('');
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
      if (signOutError) throw signOutError;
    } catch { setError('auth.failed'); }
    finally { setBusy(false); }
  }

  return <main className="sign-in-page"><section className="sign-in-card account-card">
    <span className="brand-mark">e.</span><span className="eyebrow">EVG VIETNAM</span>
    <h1>{t(user ? 'auth.signedIn' : pending ? 'auth.verifyTitle' : 'auth.title')}</h1>
    {loading ? <p role="status">{t('auth.loading')}</p> : user ? <>
      <p>{user.email}</p><Link className="primary" to="/library">{t('library')}</Link>
      <Link className="secondary" to="/admin">{t('staff')}</Link>
      <button className="secondary" disabled={busy} onClick={() => void signOut()}>{t('auth.signOut')}</button>
      <p className="muted">{t('auth.sharedDevice')}</p>
    </> : !supabase ? <p role="status">{t('auth.notConfigured')}</p> : <>
      {!pending && <div className="account-tabs" aria-label={t('auth.methods')}>
        {(['register', 'password', 'magic-link'] as const).map(value => <button key={value} type="button" aria-pressed={mode === value} disabled={busy}
          onClick={() => resetForm(value)}>{t(`auth.${value}`)}</button>)}
      </div>}
      {pending ? <div className="email-link-panel" role="status">
        <p>{t('auth.checkEmail', { email: pending.email })}</p>
        <p className="muted">{t('auth.linkHelp')}</p>
      </div> : <form className="data-form" onSubmit={event => void submit(event)} noValidate><fieldset disabled={busy}>
        {mode === 'register' && <label>{t('auth.name')}<input value={name} onChange={event => setName(event.target.value)} autoComplete="nickname" maxLength={80} required /></label>}
        <label>{t('auth.email')}<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" maxLength={254} required /></label>
        {mode === 'password' || mode === 'register' ? <>
          <label>{t('auth.passwordLabel')}<input type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} maxLength={128} required aria-describedby={mode === 'register' ? 'password-help' : undefined} /></label>
          {mode === 'register' && <>
            <p className="muted" id="password-help">{t('auth.passwordHelp')}</p>
            <label>{t('auth.confirmPassword')}<input type={showPassword ? 'text' : 'password'} value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="new-password" maxLength={128} required /></label>
          </>}
          <label className="checkbox-label"><input type="checkbox" checked={showPassword} onChange={event => setShowPassword(event.target.checked)} />{t('auth.showPassword')}</label>
        </> : <p className="muted">{t('auth.magicLinkHelp')}</p>}
        <button className="primary" type="submit">{t(busy ? 'auth.working' : mode === 'register' ? 'auth.create' : mode === 'password' ? 'auth.signIn' : 'auth.sendLink')}</button>
      </fieldset></form>}
      {pending && <div className="form-actions">
        <button className="secondary" disabled={busy || cooldown > 0} onClick={() => void resend()}>{cooldown > 0 ? t('auth.resendAfter', { seconds: cooldown }) : t('auth.resend')}</button>
        <button className="secondary" disabled={busy} onClick={() => resetForm(mode)}>{t('auth.back')}</button>
      </div>}
    </>}
    {error && <p role="alert" className="form-error">{t(error)}</p>}
    <Link className="text-link" to="/learning">{t('auth.browse')}</Link>
    <button className="language-button" onClick={() => void i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')}>{i18n.language === 'vi' ? 'English' : 'Tiếng Việt'}</button>
  </section></main>;
}
