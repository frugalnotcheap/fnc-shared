import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 3000);

const MIME_TYPES = {
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ts': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

const INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>fnc-shared — Zero-Build ES2022 Library</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; max-width: 720px; margin: 48px auto; padding: 0 20px; color: #0f172a; line-height: 1.6; }
      code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
      ul { padding-left: 20px; }
      li { margin: 6px 0; }
      a { color: #2563eb; text-decoration: none; }
      a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <h1>fnc-shared</h1>
    <p>Lightweight, zero-build ES2022 shared module library for FNC apps.</p>
    <h2>Modules</h2>
    <ul>
      <li><a href="/src/index.js"><code>/src/index.js</code></a> (<a href="/src/index.d.ts">.d.ts</a>)</li>
      <li><a href="/src/schema.js"><code>/src/schema.js</code></a> (<a href="/src/schema.d.ts">.d.ts</a>)</li>
      <li><a href="/src/handoff.js"><code>/src/handoff.js</code></a> (<a href="/src/handoff.d.ts">.d.ts</a>)</li>
      <li><a href="/src/bugReporter.js"><code>/src/bugReporter.js</code></a> (<a href="/src/bugReporter.d.ts">.d.ts</a>)</li>
      <li><a href="/src/dataLoader.js"><code>/src/dataLoader.js</code></a> (<a href="/src/dataLoader.d.ts">.d.ts</a>)</li>
    </ul>
    <h2>Data &amp; Docs</h2>
    <ul>
      <li><a href="/data/manifest.json"><code>/data/manifest.json</code></a></li>
      <li><a href="/CONVENTIONS.md"><code>/CONVENTIONS.md</code></a></li>
    </ul>
  </body>
</html>
`;

const server = http.createServer(async (req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  if (urlPath === '/' || urlPath === '/index.html') {
    res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] });
    res.end(INDEX_HTML);
    return;
  }

  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.join(ROOT_DIR, safePath);

  if (!fullPath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  try {
    const content = await readFile(fullPath);
    const ext = path.extname(fullPath);
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`fnc-shared static ES module server listening on http://0.0.0.0:${PORT}`);
});
