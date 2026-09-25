import type { CatalogueBook } from './catalogue';

export type LibraryRouteState = {
  page: number;
  query: string;
  topic: 'all' | CatalogueBook['topic'];
};

const topics = new Set<LibraryRouteState['topic']>(['all', 'nature', 'stories', 'science']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readLibraryRouteState(params: URLSearchParams): LibraryRouteState {
  const rawPage = Number(params.get('page'));
  const page = Number.isSafeInteger(rawPage) && rawPage >= 1 && rawPage <= 100_000 ? rawPage - 1 : 0;
  const rawTopic = params.get('topic');
  const topic = rawTopic && topics.has(rawTopic as LibraryRouteState['topic'])
    ? rawTopic as LibraryRouteState['topic']
    : 'all';
  return { page, query: (params.get('q') ?? '').slice(0, 100), topic };
}

export function writeLibraryRouteState(state: LibraryRouteState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.page > 0) params.set('page', String(state.page + 1));
  if (state.query) params.set('q', state.query);
  if (state.topic !== 'all') params.set('topic', state.topic);
  return params;
}

export function libraryReturnPath(value: string | null): string {
  if (!value) return '/library';
  try {
    const parsed = new URL(value, 'https://evg.local');
    if (parsed.origin !== 'https://evg.local' || parsed.pathname !== '/library') return '/library';
    const state = readLibraryRouteState(parsed.searchParams);
    return `/library${writeLibraryRouteState(state).size ? `?${writeLibraryRouteState(state)}` : ''}`;
  } catch {
    return '/library';
  }
}

export function isValidBookId(value: string): boolean {
  return UUID_PATTERN.test(value);
}
