// Issue #18 : une requête dont le chemin commence par « // » (ou contient un « % » invalide) ne doit jamais arrêter le serveur.
const { test } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const http = require('node:http');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const SERVER = path.join(__dirname, '..', 'server.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// port libre tiré au hasard par le système
function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.unref();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
  });
}

// requête brute : le chemin est envoyé tel quel (pas de normalisation par le client)
function get(port, reqPath) {
  return new Promise((resolve) => {
    const r = http.request({ host: '127.0.0.1', port, method: 'GET', path: reqPath, timeout: 3000 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (d) => { body += d; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    r.on('timeout', () => { r.destroy(); resolve({ status: 0, body: 'TIMEOUT' }); });
    r.on('error', (e) => resolve({ status: 0, body: e.code || String(e) }));
    r.end();
  });
}

// démarre le serveur sur un port libre, avec un état temporaire (rien n'est écrit dans le vrai profil)
async function startServer() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'odb-issue-18-'));
  const port = await freePort();
  const env = {
    ...process.env,
    ORCH_DASHBOARD_HOME: path.join(home, 'home'),
    CLAUDE_CONFIG_DIR: path.join(home, 'cfg'),
    LOCALAPPDATA: path.join(home, 'local'),
    XDG_STATE_HOME: path.join(home, 'xdg'),
  };
  const child = spawn(process.execPath, [SERVER, 'serve', String(port)], { env, stdio: 'ignore' });
  let exited = false;
  child.on('exit', () => { exited = true; });
  for (let i = 0; i < 50; i++) {
    const r = await get(port, '/api/whoami');
    if (r.status === 200) break;
    await sleep(100);
  }
  return {
    port,
    isAlive: () => !exited,
    stop: async () => {
      if (!exited) { child.kill(); await sleep(200); }
      fs.rmSync(home, { recursive: true, force: true });
    },
  };
}

test('un chemin commençant par // reçoit 400 et le serveur reste en ligne', async () => {
  const s = await startServer();
  try {
    const r = await get(s.port, '//');
    assert.strictEqual(r.status, 400);
    assert.strictEqual(r.body, 'Requête invalide.');
    await sleep(300);
    assert.ok(s.isAlive(), 'le processus serveur ne doit pas s’arrêter');
    const after = await get(s.port, '/api/whoami');
    assert.strictEqual(after.status, 200);
  } finally {
    await s.stop();
  }
});

test('un % invalide dans la requête ne fait pas planter le serveur', async () => {
  const s = await startServer();
  try {
    await get(s.port, '/%E0%A4%A');
    await get(s.port, '/?p=%');
    await get(s.port, '/api/snapshot?p=%ZZ');
    await sleep(300);
    assert.ok(s.isAlive(), 'le processus serveur ne doit pas s’arrêter');
    const after = await get(s.port, '/api/whoami');
    assert.strictEqual(after.status, 200);
  } finally {
    await s.stop();
  }
});
