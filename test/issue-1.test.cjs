// Tests des points 1 (jeton d'accès), 6 (en-têtes de sécurité, script externe) et 7 (plafond des flux /events).
// Lancer : node --test test/   (Node 18+, aucune dépendance). N'ouvre de connexion que sur 127.0.0.1.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const tmp = (n) => fs.mkdtempSync(path.join(os.tmpdir(), `od-${n}-`));

function freePort() { return new Promise((r) => { const s = http.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); }); }
function req(port, p, { method = 'GET', headers = {}, body, keep } = {}) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port, path: p, method, headers: { host: `127.0.0.1:${port}`, ...headers } }, (res) => {
      if (keep) return resolve(res);
      let b = ''; res.setEncoding('utf8'); res.on('data', (d) => { b += d; }); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: b }));
    });
    r.on('error', reject); if (body) r.write(body); r.end();
  });
}

// serveur de test : jeton connu (ORCH_DASHBOARD_TOKEN, comme le transmet « start »)
async function startServer(projectDir) {
  const home = tmp('home');
  const env = { ...process.env, ORCH_DASHBOARD_HOME: home, CLAUDE_CONFIG_DIR: home, ORCH_DASHBOARD_TOKEN: crypto.randomBytes(24).toString('hex') };
  if (projectDir) execFileSync(process.execPath, [path.join(ROOT, 'server.cjs'), 'add', projectDir], { env });
  const port = await freePort();
  const child = spawn(process.execPath, [path.join(ROOT, 'server.cjs'), 'serve', String(port)], { env, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { if ((await req(port, '/api/whoami')).status === 200) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
  return { port, token: env.ORCH_DASHBOARD_TOKEN, stop: () => child.kill() };
}
const examples = path.join(ROOT, 'examples');

// ---------- point 1 : jeton d'accès ----------
test('point 1 : sans jeton, aucune route ne répond (401), et /api/whoami reste public', async () => {
  const s = await startServer(examples);
  try {
    for (const p of ['/', '/app.js', '/api/snapshot', '/api/projects', '/api/i18n', '/events']) assert.strictEqual((await req(s.port, p)).status, 401, `${p} sans jeton`);
    assert.strictEqual((await req(s.port, '/api/whoami')).status, 200, 'whoami reste lisible (identité du serveur)');
  } finally { s.stop(); }
});

test('point 1 : Host étranger refusé (403) ; mauvais jeton refusé (401)', async () => {
  const s = await startServer(examples);
  try {
    assert.strictEqual((await req(s.port, '/', { headers: { host: `evil.example:${s.port}` } })).status, 403, 'Host étranger');
    assert.strictEqual((await req(s.port, '/?k=00')).status, 401, 'mauvais jeton');
    assert.strictEqual((await req(s.port, `/?k=${'0'.repeat(48)}`)).status, 401, 'jeton de même longueur mais faux');
  } finally { s.stop(); }
});

test('point 1 : bon jeton → cookie HttpOnly / SameSite=Strict puis page ; POST /api/open hors origine refusé', async () => {
  const s = await startServer(examples);
  try {
    const ok = await req(s.port, `/?k=${s.token}`);
    assert.strictEqual(ok.status, 303);
    assert.match(String(ok.headers['set-cookie']), /HttpOnly/);
    assert.match(String(ok.headers['set-cookie']), /SameSite=Strict/);
    const cookie = String(ok.headers['set-cookie']).split(';')[0];
    const page = await req(s.port, '/', { headers: { cookie } });
    assert.strictEqual(page.status, 200);
    assert.strictEqual((await req(s.port, '/api/projects', { headers: { cookie } })).status, 200, 'routes ouvertes avec le cookie');
    const open = await req(s.port, '/api/open', { method: 'POST', headers: { cookie, origin: 'http://evil.example', 'content-type': 'application/json' }, body: '{"ref":"x","project":"y"}' });
    assert.strictEqual(open.status, 403, 'origine étrangère');
  } finally { s.stop(); }
});

test('point 1 : le jeton est comparé avec crypto.timingSafeEqual et généré sur 192 bits', () => {
  const src = fs.readFileSync(path.join(ROOT, 'server.cjs'), 'utf8');
  assert.match(src, /crypto\.timingSafeEqual/);
  assert.match(src, /randomBytes\(24\)/, 'jeton de 192 bits');
});

// ---------- point 6 : en-têtes de sécurité et script externe ----------
test('point 6 : CSP avec frame-ancestors, script-src sans unsafe-inline ; X-Frame-Options et Referrer-Policy', async () => {
  const s = await startServer(examples);
  try {
    const cookie = String((await req(s.port, `/?k=${s.token}`)).headers['set-cookie']).split(';')[0];
    const page = await req(s.port, '/', { headers: { cookie } });
    const csp = page.headers['content-security-policy'];
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /object-src 'none'/);
    assert.match(csp, /base-uri 'none'/);
    assert.match(csp, /form-action 'none'/);
    assert.doesNotMatch(csp.match(/script-src[^;]*/)[0], /unsafe-inline/);
    assert.strictEqual(page.headers['x-frame-options'], 'DENY');
    assert.strictEqual(page.headers['referrer-policy'], 'no-referrer');
    assert.doesNotMatch(page.body, /<script>(?!\s*<\/script>)/, 'plus aucun script en ligne dans index.html');
    assert.match(page.body, /<script src="\/app\.js"><\/script>/);
  } finally { s.stop(); }
});

test('point 6 : /app.js est servi (avec le cookie) et contient le code de la page', async () => {
  const s = await startServer(examples);
  try {
    const cookie = String((await req(s.port, `/?k=${s.token}`)).headers['set-cookie']).split(';')[0];
    const js = await req(s.port, '/app.js', { headers: { cookie } });
    assert.strictEqual(js.status, 200);
    assert.match(String(js.headers['content-type']), /javascript/);
    assert.ok(js.body.length > 10000, 'le script complet est servi');
    assert.match(js.body, /loadAdapterTexts/);
  } finally { s.stop(); }
});

// ---------- point 7 : plafond des flux /events ----------
test('point 7 : au plus 20 flux /events, puis 503', async () => {
  const s = await startServer(examples);
  const ouverts = [];
  try {
    const cookie = String((await req(s.port, `/?k=${s.token}`)).headers['set-cookie']).split(';')[0];
    let refus = 0;
    for (let i = 0; i < 25; i++) {
      const res = await req(s.port, '/events', { headers: { cookie }, keep: true });
      ouverts.push(res);
      if (res.statusCode === 503) refus++;
    }
    assert.strictEqual(ouverts.filter((r) => r.statusCode === 200).length, 20, '20 flux acceptés');
    assert.strictEqual(refus, 5, 'les flux au-delà de 20 reçoivent 503');
  } finally { for (const r of ouverts) r.destroy(); s.stop(); }
});
