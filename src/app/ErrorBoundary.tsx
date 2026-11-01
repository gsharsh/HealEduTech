import { Component, useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { reportClientError } from '../lib/errorReporting';
import './error-boundary.css';

function RecoveryScreen() {
  const { i18n } = useTranslation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  const vi = i18n.language === 'vi';
  const homeUrl = vi ? '/vi' : '/';
  return <div className="app-recovery">
    <header className="app-recovery__header"><a href={homeUrl} aria-label="EVG Learn & Grow">EVG</a><button className="secondary" type="button" onClick={() => void i18n.changeLanguage(vi ? 'en' : 'vi')} lang={vi ? 'en' : 'vi'}>{vi ? 'English' : 'Tiếng Việt'}</button></header>
    <main className="app-recovery__main" id="main-content">
      <section className="empty-state app-recovery__panel" role="alert" aria-labelledby="recovery-title">
        <span className="eyebrow">{vi ? 'Hãy thử lại' : 'Let’s try again'}</span>
        <h1 id="recovery-title" ref={headingRef} tabIndex={-1}>{vi ? 'Trang này chưa thể mở.' : 'This page couldn’t open.'}</h1>
        <p>{vi ? 'Hãy tải lại trang để thử lại. Nếu em đang lưu thay đổi, hãy kiểm tra trước khi gửi lại.' : 'Reload the page to try again. If you were saving a change, check its status before sending it again.'}</p>
        <div className="app-recovery__actions"><button className="primary" type="button" onClick={() => window.location.reload()}>{vi ? 'Tải lại trang' : 'Reload page'}</button><a className="secondary" href={homeUrl}>{vi ? 'Về trang chủ' : 'Go to Home'}</a></div>
        <p className="muted">{vi ? 'Nếu vẫn gặp lỗi, hãy nhờ nhân viên EVG hỗ trợ.' : 'If this keeps happening, ask EVG staff for help.'}</p>
      </section>
    </main>
  </div>;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch() { reportClientError('render_error'); }

  onPreloadError = (event: Event) => {
    event.preventDefault();
    reportClientError('chunk_load_error');
    this.setState({ failed: true });
  };

  componentDidMount() { window.addEventListener('vite:preloadError', this.onPreloadError); }
  componentWillUnmount() { window.removeEventListener('vite:preloadError', this.onPreloadError); }

  render() { return this.state.failed ? <RecoveryScreen /> : this.props.children; }
}
