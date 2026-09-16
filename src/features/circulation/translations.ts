import i18n from '../../i18n';

const en = {
  circulation: {
    title: 'Circulation desk',
    body: 'Staff-controlled lending with an explicit EVG policy.',
    disabled: 'Circulation is disabled until EVG approves the loan policy and an administrator enables it.',
    policy: 'Policy',
    enable: 'Enable circulation',
    disable: 'Disable circulation',
    maxLoans: 'Maximum active loans per learner',
    timezone: 'Centre timezone',
    savePolicy: 'Save policy',
    enabledNotice: 'Circulation is enabled for up to {{count}} active loan per learner in {{timezone}}.',
    borrower: 'Eligible borrowers',
    register: 'Register borrower',
    userId: 'Learner account UUID',
    displayName: 'Display name',
    registerButton: 'Register eligible learner',
    copies: 'Copies',
    copy: 'Copy',
    dueDate: 'Due date',
    checkout: 'Record checkout',
    loans: 'Current and past loans',
    return: 'Return',
    damaged: 'Return damaged',
    lost: 'Resolve as lost',
    noLoans: 'No loan records found.',
    noBorrowers: 'No eligible borrowers registered.',
    noCopies: 'No copies found.',
    saved: 'Saved.',
    failed: 'Could not save. Check the policy, permissions, and connection, then try again.',
    retry: 'Try again',
    dueOn: 'Due {{date}}',
    loading: 'Loading circulation…',
    signIn: 'Sign in with an authorised staff account to manage circulation.',
    ownTitle: 'My loans',
    ownBody: 'Your loans and due dates are private to your account.',
    ownEmpty: 'You have no loan records.',
    active: 'Active',
    overdue: 'Overdue',
    resolved: 'Resolved',
    condition: 'Condition',
  },
};
const vi = {
  circulation: {
    title: 'Quầy mượn trả',
    body: 'Nhân viên quản lý việc mượn trả theo chính sách EVG.',
    disabled: 'Chức năng mượn trả đang tắt cho đến khi EVG phê duyệt chính sách và quản trị viên bật lên.',
    policy: 'Chính sách', enable: 'Bật mượn trả', disable: 'Tắt mượn trả',
    maxLoans: 'Số sách đang mượn tối đa mỗi học sinh', timezone: 'Múi giờ trung tâm', savePolicy: 'Lưu chính sách', enabledNotice: 'Đang bật mượn trả với tối đa {{count}} lượt mượn đang hoạt động cho mỗi học sinh theo múi giờ {{timezone}}.',
    borrower: 'Người mượn đủ điều kiện', register: 'Đăng ký người mượn', userId: 'UUID tài khoản học sinh', displayName: 'Tên hiển thị', registerButton: 'Đăng ký học sinh đủ điều kiện',
    copies: 'Bản sách', copy: 'Bản sách', dueDate: 'Hạn trả', checkout: 'Ghi nhận mượn', loans: 'Lịch sử mượn trả', return: 'Ghi trả', damaged: 'Trả sách hỏng', lost: 'Ghi nhận mất',
    noLoans: 'Chưa có lượt mượn.', noBorrowers: 'Chưa đăng ký người mượn đủ điều kiện.', noCopies: 'Chưa có bản sách.', saved: 'Đã lưu.', failed: 'Không thể lưu. Hãy kiểm tra chính sách, quyền truy cập và kết nối rồi thử lại.', retry: 'Thử lại', dueOn: 'Hạn trả {{date}}', loading: 'Đang tải mượn trả…', signIn: 'Đăng nhập bằng tài khoản nhân viên được cấp quyền để quản lý mượn trả.', ownTitle: 'Sách em đang mượn', ownBody: 'Lượt mượn và hạn trả của em chỉ hiển thị trong tài khoản này.', ownEmpty: 'Em chưa có lượt mượn.', active: 'Đang mượn', overdue: 'Quá hạn', resolved: 'Đã xử lý', condition: 'Tình trạng',
  },
};

i18n.addResourceBundle('en', 'translation', en, true, true);
i18n.addResourceBundle('vi', 'translation', vi, true, true);

export default i18n;
