import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const cache = resolve(root, '../.cache/sdk');
const testMode = process.env.USE_EMULATORS === '1';
const port = Number(process.env.PORT || 4173);
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml' };
const prefix = '/gastos-en-pareja';
const server = createServer(async (req,res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === prefix) { res.writeHead(302, { Location:`${prefix}/` }); res.end(); return; }
    if (pathname.startsWith(`${prefix}/`)) pathname = pathname.slice(prefix.length);
    if (pathname === '/') pathname = '/index.html';
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    let path = resolve(root, `.${pathname}`);
    if (!path.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    let data;
    if (testMode && pathname === '/firebase-config.js') {
      data = 'export const firebaseConfig = { apiKey: "demo-key", authDomain: "demo-gastos-pareja.firebaseapp.com", projectId: "demo-gastos-pareja", appId: "1:123:web:demo" }; export const emulatorConfig = { authPort: 9099, firestorePort: 8080 };';
    } else if (testMode && /^\/vendor\/firebase-(app|auth|firestore)\.js$/.test(pathname)) {
      path = resolve(cache, pathname.split('/').pop()); data = await readFile(path);
    } else {
      if (!(await stat(path)).isFile()) throw new Error('not-file');
      data = await readFile(path);
      if (testMode && pathname === '/firebase-store.js') data = data.toString().replaceAll('https://www.gstatic.com/firebasejs/12.19.0/', './vendor/');
    }
    res.writeHead(200, { 'Content-Type':types[extname(path)] || 'application/octet-stream', 'Cache-Control':'no-store', 'Referrer-Policy':'no-referrer', 'X-Content-Type-Options':'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404, { 'Content-Type':'text/plain; charset=utf-8' }); res.end('No encontrado'); }
});
server.listen(port,'127.0.0.1', () => console.log(`Aplicación disponible en http://127.0.0.1:${port}${prefix}/`));
