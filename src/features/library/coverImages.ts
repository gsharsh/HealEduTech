export type CoverSize = 'card' | 'detail';

const COVER_WIDTHS: Record<CoverSize, readonly [number, number]> = {
  card: [500, 960],
  detail: [960, 1280],
};

function isHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function commonsThumbnailUrl(source: string, width: number): string | null {
  const url = isHttpUrl(source);
  if (!url || url.hostname.toLowerCase() !== 'upload.wikimedia.org') return null;
  if ([...url.searchParams.keys()].some((key) => !key.toLowerCase().startsWith('utm_'))) return null;

  const match = url.pathname.match(/^\/wikipedia\/commons\/([a-f0-9]\/([a-f0-9]{2})\/)([^/].*)$/i);
  if (!match || match[3].startsWith('thumb/')) return null;

  const sourcePath = `${match[1]}${match[3]}`;
  const filename = sourcePath.slice(sourcePath.lastIndexOf('/') + 1);
  if (!/\.(?:jpe?g|png|gif|webp)$/i.test(filename)) return null;

  // Wikimedia's thumbnail path uses the original filename and a width prefix.
  const directory = sourcePath.slice(0, sourcePath.lastIndexOf('/') + 1);
  return `${url.origin}/wikipedia/commons/thumb/${directory}${filename}/${width}px-${filename}`;
}

export function getCoverImageSources(source: string, size: CoverSize = 'card') {
  const url = isHttpUrl(source.trim());
  if (!url) return null;

  const normalizedSource = url.href;
  const widths = COVER_WIDTHS[size];
  const candidates = widths.map((width) => commonsThumbnailUrl(normalizedSource, width));
  if (candidates.some((candidate) => candidate === null)) {
    return { src: normalizedSource, srcSet: undefined };
  }

  return {
    src: candidates[0] as string,
    srcSet: `${candidates[0]} ${widths[0]}w, ${candidates[1]} ${widths[1]}w`,
  };
}
