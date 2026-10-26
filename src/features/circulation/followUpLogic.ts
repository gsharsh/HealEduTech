export function overdueDays(dueDate: string, centreToday: string) {
  const difference = Date.parse(`${centreToday}T00:00:00Z`) - Date.parse(`${dueDate}T00:00:00Z`);
  return Number.isFinite(difference) ? Math.max(0, Math.round(difference / 86400000)) : 0;
}

export function needsStaffFollowUp(dueDate: string, centreToday: string, resolvedAt: string | null) {
  return !resolvedAt && overdueDays(dueDate, centreToday) >= 7;
}

export function staffPageNumber(value: string | null) {
  return value && /^\d+$/.test(value) ? Math.max(1, Math.min(1000000, Number(value))) : 1;
}

export interface ReminderDetails {
  borrower_name: string; borrower_email: string | null; preferred_language: 'en' | 'vi';
  title_en: string; title_vi: string; inventory_code: string; due_date: string; days_overdue: number;
}

const oneLine = (value: string) => value.replace(/[\r\n]+/g, ' ').trim();

/** The URI prepares a draft only. It cannot establish whether mail was sent. */
export function makeEmailReminder(loan: ReminderDetails) {
  const vi = loan.preferred_language === 'vi';
  const name = oneLine(loan.borrower_name);
  const title = oneLine((vi ? loan.title_vi : loan.title_en) || loan.title_en || loan.title_vi);
  const copy = oneLine(loan.inventory_code);
  const subject = vi ? `EVG: Nhắc trả sách ${title}` : `EVG: Library return reminder — ${title}`;
  const body = vi
    ? `Chào ${name},\n\nCuốn sách “${title}” (mã bản sách: ${copy}) có hạn trả ${loan.due_date} và hiện đã quá hạn ${loan.days_overdue} ngày.\n\nEm vui lòng trả sách cho thư viện hoặc liên hệ với nhân viên nếu cần hỗ trợ. Nếu em đã trả sách, hãy cho thư viện biết để kiểm tra lại thông tin.\n\nCảm ơn em,\nThư viện EVG`
    : `Hello ${name},\n\nOur records show that “${title}” (copy: ${copy}) was due on ${loan.due_date} and is now ${loan.days_overdue} day(s) overdue.\n\nPlease return it to the library, or contact a staff member if you need help. If you have already returned it, please let us know so we can check the record.\n\nThank you,\nEVG Library`;
  const recipient = loan.borrower_email?.trim() ?? '';
  const valid = /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(recipient);
  return {
    recipient: valid ? recipient : '', subject, body,
    href: valid ? `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : null,
  };
}
