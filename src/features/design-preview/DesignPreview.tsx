import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./design-preview.css";

type Language = "en" | "vi";
type Topic = "nature" | "stories" | "science";

type PreviewBook = {
  id: string;
  title: { en: string; vi: string };
  description: { en: string; vi: string };
  topic: Topic;
  color: string;
};

const sampleBooks: PreviewBook[] = [
  { id: "garden", title: { en: "A tiny seed, a big world", vi: "Hạt mầm nhỏ, thế giới lớn" }, description: { en: "Follow a seed from the soil to the sunlight. What could you grow near your home?", vi: "Theo chân hạt mầm từ lòng đất đến ánh nắng. Em có thể trồng gì gần nhà?" }, topic: "nature", color: "moss" },
  { id: "moon", title: { en: "Hello, night sky", vi: "Xin chào, bầu trời đêm" }, description: { en: "Meet the Moon and notice how the sky changes. Start with what you can see tonight.", vi: "Làm quen với Mặt Trăng và quan sát bầu trời thay đổi. Bắt đầu từ những gì em thấy tối nay." }, topic: "science", color: "ink" },
  { id: "river", title: { en: "Stories by the river", vi: "Chuyện bên dòng sông" }, description: { en: "Imagined adventures about friendship, kindness, and a river village.", vi: "Những chuyến phiêu lưu tưởng tượng về tình bạn, lòng tốt và một ngôi làng ven sông." }, topic: "stories", color: "coral" },
  { id: "ocean", title: { en: "Under the blue", vi: "Dưới làn nước xanh" }, description: { en: "Discover a world beneath the waves and small ways to care for our water.", vi: "Khám phá thế giới dưới những con sóng và những cách nhỏ để bảo vệ nguồn nước." }, topic: "nature", color: "water" },
  { id: "build", title: { en: "Little things we can build", vi: "Những thứ nhỏ ta có thể làm" }, description: { en: "Try a simple paper structure and explore how shapes help it stand.", vi: "Thử làm một mô hình bằng giấy và khám phá cách hình dạng giúp mô hình đứng vững." }, topic: "science", color: "sun" },
  { id: "friend", title: { en: "A place for everyone", vi: "Một nơi cho tất cả" }, description: { en: "A story about listening, making new friends, and finding where we belong.", vi: "Một câu chuyện về lắng nghe, kết bạn và tìm nơi mình thuộc về." }, topic: "stories", color: "plum" },
];

const topicLabels: Record<Topic, { en: string; vi: string }> = {
  nature: { en: "Nature", vi: "Thiên nhiên" },
  stories: { en: "Stories", vi: "Truyện" },
  science: { en: "How things work", vi: "Khoa học" },
};

const copy = {
    en: {
    library: "Library", reading: "My reading", help: "Help / Quick guide", browse: "Browse books", around: "Show me around", topics: "What would you like to read?", shelf: "A small shelf for a curious mind", sample: "Fictional sample book", choose: "Choose a book to begin", save: "Save to my reading", saved: "Saved for this demo", notes: "Reading notes", demo: "Design preview · sample data", original: "View original design", account: "Account", skip: "Skip guide", back: "Back", continue: "Continue in this demo", accountIntro: "This preview saves temporarily in memory and clears on reload. No email or password is needed here.", readingEmpty: "Choose a book and your saved reading will appear here.", noResults: "No sample books match that search yet.", find: "Find a book", topic: "Topic", all: "All topics", startTitle: "Start with a small question", startBody: "Pick a topic, then browse at your own pace. You can skip this guide whenever you like.", guideTitle: "A gentle way to begin", guideBody: "There is no sign-up wall. Pick a book first, then decide whether saving notes is useful.", artwork: "Artwork sample",
  },
    vi: {
    library: "Thư viện", reading: "Sách của em", help: "Trợ giúp / Hướng dẫn", browse: "Xem sách", around: "Xem hướng dẫn", topics: "Em muốn đọc gì?", shelf: "Một kệ sách nhỏ cho tâm trí tò mò", sample: "Sách mẫu hư cấu", choose: "Chọn một cuốn sách để bắt đầu", save: "Lưu vào bài đọc", saved: "Đã lưu trong bản mẫu", notes: "Ghi chú đọc sách", demo: "Bản xem trước · dữ liệu mẫu", original: "Xem thiết kế gốc", account: "Tài khoản", skip: "Bỏ qua hướng dẫn", back: "Quay lại", continue: "Tiếp tục trong bản mẫu", accountIntro: "Bản xem trước chỉ lưu tạm trong bộ nhớ và sẽ xoá khi tải lại. Ở đây không cần email hay mật khẩu.", readingEmpty: "Chọn một cuốn sách để xem bài đọc đã lưu.", noResults: "Chưa có sách mẫu phù hợp.", find: "Tìm sách", topic: "Chủ đề", all: "Tất cả chủ đề", startTitle: "Bắt đầu bằng một câu hỏi nhỏ", startBody: "Chọn một chủ đề rồi xem sách theo cách của em. Em có thể bỏ qua hướng dẫn.", guideTitle: "Một cách bắt đầu nhẹ nhàng", guideBody: "Không cần đăng ký trước. Hãy chọn sách, rồi quyết định có muốn lưu ghi chú không.", artwork: "Mẫu minh hoạ",
  },
};

function usePreviewLanguage() {
  const [language, setLanguage] = useState<Language>("en");
  return { language, setLanguage, t: copy[language] };
}

function Cover({ book, large = false }: { book: PreviewBook; large?: boolean }) {
  return <div className={`ad-cover ad-cover--${book.color} ${large ? "ad-cover--large" : ""}`} aria-label={`${book.title.en} fictional sample cover artwork`}>
    <span className="ad-cover-mark" aria-hidden="true"><i /><i /><i /></span>
    <span className="ad-cover-kicker" lang="en">EVG · fictional sample</span>
    <strong lang="en">{book.title.en}</strong>
    <span className="ad-cover-rule" />
    <span className="ad-cover-topic" lang="en">{topicLabels[book.topic].en}</span>
  </div>;
}

function Header({ language, setLanguage, t }: { language: Language; setLanguage: (value: Language) => void; t: typeof copy.en }) {
  const location = useLocation();
  const active = location.pathname.includes("reading") ? "reading" : location.pathname.includes("library") || location.pathname.includes("book") ? "library" : "home";
  return <header className="ad-header">
    <Link className="ad-brand" to="/design-preview" aria-label={language === 'en' ? 'EVG home' : 'Trang chủ EVG'}><span>EVG</span></Link>
    <nav className="ad-nav" aria-label={language === 'en' ? 'Main navigation' : 'Điều hướng chính'}>
      <Link aria-current={active === 'home' ? 'page' : undefined} className={active === "home" ? "is-active" : ""} to="/design-preview">{language === 'en' ? 'Home' : 'Trang chủ'}</Link>
      <Link aria-current={active === 'library' ? 'page' : undefined} className={active === "library" ? "is-active" : ""} to="/design-preview/library">{t.library}</Link>
      <Link aria-current={active === 'reading' ? 'page' : undefined} className={active === "reading" ? "is-active" : ""} to="/design-preview/reading">{t.reading}</Link>
    </nav>
    <div className="ad-header-actions"><Link className="ad-help-link" to="/design-preview/start">{t.help}</Link><Link className="ad-account-link" to="/design-preview/account">{t.account}</Link><label className="ad-language"><span className="ad-sr-only">{language === "en" ? "Language" : "Ngôn ngữ"}</span><select value={language} onChange={(event) => setLanguage(event.target.value as Language)}><option value="en">EN</option><option value="vi">VI</option></select></label></div>
  </header>;
}

function Ribbon({ t }: { t: typeof copy.en }) {
  return <div className="ad-ribbon"><span>{t.demo}</span><a href="https://heal-edu-tech.vercel.app/learning" target="_blank" rel="noopener noreferrer">{t.original} ↗</a></div>;
}

function BookCard({ book, language, t }: { book: PreviewBook; language: Language; t: typeof copy.en }) {
  const location = useLocation();
  return <article className="ad-book-card"><Link to={`/design-preview/book/${book.id}${location.search}`}><div aria-hidden="true"><Cover book={book} /></div><div className="ad-book-card-copy"><span className="ad-eyebrow">{topicLabels[book.topic][language]}</span><h3>{book.title[language]}</h3><p>{t.sample}</p></div></Link></article>;
}

export function DesignPreview() {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage, t } = usePreviewLanguage();
  const tr = (en: string, vi: string) => language === 'en' ? en : vi;
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previousLang = document.documentElement.lang;
    document.documentElement.lang = language;
    return () => { document.documentElement.lang = previousLang; };
  }, [language]);
  useEffect(() => { mainRef.current?.focus({ preventScroll: true }); window.scrollTo(0, 0); }, [location.pathname]);
  const [query, setQuery] = useState("");
  const topicParam = new URLSearchParams(location.search).get("topic");
  const activeTopic: Topic | "all" = topicParam === "nature" || topicParam === "stories" || topicParam === "science" ? topicParam : "all";
  const [savedId, setSavedId] = useState<string | null>(null);
  const [demoAccount, setDemoAccount] = useState(false);
  const [note, setNote] = useState("");
  const path = location.pathname.replace(/^\/design-preview\/?/, "");
  const bookId = path.startsWith("book/") ? path.slice(5) : "";
  const pendingBookId = new URLSearchParams(location.search).get("book");
  const selectedBook = sampleBooks.find((book) => book.id === bookId);
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().trim();
  const filteredBooks = useMemo(() => sampleBooks.filter((book) => (activeTopic === "all" || book.topic === activeTopic) && normalize(`${book.title.en} ${book.title.vi}`).includes(normalize(query))), [query, activeTopic]);
  function saveSample(id: string) {
    if (id !== savedId) setNote('');
    setSavedId(id);
    navigate('/design-preview/reading');
  }

  const home = <>
    <section className="ad-hero ad-container"><div className="ad-hero-copy"><span className="ad-eyebrow">{tr('EVG reading room', 'Góc đọc sách EVG')}</span><h1>{tr('A good book.', 'Một cuốn sách hay.')}<br /><em>{tr('A new idea.', 'Một ý tưởng mới.')}</em></h1><p>{tr('Find a book, explore something new, and keep notes as you read.', 'Tìm sách, khám phá điều mới và ghi lại suy nghĩ khi đọc.')}</p><div className="ad-actions"><Link className="ad-button ad-button--primary" to="/design-preview/library">{t.browse}</Link><Link className="ad-button ad-button--secondary" to="/design-preview/start">{t.around}</Link></div></div><div className="ad-hero-art"><div className="ad-art-label">{t.artwork}</div><div className="ad-book-trio" aria-hidden="true">{sampleBooks.slice(0, 3).map((book, index) => <div className={`ad-trio-book ad-trio-book--${index}`} key={book.id}><Cover book={book} large /></div>)}</div><span className="ad-art-caption">{tr('Illustrated sample books · design concept', 'Sách minh hoạ mẫu · ý tưởng thiết kế')}</span></div></section>
    <section className="ad-section ad-container"><div className="ad-section-heading"><div><span className="ad-eyebrow">{tr('Follow your curiosity', 'Khám phá điều em thích')}</span><h2>{t.topics}</h2></div><Link to="/design-preview/library">{t.library} →</Link></div><div className="ad-topic-grid">{(Object.keys(topicLabels) as Topic[]).map((item) => <Link className={`ad-topic ad-topic--${item}`} to={`/design-preview/library?topic=${item}`} key={item}><span className="ad-topic-line" aria-hidden="true" /><strong>{topicLabels[item][language]}</strong><span>{tr('Explore ', 'Khám phá ')}{topicLabels[item][language].toLowerCase()}</span></Link>)}</div></section>
    <section className="ad-section ad-container ad-shelf-section"><div className="ad-section-heading"><div><span className="ad-eyebrow">{t.sample}</span><h2>{t.shelf}</h2></div><Link to="/design-preview/library">{tr('See all books', 'Xem tất cả sách')} →</Link></div><div className="ad-book-grid">{sampleBooks.slice(0, 4).map((book) => <BookCard book={book} language={language} t={t} key={book.id} />)}</div></section>
  </>;

  const library = <section className="ad-page ad-container"><div className="ad-page-heading"><div><span className="ad-eyebrow">{t.sample}</span><h1>{t.choose}</h1><p>{tr('These fictional books let you try the design. They are not the live catalogue.', 'Các cuốn sách hư cấu này giúp em thử thiết kế, không phải danh mục sách thật.')}</p></div><Link className="ad-text-link" to="/design-preview/start">{t.help} →</Link></div><div className="ad-library-tools"><label className="ad-search"><span className="ad-sr-only">{t.find}</span><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.find} /></label><label className="ad-topic-select"><span>{t.topic}</span><select value={activeTopic} onChange={(event) => navigate(`/design-preview/library${event.target.value === "all" ? "" : `?topic=${event.target.value}`}`)}><option value="all">{t.all}</option>{(Object.keys(topicLabels) as Topic[]).map((item) => <option key={item} value={item}>{topicLabels[item][language]}</option>)}</select></label></div><p className="ad-result-count" role="status" aria-live="polite">{filteredBooks.length} {tr(filteredBooks.length === 1 ? 'sample book' : 'sample books', 'sách mẫu')}</p>{filteredBooks.length ? <div className="ad-book-grid">{filteredBooks.map((book) => <BookCard book={book} language={language} t={t} key={book.id} />)}</div> : <div className="ad-empty"><p>{t.noResults}</p><button className="ad-button ad-button--secondary" onClick={() => { setQuery(""); navigate("/design-preview/library"); }}>{tr('Show all sample books', 'Xem tất cả sách mẫu')}</button></div>}</section>;

  const detail = selectedBook ? <section className="ad-page ad-container"><Link className="ad-back" to={`/design-preview/library${location.search}`}>← {t.back}</Link><div className="ad-detail"><div><Cover book={selectedBook} large /></div><div className="ad-detail-copy"><span className="ad-eyebrow">{topicLabels[selectedBook.topic][language]} · {t.sample}</span><h1>{selectedBook.title[language]}</h1><p className="ad-detail-lede">{selectedBook.description[language]}</p><p className="ad-note">{tr('Book details only. Online reading and borrowing are not available in this preview.', 'Chỉ có thông tin sách. Bản mẫu không hỗ trợ đọc trực tuyến hoặc mượn sách.')}</p><button className="ad-button ad-button--primary" onClick={() => demoAccount ? saveSample(selectedBook.id) : navigate(`/design-preview/account?book=${selectedBook.id}`)}>{savedId === selectedBook.id ? t.saved : t.save}</button><p className="ad-note">{tr('Demo saves are temporary and clear when you reload.', 'Dữ liệu mẫu chỉ lưu tạm và sẽ xoá khi tải lại.')}</p></div></div></section> : library;

  const start = <section className="ad-page ad-container ad-start-page"><div className="ad-guide-card"><span className="ad-eyebrow">{t.help}</span><h1>{t.startTitle}</h1><p>{t.startBody}</p><div className="ad-guide-topics">{(Object.keys(topicLabels) as Topic[]).map((item) => <Link key={item} className={`ad-guide-topic ad-guide-topic--${item}`} to={`/design-preview/library?topic=${item}`}><span className="ad-topic-line" aria-hidden="true" />{topicLabels[item][language]}</Link>)}</div><Link className="ad-skip" to="/design-preview/library">{t.skip} →</Link></div></section>;
  const account = <section className="ad-page ad-container ad-account-page"><div className="ad-account-card"><span className="ad-eyebrow">{t.account}</span><h1>{tr('Keep your reading in one place.', 'Lưu sách và ghi chú ở một nơi.')}</h1><p>{tr('On the real website, an account saves your books and private reading notes. You need an email inbox to create one.', 'Trên trang thật, tài khoản lưu sách và ghi chú đọc riêng của em. Em cần hộp thư email để tạo tài khoản.')}</p><p>{t.accountIntro}</p><button className="ad-button ad-button--primary" onClick={() => { setDemoAccount(true); if (pendingBookId && sampleBooks.some((book) => book.id === pendingBookId)) saveSample(pendingBookId); else navigate("/design-preview/reading"); }}>{t.continue}</button><p className="ad-note">{tr('Using a shared device? Sign out when you finish. No account is created in this demo.', 'Dùng thiết bị chung? Hãy đăng xuất khi dùng xong. Bản mẫu không tạo tài khoản thật.')}</p><Link className="ad-skip" to="/design-preview/library">{tr("Browse without an account", "Xem sách không cần tài khoản")} →</Link></div></section>;
  const reading = <section className="ad-page ad-container"><div className="ad-page-heading"><div><span className="ad-eyebrow">{t.reading}</span><h1>{t.notes}</h1><p>{savedId ? tr("What did you notice in this book?", "Em nhận thấy điều gì trong sách?") : t.readingEmpty}</p></div><Link className="ad-button ad-button--secondary" to="/design-preview/library">{t.browse}</Link></div>{savedId ? <div className="ad-reading-card"><div className="ad-reading-book"><Cover book={sampleBooks.find((book) => book.id === savedId)!} /></div><div><span className="ad-eyebrow">{tr("Saved in this demo", "Đã lưu trong bản mẫu")}</span><h2>{sampleBooks.find((book) => book.id === savedId)!["title"][language]}</h2><label className="ad-notes-field"><span>{t.notes}</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={tr("Write a short note…", "Viết ghi chú ngắn…")} maxLength={2000} /></label><span className="ad-local-status">{note ? tr("Temporary note — clears on reload.", "Ghi chú tạm — xoá khi tải lại.") : tr("Notes are optional.", "Ghi chú không bắt buộc.")}</span></div></div> : <div className="ad-empty ad-empty--reading"><span className="ad-empty-mark" aria-hidden="true">○</span><p>{t.readingEmpty}</p></div>}</section>;

  let content = home;
  if (path === "library") content = library;
  if (path.startsWith("book/")) content = detail;
  if (path === "start") content = start;
  if (path === "account") content = account;
  if (path === "reading") content = reading;
  return <div className="ad-preview"><a className="ad-preview-skip" href="#ad-main">{tr("Skip to content", "Chuyển đến nội dung")}</a><Header language={language} setLanguage={setLanguage} t={t} /><Ribbon t={t} /><main id="ad-main" ref={mainRef} tabIndex={-1}>{content}{demoAccount && <div className="ad-container ad-session"><span>{tr("Demo account · temporary data", "Tài khoản mẫu · dữ liệu tạm")}</span><button type="button" className="ad-button ad-button--secondary" onClick={() => { setDemoAccount(false); setSavedId(null); setNote(""); navigate("/design-preview"); }}>{tr("Sign out of demo", "Đăng xuất bản mẫu")}</button></div>}</main><footer className="ad-footer ad-container"><span lang="en">EVG · Learn &amp; grow</span><Link to="/design-preview/account" className="ad-text-link">{t.account}</Link><Link className="ad-text-link" to="/design-preview/start">{t.help} →</Link><span>{tr("Design concept. No live account or catalogue changes.", "Ý tưởng thiết kế. Không thay đổi tài khoản hay danh mục thật.")}</span></footer></div>;
}

export default DesignPreview;
