import test from 'node:test';
import assert from 'node:assert/strict';
import { recoverCatalogueEditorAfterCoverSave } from '../src/features/admin/catalogueEditorRecovery.ts';

test('cover-save recovery converts a committed create into an edit without losing the draft cover', () => {
  const editor = recoverCatalogueEditorAfterCoverSave({
    mode: 'new',
    value: {
      title_en: 'Mangrove paths', title_vi: 'Đường rừng ngập mặn', author: 'EVG', language: 'bilingual', topic: 'nature',
      description_en: 'A field note', description_vi: 'Ghi chú thực địa', cover_url: 'https://new-cover.example/cover.jpg', copies: 3,
    },
  }, 'book-123', {
    title_en: 'Mangrove paths', title_vi: 'Đường rừng ngập mặn', author: 'EVG', language: 'bilingual', topic: 'nature',
    description_en: 'A field note', description_vi: 'Ghi chú thực địa', book_copies: [{ count: 3 }],
  });

  assert.equal(editor.mode, 'edit');
  if (editor.mode !== 'edit') return;
  assert.equal(editor.id, 'book-123');
  assert.equal(editor.registeredCopies, 3);
  assert.equal(editor.value.totalCopies, 3);
  assert.equal(editor.value.cover_url, 'https://new-cover.example/cover.jpg');
});

test('cover-save recovery leaves an existing edit bound to the same book', () => {
  const editor = { mode: 'edit' as const, id: 'book-123', registeredCopies: 2, value: {
    title_en: 'Title', title_vi: 'Tên', author: '', language: 'vi' as const, topic: 'stories' as const,
    description_en: '', description_vi: '', cover_url: 'https://cover.example/a.jpg', totalCopies: 2,
  } };
  assert.equal(recoverCatalogueEditorAfterCoverSave(editor, 'other-book'), editor);
});
