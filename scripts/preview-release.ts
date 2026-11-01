/** Serve the built candidate locally with its deployed headers and route boundaries. */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import clientError from '../api/client-error.ts';

const root = resolve('dist');
const config = JSON.parse(await readFile('vercel.json', 'utf8')) as { headers: { source: string; headers: { key: string; value: string }[] }[]; rewrites: { source: string; destination: string }[] };
const portIndex = process.argv.indexOf('--port');
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : 4180);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Use a local port between 1024 and 65535.');
const match = (source: string, pathname: string) => new RegExp(`^${source.replace('/:path*', '(?:/.*)?')}$`).test(pathname);
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname);
    for (const rule of config.headers) if (match(rule.source, pathname)) for (const header of rule.headers) response.setHeader(header.key, header.value);
    if (pathname === '/api/client-error') {
      const chunks: Buffer[] = []; let length = 0;
      for await (const chunk of request) { length += chunk.length; if (length > 256) { response.writeHead(413).end(); return; } chunks.push(chunk); }
      clientError({ method: request.method, headers: request.headers, body: Buffer.concat(chunks).toString('utf8') }, response);
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method || '')) { response.writeHead(405, { Allow: 'GET, HEAD' }).end(); return; }
    let filename = resolve(root, `.${pathname}`);
    if (filename !== root && !filename.startsWith(root + sep)) { response.writeHead(400).end(); return; }
    let status = 200;
    try { if ((await stat(filename)).isDirectory()) filename = resolve(filename, 'index.html'); await stat(filename); }
    catch { const rewrite = config.rewrites.find(rule => match(rule.source, pathname)); filename = resolve(root, rewrite ? `.${rewrite.destination}` : '404.html'); status = rewrite ? 200 : 404; }
    const body = await readFile(filename);
    response.writeHead(status, { 'Content-Type': mime[extname(filename)] || 'application/octet-stream' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch { response.writeHead(400).end(); }
}).listen(port, '127.0.0.1', () => console.log(`Built release preview: http://127.0.0.1:${port}`));
