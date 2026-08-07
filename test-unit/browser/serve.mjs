/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
// Serves the browser harness. `/lib/*` maps onto the installed
// @digitalbazaar/vc-html-render-method, so the harness exercises the real
// library rather than a copy that can drift from it.
//
//   node test-unit/browser/serve.mjs   ->   http://localhost:8765/
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname, join, normalize} from 'node:path';

const PORT = process.env.PORT ?? 8765;
const HERE = new URL('.', import.meta.url).pathname;
// the renderer is a dependency of the package under test, not of this test
// package, so it installs into the repo root's node_modules
const LIB = new URL(
  '../../node_modules/@digitalbazaar/vc-html-render-method/lib/',
  import.meta.url).pathname;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

createServer(async (req, res) => {
  const {pathname} = new URL(req.url, `http://localhost:${PORT}`);
  // normalize before joining so `..` cannot escape either directory
  const rel = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const file = rel.startsWith('/lib/') ?
    join(LIB, rel.slice('/lib/'.length)) :
    join(HERE, rel === '/' ? 'index.html' : rel);
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream'
    });
    res.end(body);
  } catch(e) {
    res.writeHead(404, {'content-type': 'text/plain'});
    res.end(`not found: ${pathname}\n`);
  }
}).listen(PORT, () => {
  console.log(`browser harness: http://localhost:${PORT}/`);
});
