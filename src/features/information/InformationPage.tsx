import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { publicPath } from '../../content/publicPages';
import './information.css';

const information = {
  en: {
    help: {
      kicker: 'Help & support', title: 'A little help, when you need it.', intro: 'An EVG librarian or programme facilitator is your first point of contact. Ask in person at the library desk.',
      sections: [
        ['Finding a book', 'Browse without an account. Search by title or choose a topic. A translated title describes the book; check its language label before choosing it.'],
        ['Signing in', 'Use the email address registered for your account. Check your spam folder for confirmation or recovery messages. If a link expires, request a new one from the sign-in page. Never share your password or verification link.'],
        ['Saving your reading', 'Sign in before adding a book or changing reading status. Wait for confirmation that the change was saved. If the connection fails, keep the page open and use the retry action.'],
        ['Borrowing and returning', 'Speak to an EVG librarian about physical books, eligibility, due dates, and returns. Recording that you finished reading a book does not return its physical copy.'],
        ['A shared computer', 'Use “Sign out of this tab” before leaving. Close other tabs you signed into separately. Ask staff for help if you cannot sign out.'],
        ['A problem or a privacy request', 'Tell an EVG librarian or programme facilitator which page you were using and what you expected. For account access, corrections, export, or removal of information, ask staff to contact the application administrator. Do not send passwords or private reflections in screenshots.'],
      ],
      action: 'Browse the library', secondary: 'Read about privacy',
    },
    privacy: {
      kicker: 'Privacy', title: 'Your information, explained.', intro: 'This explains the current library pilot. EVG staff can help you understand your account and handle questions about your information.',
      sections: [
        ['Account information', 'If you create an account, the service stores your email address, display name, account dates, and language preference. Authentication is provided by Supabase. The website is hosted on Vercel.'],
        ['Reading and interests', 'Signed-in reading status, optional written reflections, and chosen interests are saved to your account. Guests can browse books without creating these records.'],
        ['What staff can see', 'Authorised librarians and administrators can see student names, email addresses, reading titles and status, and borrowing records needed to operate the library. Written reflections and selected interests are not included in the staff reading screens.'],
        ['Library records', 'Staff record physical copies, loans, due dates, returns, and any recorded follow-up. A contact-history entry records a staff action; it does not prove an email was delivered or read.'],
        ['Storage on this device', 'The site remembers your language in browser storage. Sign-in is stored for the current browser tab, with a temporary memory fallback if browser storage is unavailable. Signing out of one tab does not sign out every device or independently signed-in tab.'],
        ['Service errors', 'The site can send a small error code and general page category to its own hosting service to help maintain reliability. Reports exclude entered text, book or student identifiers, email addresses, passwords, tokens, and URL query strings. Hosting and database providers also maintain their own service logs.'],
        ['Questions, corrections, and removal', 'Ask an EVG librarian or programme facilitator to contact the application administrator. Staff need to check account ownership before acting. Some loan and audit history may need to be retained; the administrator must review the request instead of promising immediate deletion.'],
        ['Before real learner enrolment', 'EVG must confirm the pilot’s access, safeguarding, retention, and account-removal arrangements with learners and their responsible adults where relevant. This page does not set a retention period or replace that programme decision.'],
      ],
      action: 'Get help', secondary: 'Browse the library',
    },
  },
  vi: {
    help: {
      kicker: 'Trợ giúp', title: 'Luôn có người sẵn sàng giúp em.', intro: 'Em có thể gặp thủ thư hoặc người phụ trách chương trình EVG tại bàn thư viện để được hỗ trợ.',
      sections: [
        ['Tìm sách', 'Em có thể xem sách mà không cần tài khoản. Tìm theo tên sách hoặc chọn chủ đề. Tên được dịch chỉ giúp mô tả sách; hãy xem nhãn ngôn ngữ của sách trước khi chọn.'],
        ['Đăng nhập', 'Dùng địa chỉ email đã đăng ký. Kiểm tra thư rác nếu chưa nhận được thư xác nhận hoặc khôi phục. Nếu liên kết hết hạn, hãy yêu cầu liên kết mới trên trang đăng nhập. Không chia sẻ mật khẩu hoặc liên kết xác minh.'],
        ['Lưu việc đọc', 'Đăng nhập trước khi thêm sách hoặc đổi trạng thái đọc. Đợi thông báo xác nhận đã lưu. Nếu mất kết nối, giữ trang đang mở và dùng nút thử lại.'],
        ['Mượn và trả sách', 'Hỏi thủ thư EVG về sách giấy, điều kiện mượn, hạn trả và cách trả sách. Đánh dấu đọc xong không có nghĩa là đã trả bản sách giấy.'],
        ['Máy tính dùng chung', 'Chọn “Đăng xuất khỏi tab này” trước khi rời máy. Đóng các tab khác mà em đã đăng nhập riêng. Nhờ nhân viên giúp nếu không đăng xuất được.'],
        ['Báo lỗi hoặc hỏi về thông tin cá nhân', 'Cho thủ thư hoặc người phụ trách EVG biết em đang dùng trang nào và muốn làm gì. Nếu cần hỗ trợ tài khoản, sửa, xuất hoặc xóa thông tin, hãy nhờ nhân viên liên hệ quản trị viên ứng dụng. Không gửi mật khẩu hoặc ghi chú riêng trong ảnh chụp màn hình.'],
      ],
      action: 'Xem thư viện', secondary: 'Tìm hiểu quyền riêng tư',
    },
    privacy: {
      kicker: 'Quyền riêng tư', title: 'Hiểu rõ thông tin của em.', intro: 'Trang này giải thích bản thí điểm thư viện hiện tại. Nhân viên EVG có thể giúp em hiểu tài khoản và giải đáp thắc mắc về thông tin của em.',
      sections: [
        ['Thông tin tài khoản', 'Nếu tạo tài khoản, dịch vụ lưu email, tên hiển thị, ngày tạo tài khoản và ngôn ngữ đã chọn. Supabase cung cấp xác thực tài khoản. Trang web được lưu trữ trên Vercel.'],
        ['Việc đọc và sở thích', 'Trạng thái đọc, ghi chú tự nguyện và sở thích được lưu vào tài khoản khi em đăng nhập. Khách có thể xem sách mà không tạo những bản ghi này.'],
        ['Nhân viên có thể xem gì', 'Thủ thư và quản trị viên có quyền có thể xem tên, email, tên sách và trạng thái đọc, cùng hồ sơ mượn sách cần cho việc vận hành thư viện. Ghi chú riêng và sở thích đã chọn không có trong màn hình đọc sách của nhân viên.'],
        ['Hồ sơ thư viện', 'Nhân viên ghi nhận bản sách giấy, lượt mượn, hạn trả, trả sách và việc liên hệ đã ghi nhận. Lịch sử liên hệ ghi nhận hành động của nhân viên, không chứng minh email đã được gửi đến hoặc đọc.'],
        ['Lưu trữ trên thiết bị này', 'Trang web nhớ ngôn ngữ trong bộ nhớ trình duyệt. Phiên đăng nhập được lưu cho tab hiện tại; nếu không thể dùng bộ nhớ trình duyệt, phiên chỉ nằm tạm trong bộ nhớ trang. Đăng xuất một tab không đăng xuất mọi thiết bị hoặc tab đăng nhập riêng.'],
        ['Lỗi dịch vụ', 'Trang web có thể gửi mã lỗi ngắn và nhóm trang đến dịch vụ lưu trữ của chính trang để hỗ trợ bảo trì. Báo cáo không chứa nội dung đã nhập, mã sách hoặc học sinh, email, mật khẩu, mã truy cập hay tham số URL. Nhà cung cấp lưu trữ và cơ sở dữ liệu cũng có nhật ký dịch vụ riêng.'],
        ['Thắc mắc, sửa và xóa thông tin', 'Nhờ thủ thư hoặc người phụ trách EVG liên hệ quản trị viên ứng dụng. Nhân viên cần xác minh chủ tài khoản trước khi xử lý. Một số lịch sử mượn và kiểm tra có thể cần được giữ lại; quản trị viên phải xem xét thay vì hứa xóa ngay.'],
        ['Trước khi học sinh thật tham gia', 'EVG cần xác nhận cách truy cập, bảo vệ học sinh, lưu giữ và xóa tài khoản với người học và người lớn có trách nhiệm khi phù hợp. Trang này không đặt thời hạn lưu giữ hoặc thay thế quyết định của chương trình.'],
      ],
      action: 'Nhận hỗ trợ', secondary: 'Xem thư viện',
    },
  },
} as const;

export function InformationPage({ kind }: { kind: 'help' | 'privacy' }) {
  const { i18n } = useTranslation();
  const language = i18n.language === 'vi' ? 'vi' : 'en';
  const copy = information[language][kind];
  return <article className="information-page">
    <header className="page-heading"><div><span className="eyebrow">{copy.kicker}</span><h1>{copy.title}</h1><p>{copy.intro}</p></div></header>
    <div className="information-sections">{copy.sections.map(([title, body]) => <section className="information-card" key={title}><h2>{title}</h2><p>{body}</p></section>)}</div>
    <nav className="information-actions" aria-label={language === 'vi' ? 'Bước tiếp theo' : 'Next steps'}>
      <Link className="primary" to={kind === 'privacy' ? publicPath('/help', language) : '/library'}>{copy.action}</Link>
      <Link className="secondary" to={kind === 'help' ? publicPath('/privacy', language) : '/library'}>{copy.secondary}</Link>
    </nav>
  </article>;
}
