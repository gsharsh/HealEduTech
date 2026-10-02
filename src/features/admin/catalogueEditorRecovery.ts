import type { BookUpdate, CatalogueBook, NewBook } from '../library/catalogue';

export type CatalogueEditorState =
  | { mode: 'new'; value: NewBook }
  | { mode: 'edit'; id: string; registeredCopies: number; value: BookUpdate };

type CommittedBookDetails = Pick<CatalogueBook, 'title_en' | 'title_vi' | 'author' | 'language' | 'topic' | 'description_en' | 'description_vi'> & {
  book_copies: CatalogueBook['book_copies'];
};

/** Convert a committed create into an edit so a cover retry cannot create a duplicate. */
export function recoverCatalogueEditorAfterCoverSave(editor: CatalogueEditorState, bookId: string, committed?: CommittedBookDetails): CatalogueEditorState {
  if (editor.mode === 'edit') return editor;
  const copies = committed?.book_copies[0]?.count ?? editor.value.copies;
  const details = committed ?? editor.value;
  return {
    mode: 'edit',
    id: bookId,
    registeredCopies: copies,
    value: {
      title_en: details.title_en,
      title_vi: details.title_vi,
      author: details.author,
      language: details.language,
      topic: details.topic,
      description_en: details.description_en,
      description_vi: details.description_vi,
      cover_url: editor.value.cover_url,
      totalCopies: copies,
    },
  };
}
