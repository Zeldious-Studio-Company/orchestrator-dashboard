// Tests des points 2 et 5 de l'audit (issues #2 et #5). Lancer : node --test test/issue-2.test.cjs   (Node 18+, aucune dépendance).
// Les tests « espion » ne tournent que sous Windows (ailleurs : ignorés).
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
const SERVER = path.join(ROOT, 'server.cjs');
const LIB = path.join(ROOT, 'lib.cjs');
const WIN = process.platform === 'win32';
const SYSROOT = process.env.SystemRoot || 'C:\\Windows';
const tmp = (n) => fs.mkdtempSync(path.join(os.tmpdir(), `od-${n}-`));
const same = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();

// ---------- espion : enregistre les appels à execFile / spawn ----------
// Chargé avant le code testé (node -r). execFile ne lance rien (rappel immédiat, sortie vide) ;
// spawn est transmis tel quel (le serveur détaché doit tourner). Chaque appel part dans ORCH_SPY_FILE.
function writeSpy(dir) {
  const f = path.join(dir, 'spy.cjs');
  fs.writeFileSync(f, `'use strict';
const fs = require('fs');
const cp = require('child_process');
const rec = (o) => fs.appendFileSync(process.env.ORCH_SPY_FILE, JSON.stringify(o) + '\\n');
const realSpawn = cp.spawn;
cp.execFile = function (cmd, args, opts, cb) {
  rec({ kind: 'execFile', cmd, args, procCwd: process.cwd() });
  const done = typeof opts === 'function' ? opts : cb;
  process.nextTick(() => { if (done) done(null, '', ''); });
  return { on() { return this; } };
};
cp.spawn = function (cmd, args, opts) {
  rec({ kind: 'spawn', cmd, args, cwd: opts && opts.cwd });
  return realSpawn.apply(this, arguments);
};
`);
  return f;
}
function readSpy(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}
// vrai si cmd est exactement le chemin absolu attendu de l'outil Windows (ex. %SystemRoot%\System32	asklist.exe)
function isSysTool(cmd, expected) {
  return path.win32.isAbsolute(cmd) && same(cmd, expected);
}

// ---------- point 2 : exécutables cherchés dans le dossier courant (Windows) ----------
test('tasklist et explorer sont appelés par leur chemin absolu (lecture du source)', () => {
  const src = fs.readFileSync(LIB, 'utf8') + fs.readFileSync(SERVER, 'utf8');
  assert.doesNotMatch(src, /execFile\(\s*'tasklist'/, "execFile('tasklist') par son nom");
  assert.doesNotMatch(src, /cmd\s*=\s*'explorer\.exe'/, "explorer.exe par son nom");
});

test('tasklist est appelé par son chemin absolu sous %SystemRoot% (espion)', { skip: !WIN }, () => {
  const dir = tmp('spy-tasklist');
  const log = path.join(dir, 'calls.jsonl');
  execFileSync(process.execPath, ['-r', writeSpy(dir), '-e', `require(${JSON.stringify(LIB)}).refreshProcs()`],
    { cwd: dir, env: { ...process.env, ORCH_SPY_FILE: log } });
  const calls = readSpy(log).filter((c) => c.kind === 'execFile');
  assert.strictEqual(calls.length, 1, `tasklist attendu une fois, reçu ${calls.length}`);
  assert.ok(isSysTool(calls[0].cmd, path.win32.join(SYSROOT, 'System32', 'tasklist.exe')), `tasklist lancé comme "${calls[0].cmd}" au lieu de %SystemRoot%\\System32\\tasklist.exe`);
});

// Leurre : un tasklist.exe déposé dans le dossier courant. Ce test n'est discriminant que sur les anciennes
// versions de Node (libuv qui cherchait dans le dossier courant, ex. Node 18). Sous Node récent, Windows ne
// lance plus ce leurre : il passe donc aussi sur l'ancien code. Le test espion ci-dessus prouve le correctif.
test('un tasklist.exe déposé dans le dossier courant n\'est pas lancé (leurre, discriminant sur Node 18 seulement)', { skip: !WIN }, () => {
  const dir = tmp('cwd');
  // programme inoffensif renommé : s'il est lancé à la place du vrai, la liste des processus est vide
  fs.copyFileSync(path.join(SYSROOT, 'System32', 'hostname.exe'), path.join(dir, 'tasklist.exe'));
  const code = `const L=require(${JSON.stringify(LIB)});L.refreshProcs().then(()=>process.stdout.write(String(L.pidAlive(process.pid))))`;
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
// opts : { spy, log, cwd } pour lancer serve avec l'espion et un dossier courant donné
async function startServer(projectDir, opts = {}) {
  const home = tmp('home');
  const env = { ...process.env, ORCH_DASHBOARD_HOME: home, CLAUDE_CONFIG_DIR: home, ORCH_DASHBOARD_TOKEN: crypto.randomBytes(24).toString('hex') };
  if (projectDir) execFileSync(process.execPath, [SERVER, 'add', projectDir], { env });
  const port = await freePort();
  const args = opts.spy ? ['-r', opts.spy, SERVER, 'serve', String(port)] : [SERVER, 'serve', String(port)];
  if (opts.log) env.ORCH_SPY_FILE = opts.log;
  const child = spawn(process.execPath, args, { env, cwd: opts.cwd, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { if ((await req(port, '/api/whoami')).status === 200) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
  return { port, token: env.ORCH_DASHBOARD_TOKEN, stop: () => child.kill() };
}
async function session(s) {
  const cookie = String((await req(s.port, `/?k=${s.token}`)).headers['set-cookie']).split(';')[0];
  const snap = JSON.parse((await req(s.port, '/api/snapshot', { headers: { cookie } })).body);
  return { cookie, snap };
}
function openReq(s, cookie, ref, project) {
  return req(s.port, '/api/open', { method: 'POST', headers: { cookie, origin: `http://127.0.0.1:${s.port}`, 'content-type': 'application/json' }, body: JSON.stringify({ ref, project }) });
}
function projectWith(dirName) {
  const proj = tmp('proj');
  fs.mkdirSync(path.join(proj, dirName));
  fs.writeFileSync(path.join(proj, '.orchestrator-dashboard.json'), JSON.stringify({ tasks: [{ id: 't', title: 'x', steps: [{ text: 'ouvre', path: dirName }] }] }));
  return proj;
}

test('/api/open lance explorer.exe par son chemin absolu, depuis le dossier de l\'outil (espion)', { skip: !WIN }, async () => {
  const dir = tmp('spy-open');
  const log = path.join(dir, 'calls.jsonl');
  const leurre = tmp('leurre-open'); // dossier courant du serveur : contient un faux explorer.exe
  fs.copyFileSync(path.join(SYSROOT, 'System32', 'hostname.exe'), path.join(leurre, 'explorer.exe'));
  const s = await startServer(projectWith('dossier-test'), { spy: writeSpy(dir), log, cwd: leurre });
  try {
    const { cookie, snap } = await session(s);
    const r = await openReq(s, cookie, snap.tasks[0].steps[0].open.ref, snap.projectId);
    assert.strictEqual(r.status, 200, 'le dossier aurait dû être ouvert');
    const ex = readSpy(log).filter((c) => c.kind === 'execFile' && /explorer/i.test(c.cmd));
    assert.strictEqual(ex.length, 1, `explorer attendu une fois, reçu ${ex.length}`);
    assert.ok(isSysTool(ex[0].cmd, path.win32.join(SYSROOT, 'explorer.exe')), `explorer lancé comme "${ex[0].cmd}" au lieu de %SystemRoot%\\explorer.exe`);
    assert.ok(same(ex[0].procCwd, ROOT), `le serveur tourne dans "${ex[0].procCwd}" au lieu du dossier de l'outil "${ROOT}"`);
  } finally { s.stop(); }
});

test('le serveur détaché (start) est lancé avec cwd = dossier de l\'outil (espion)', { skip: !WIN }, async () => {
  const dir = tmp('spy-start');
  const log = path.join(dir, 'calls.jsonl');
  const leurre = tmp('leurre-start');
  const home = tmp('home');
  const env = { ...process.env, ORCH_DASHBOARD_HOME: home, CLAUDE_CONFIG_DIR: home, ORCH_SPY_FILE: log };
  const port = await freePort();
  try {
    execFileSync(process.execPath, ['-r', writeSpy(dir), SERVER, 'start', projectWith('dossier-test'), String(port)], { cwd: leurre, env });
    const sp = readSpy(log).filter((c) => c.kind === 'spawn' && c.args && c.args.includes('serve'));
    assert.strictEqual(sp.length, 1, `serve attendu une fois, reçu ${sp.length}`);
    assert.ok(sp[0].cwd && same(sp[0].cwd, ROOT), `serveur détaché lancé avec cwd "${sp[0].cwd}" au lieu de "${ROOT}"`);
  } finally {
    try { execFileSync(process.execPath, [SERVER, 'stop'], { cwd: leurre, env }); } catch {}
  }
});

test('au clic, un dossier remplacé par un fichier n\'est pas ouvert', async () => {
  const proj = projectWith('outil-dossier');
  const s = await startServer(proj);
  try {
    const { cookie, snap } = await session(s);
    const ref = snap.tasks[0].steps[0].open.ref;
    fs.rmdirSync(path.join(proj, 'outil-dossier'));
    fs.writeFileSync(path.join(proj, 'outil-dossier'), 'texte inoffensif\r\n');
    const r = await openReq(s, cookie, ref, snap.projectId);
    assert.strictEqual(r.status, 404, 'le fichier aurait été passé à explorer.exe comme un dossier');
  } finally { s.stop(); }
});
