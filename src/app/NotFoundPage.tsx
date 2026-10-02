import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import './not-found.css';

export function NotFoundPage() {
  const { i18n } = useTranslation();
  const copy = i18n.language === 'vi'
    ? { kicker: 'KHÔNG TÌM THẤY TRANG', title: 'Mình chưa thấy trang này.', body: 'Đường dẫn có thể đã thay đổi. Em có thể quay về trang chủ hoặc mở thư viện để bắt đầu lại.', home: 'Về trang chủ', library: 'Mở thư viện' }
    : { kicker: 'PAGE NOT FOUND', title: 'We could not find that page.', body: 'The link may have changed. You can return home or open the library to start again.', home: 'Back to home', library: 'Open the library' };
  return <section className="not-found" aria-labelledby="not-found-title"><span className="eyebrow">{copy.kicker}</span><h1 id="not-found-title">{copy.title}</h1><p>{copy.body}</p><div className="not-found__actions"><Link className="primary" to="/">{copy.home}</Link><Link className="secondary" to="/library">{copy.library}</Link></div></section>;
}
