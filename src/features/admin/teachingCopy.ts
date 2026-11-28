export const teachingCopy = {
  en: {
    title: 'Support their next discovery', topic: 'Topic', topics: 'Reading across topics', started: 'Started · recorded', finished: 'Finished · recorded', elapsed: 'Days between records', unknown: 'Not recorded',
    timing: 'Dates show when a reading status was recorded, not time spent reading. Earlier records may have no dates. Reopening a finished book starts a new recorded cycle.',
    discussion: 'Ask what surprised them, what they would like to explore next, and whether they would like to share a book talk.',
    projects: 'Review submitted work', resources: 'Explore teaching resources', noTopics: 'Topic summaries appear after the teaching update is enabled.',
    remove: 'Remove title', confirm: 'Remove this unused title?', removed: 'The unused title and its copies were removed.',
    changed: 'Someone changed this title or its copy count. Refresh the catalogue and review the new details before removing it.', refresh: 'Refresh catalogue',
    removeBody: 'This permanently removes this catalogue entry and its physical-copy records. Titles with reading or loan history are protected and cannot be removed.',
    history: 'This title has reading or loan history, so it must stay in the catalogue. You can still update its details and manage its copies.',
    unavailable: 'Catalogue removal is not enabled on this backend yet. The title has not changed.',
    failed: 'We could not remove this title. Refresh the catalogue and check its status before trying again.',
  },
  vi: {
    title: 'Hỗ trợ khám phá tiếp theo', topic: 'Chủ đề', topics: 'Việc đọc theo chủ đề', started: 'Bắt đầu · đã ghi nhận', finished: 'Hoàn thành · đã ghi nhận', elapsed: 'Số ngày giữa hai lần ghi nhận', unknown: 'Chưa ghi nhận',
    timing: 'Ngày thể hiện lúc trạng thái đọc được ghi nhận, không phải thời gian thực sự đọc. Hồ sơ cũ có thể chưa có ngày. Mở lại sách đã hoàn thành bắt đầu một lượt ghi nhận mới.',
    discussion: 'Hỏi điều gì khiến em ngạc nhiên, em muốn khám phá gì tiếp theo và em có muốn chia sẻ một bài nói về sách không.',
    projects: 'Xem bài đã gửi', resources: 'Khám phá tài nguyên giảng dạy', noTopics: 'Tổng hợp chủ đề sẽ có khi bản cập nhật hỗ trợ giảng dạy được bật.',
    remove: 'Xóa tựa sách', confirm: 'Xóa tựa sách chưa sử dụng này?', removed: 'Đã xóa tựa sách chưa sử dụng và các bản sách.',
    changed: 'Có người đã thay đổi tựa sách hoặc số bản. Hãy tải lại danh mục và xem thông tin mới trước khi xóa.', refresh: 'Tải lại danh mục',
    removeBody: 'Thao tác xóa vĩnh viễn mục sách và hồ sơ các bản sách. Không thể xóa tựa sách đã có lịch sử đọc hoặc mượn.',
    history: 'Tựa sách này có lịch sử đọc hoặc mượn nên phải được giữ lại. Bạn vẫn có thể cập nhật thông tin và quản lý các bản sách.',
    unavailable: 'Chức năng xóa danh mục chưa được bật trên hệ thống này. Tựa sách chưa thay đổi.',
    failed: 'Không thể xóa tựa sách. Hãy tải lại danh mục và kiểm tra trạng thái trước khi thử lại.',
  },
} as const;

export function recordedReadingDays(start: string | null | undefined, end: string | null | undefined): number | null {
  if (!start || !end) return null;
  const difference = Date.parse(end) - Date.parse(start);
  return Number.isFinite(difference) && difference >= 0 ? Math.floor(difference / 86_400_000) : null;
}
