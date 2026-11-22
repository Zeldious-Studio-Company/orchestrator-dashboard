// Tests des points 2 et 5 de l'audit (issues #2 et #5). Lancer : node --test test/   (Node 18+, aucune dépendance).
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

// ---------- point 2 : exécutables cherchés dans le dossier courant (Windows) ----------
test('tasklist et explorer sont appelés par leur chemin absolu', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib.cjs'), 'utf8') + fs.readFileSync(path.join(ROOT, 'server.cjs'), 'utf8');
  assert.doesNotMatch(src, /execFile\(\s*'tasklist'/, "execFile('tasklist') par son nom");
  assert.doesNotMatch(src, /cmd\s*=\s*'explorer\.exe'/, "explorer.exe par son nom");
});
test('un tasklist.exe déposé dans le dossier courant n\'est pas lancé', { skip: process.platform !== 'win32' }, () => {
  const dir = tmp('cwd');
  // programme inoffensif renommé : s'il est lancé à la place du vrai, la liste des processus est vide
  fs.copyFileSync(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'hostname.exe'), path.join(dir, 'tasklist.exe'));
  const code = `const L=require(${JSON.stringify(path.join(ROOT, 'lib.cjs'))});L.refreshProcs().then(()=>process.stdout.write(String(L.pidAlive(process.pid))))`;
  const out = execFileSync(process.execPath, ['-e', code], { cwd: dir, encoding: 'utf8' });
  assert.strictEqual(out, 'true', 'le tasklist.exe du dossier courant a été lancé à la place de celui de Windows');
});

// ---------- point 5 : /api/open revérifie chemin réel et nature au clic ----------
function freePort() { return new Promise((r) => { const s = http.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); }); }
function req(port, p, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port, path: p, method, headers: { host: `127.0.0.1:${port}`, ...headers } }, (res) => {
      let b = ''; res.setEncoding('utf8'); res.on('data', (d) => { b += d; }); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: b }));
    });
    r.on('error', reject); if (body) r.write(body); r.end();
  });
}
async function startServer(projectDir) {
  const home = tmp('home');
  const env = { ...process.env, ORCH_DASHBOARD_HOME: home, CLAUDE_CONFIG_DIR: home, ORCH_DASHBOARD_TOKEN: crypto.randomBytes(24).toString('hex') };
  if (projectDir) execFileSync(process.execPath, [path.join(ROOT, 'server.cjs'), 'add', projectDir], { env });
  const port = await freePort();
  const child = spawn(process.execPath, [path.join(ROOT, 'server.cjs'), 'serve', String(port)], { env, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { if ((await req(port, '/api/whoami')).status === 200) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
  return { port, token: env.ORCH_DASHBOARD_TOKEN, stop: () => child.kill() };
}

test('au clic, un dossier remplacé par un fichier n\'est pas ouvert', async () => {
  const proj = tmp('open');
  fs.mkdirSync(path.join(proj, 'outil.bat'));
  fs.writeFileSync(path.join(proj, '.orchestrator-dashboard.json'), JSON.stringify({ tasks: [{ id: 't', title: 'x', steps: [{ text: 'ouvre', path: 'outil.bat' }] }] }));
  const s = await startServer(proj);
  try {
    const cookie = String((await req(s.port, `/?k=${s.token}`)).headers['set-cookie']).split(';')[0];
    const snap = JSON.parse((await req(s.port, '/api/snapshot', { headers: { cookie } })).body);
    const ref = snap.tasks[0].steps[0].open.ref;
    fs.rmdirSync(path.join(proj, 'outil.bat'));
    fs.writeFileSync(path.join(proj, 'outil.bat'), '@echo test\r\n');
    const r = await req(s.port, '/api/open', { method: 'POST', headers: { cookie, origin: `http://127.0.0.1:${s.port}`, 'content-type': 'application/json' }, body: JSON.stringify({ ref, project: snap.projectId }) });
    assert.strictEqual(r.status, 404, 'le fichier aurait été passé à explorer.exe comme un dossier');
  } finally { s.stop(); }
});
