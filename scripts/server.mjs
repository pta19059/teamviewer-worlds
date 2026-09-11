import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };

export function createAppServer({ production = false } = {}) {
  const base = production ? resolve(root, 'dist') : root;
  return createServer(async (req, res) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return; }
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(p => p.startsWith('.'))) { res.writeHead(403); res.end('Forbidden'); return; }
      let relative = pathname === '/' ? 'index.html' : pathname.slice(1);
      if (!production && relative !== 'index.html' && !relative.startsWith('src/')) relative = 'public/' + relative;
      const file = resolve(base, relative);
      if (!file.startsWith(base + sep) || !mime[extname(file)] || !(await stat(file)).isFile()) { res.writeHead(404); res.end('Not found'); return; }
      const content = await readFile(file);
      res.writeHead(200, { 'Content-Type': mime[extname(file)], 'Content-Length': content.length, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      res.writeHead(error instanceof URIError ? 400 : error.code === 'ENOENT' ? 404 : 500);
      res.end(error instanceof URIError ? 'Bad request' : error.code === 'ENOENT' ? 'Not found' : 'Server error');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), portIndex = args.indexOf('--port');
  const port = Number(portIndex >= 0 ? args[portIndex + 1] : process.env.PORT || 5173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Use a valid port between 1 and 65535.');
  const server = createAppServer({ production: args.includes('--dist') });
  server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Port ${port} is busy. Try npm run dev -- --port 5174` : error.message); process.exitCode = 1; });
  server.listen(port, '0.0.0.0', () => console.log(`TeamViewer Worlds is ready at http://localhost:${port}`));
}
