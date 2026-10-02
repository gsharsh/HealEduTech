export class CatalogueCoverSaveError extends Error {
  readonly bookId: string;
  readonly cause: unknown;

  constructor(bookId: string, cause: unknown) {
    super('Book details were saved, but the cover update failed');
    this.name = 'CatalogueCoverSaveError';
    this.bookId = bookId;
    this.cause = cause;
  }
}
