// Issue #24 : relance d'une session bloquée (POST /api/relaunch). Socle de sécurité : jeton, Origin, Content-Type,
// corps borné, cible résolue côté serveur, confirmation, sans shell, environnement sans ORCH_DASHBOARD_*, journal sans
// texte. Le binaire claude est remplacé par un faux script (ORCH_DASHBOARD_CLAUDE) ; aucun vrai claude n'est lancé.
// Lancer : node --test test/issue-24.test.cjs   (Node 18+, aucune dépendance)
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const http = require('node:http');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { spawn } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const L = require(path.join(ROOT, 'lib.cjs'));
const server = require(path.join(ROOT, 'server.cjs'));
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

// ---------- fonctions pures (lib.cjs) ----------
test('SID_RE : pas de tiret en tête, 8 à 80 caractères, aucun caractère hors liste', () => {
  assert.ok(L.SID_RE.test('abcdefgh'));
  assert.ok(L.SID_RE.test('a'.repeat(80)));
  assert.ok(!L.SID_RE.test('a'.repeat(81)));
  assert.ok(!L.SID_RE.test('abcdefg'));
  for (const bad of ['-abcdefgh', '--dangerously-skip-permissions', 'abc def gh', 'abc;rm -rf /', 'ab/cdefgh', 'ab"cdefgh', '']) {
    assert.ok(!L.SID_RE.test(bad), `refusé : ${bad}`);
  }
});

test('resumeArgs : arguments fixes ; identifiant refusé avant tout ; drapeau de permission seulement si permis', () => {
  const base = ['-p', '--resume', 'abcdefgh1234', '--output-format', 'json'];
  assert.deepStrictEqual(L.resumeArgs('abcdefgh1234'), base);
  assert.deepStrictEqual(L.resumeArgs('abcdefgh1234', 'acceptEdits'), [...base, '--permission-mode', 'acceptEdits']);
  // un réglage hors liste n'ajoute rien
  assert.deepStrictEqual(L.resumeArgs('abcdefgh1234', '--dangerously-skip-permissions'), base);
  // injection d'option par l'identifiant : refusée, aucun argument produit
  assert.throws(() => L.resumeArgs('--dangerously-skip-permissions'));
  assert.throws(() => L.resumeArgs('-abcdefgh'));
  assert.ok(!L.resumeArgs('abcdefgh1234').includes('--dangerously-skip-permissions'));
});

test('relaunchPlan : session prête, vivante, sans identifiant, identifiant avec tiret, sous-agents selon leur propriétaire', () => {
  const snap = {
    sessions: [
      { id: 'a1', alive: false, claudeSessionId: 'sess-aaaa1' },
      { id: 'a2', alive: true, claudeSessionId: 'sess-bbbb2' },
      { id: 'a3', alive: false, claudeSessionId: null },
      { id: 'a4', alive: false, claudeSessionId: '-invalid1' },
      { id: 'a5', alive: false, claudeSessionId: 'sess-eeee5' },
      { id: 'a6', alive: false, claudeSessionId: 'sess-ffff6' },
    ],
    agents: [
      { session: 'a1', agentTypes: { reviewer: { total: 1 } } },
      { session: 'human', agentTypes: { tester: { total: 1 } } },
      { session: 'a1', agentTypes: { shared: { total: 1 } } },
      { session: 'a5', agentTypes: { shared: { total: 1 } } },
      { session: 'a6', agentTypes: { orphan: { total: 1 } } },
      { session: 'ghost', agentTypes: { lost: { total: 1 } } },
    ],
  };
  const p = L.relaunchPlan(snap);
  assert.deepStrictEqual(p['s:a1'], { ok: true, reason: 'ok', session: 'a1' });
  assert.deepStrictEqual(p['s:a2'], { ok: false, reason: 'alive', session: 'a2' });
  assert.strictEqual(p['s:a3'].reason, 'noSession');
  assert.strictEqual(p['s:a4'].reason, 'noSession');
  assert.deepStrictEqual(p['a:reviewer'], { ok: true, reason: 'ok', session: 'a1' });
  assert.strictEqual(p['a:tester'].reason, 'humanOwner');
  assert.strictEqual(p['a:shared'].reason, 'ambiguous');
  assert.strictEqual(p['a:orphan'].session, 'a6');
  assert.strictEqual(p['a:lost'].reason, 'unknownOwner');
  assert.strictEqual(L.relaunchPlan(null)['s:x'], undefined);
});

test('refusalOf : « Toi », « Événements », quotas et outils ont une raison ; un nœud de session n\'en a pas', () => {
  assert.strictEqual(L.refusalOf('in:human'), 'you');
  assert.strictEqual(L.refusalOf('in:watch'), 'events');
  assert.strictEqual(L.refusalOf('in:quota'), 'quota');
  assert.strictEqual(L.refusalOf('t:git'), 'tool');
  assert.strictEqual(L.refusalOf('s:a1'), null);
  assert.strictEqual(L.refusalOf('a:+'), null);
});

test('childEnv : aucune variable ORCH_DASHBOARD_* (dont le jeton), les autres sont gardées', () => {
  const env = { ORCH_DASHBOARD_TOKEN: 'x'.repeat(48), orch_dashboard_claude: 'y', PATH: '/bin', HOME: '/home/u' };
  assert.deepStrictEqual(L.childEnv(env), { PATH: '/bin', HOME: '/home/u' });
});

test('claudeCommand : .cmd refusé, script .cjs lancé par node, fichier absent refusé, PATH relatif ignoré', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-issue24-bin-'));
  const oldPath = process.env.PATH;
  try {
    const cmd = path.join(dir, 'claude.cmd'); fs.writeFileSync(cmd, '@echo off\n');
    const cjs = path.join(dir, 'fake.cjs'); fs.writeFileSync(cjs, 'process.exit(0)\n');
    const exe = path.join(dir, 'claude-bin'); fs.writeFileSync(exe, '');
    assert.strictEqual(L.claudeCommand({ claudePath: cmd }).error, 'cmd');
    assert.strictEqual(L.claudeCommand({ claudePath: path.join(dir, 'absent') }).error, 'missing');
    const c = L.claudeCommand({ claudePath: cjs });
    assert.strictEqual(c.file, process.execPath);
    assert.deepStrictEqual(c.pre, [cjs]);
    assert.deepStrictEqual(L.claudeCommand({ claudePath: exe }), { file: exe, pre: [] });
    // sans réglage : seulement des dossiers absolus du PATH (jamais le dossier courant)
    process.env.PATH = ['relatif', ''].join(path.delimiter);
    assert.strictEqual(L.claudeCommand({ claudePath: '' }).error, 'missing');
  } finally {
    if (oldPath === undefined) delete process.env.PATH; else process.env.PATH = oldPath;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('settings : claudePermissionMode seulement parmi les valeurs permises ; ORCH_DASHBOARD_CLAUDE prime sur config.json', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-issue24-cfg-'));
  const keep = { home: process.env.ORCH_DASHBOARD_HOME, claude: process.env.ORCH_DASHBOARD_CLAUDE };
  try {
    fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({ claudePermissionMode: 'bypassPermissions', claudePath: '/chemin/config' }));
    process.env.ORCH_DASHBOARD_HOME = dir;
    delete process.env.ORCH_DASHBOARD_CLAUDE;
    let s = L.settings();
    assert.strictEqual(s.claudePermissionMode, '');
    assert.strictEqual(s.claudePath, '/chemin/config');
    process.env.ORCH_DASHBOARD_CLAUDE = '/chemin/env';
    s = L.settings();
    assert.strictEqual(s.claudePath, '/chemin/env');
    fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({ claudePermissionMode: 'acceptEdits' }));
    fs.utimesSync(path.join(dir, 'config.json'), new Date(), new Date(Date.now() + 5000));
    assert.strictEqual(L.settings().claudePermissionMode, 'acceptEdits');
  } finally {
    if (keep.home === undefined) delete process.env.ORCH_DASHBOARD_HOME; else process.env.ORCH_DASHBOARD_HOME = keep.home;
    if (keep.claude === undefined) delete process.env.ORCH_DASHBOARD_CLAUDE; else process.env.ORCH_DASHBOARD_CLAUDE = keep.claude;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------- sources : aucun shell, interface sans innerHTML, libellés fr et en ----------
test('aucun lancement avec shell : server.cjs et lib.cjs n\'utilisent jamais shell: true, et le lancement le dit', () => {
  for (const f of ['server.cjs', 'lib.cjs']) assert.ok(!/shell\s*:\s*true/.test(read(f)), `${f} ne doit pas utiliser shell: true`);
  assert.ok(/shell:\s*false/.test(read('server.cjs')), 'le lancement déclare shell: false');
});

test('interface : pas de innerHTML ; libellés relaunch.* présents en français et en anglais', () => {
  const src = read('app.js');
  assert.ok(!/innerHTML|insertAdjacentHTML|outerHTML/.test(src));
  const start = src.indexOf('const DICT = ') + 'const DICT = '.length;
  const end = src.indexOf('\n};', start) + 3;
  const DICT = vm.runInNewContext('(' + src.slice(start, end).replace(/;\s*$/, '') + ')');
  const fr = Object.keys(DICT.fr).filter((k) => k.startsWith('relaunch.'));
  const en = Object.keys(DICT.en).filter((k) => k.startsWith('relaunch.'));
  assert.ok(fr.length >= 20, 'libellés fr présents');
  assert.deepStrictEqual(fr.slice().sort(), en.slice().sort());
  for (const k of fr) assert.ok(DICT.fr[k] && DICT.en[k], `libellé en et fr : ${k}`);
  assert.ok(/relance/.test(DICT.fr['footer.ro']), 'pied de page fr mentionne la relance');
  assert.ok(/relaunch/.test(DICT.en['footer.ro']), 'pied de page en mentionne la relance');
});

test('documentation : « lecture seule » ne reste pas sans son exception dans les docs et le serveur', () => {
  assert.ok(/Relaunching a blocked session/.test(read('SECURITY.md')));
  for (const f of ['README.md', 'README.fr.md', 'FORMAT.md', 'FORMAT.fr.md']) {
    assert.ok(/relaunch|relance/i.test(read(f)), `${f} décrit la relance`);
  }
  assert.ok(/relaunch|relance/i.test(read('server.cjs').split('\n').slice(0, 25).join('\n')), 'en-tête de server.cjs');
});

// ---------- route et lancement (serveur réel sur un port libre, dossier temporaire) ----------
const FAKE = [
  "'use strict';",
  "const fs = require('fs');",
  "let input = '';",
  "process.stdin.setEncoding('utf8');",
  "process.stdin.on('data', (d) => { input += d; });",
  "process.stdin.on('end', () => {",
  "  const out = { argv: process.argv.slice(2), cwd: process.cwd(), stdin: input, envNames: Object.keys(process.env) };",
  "  fs.writeFileSync(process.env.FAKE_CLAUDE_OUT, JSON.stringify(out));",
  "  setTimeout(() => process.exit(0), Number(process.env.FAKE_CLAUDE_SLEEP || 0));",
  '});',
].join('\n');

const TOKEN = crypto.randomBytes(24).toString('hex');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-issue24-'));
const HOME = path.join(TMP, 'home');
const CLAUDE_CFG = path.join(TMP, 'claude-config');
const PROJ = path.join(TMP, 'projet');
const FAKE_BIN = path.join(TMP, 'fake-claude.cjs');
const OUT = path.join(TMP, 'fake-out.json');
const PID = server.projectId(PROJ);
const sanitize = (d) => path.resolve(d).replace(/[^a-zA-Z0-9]/g, '-');
let srv = null, port = 0;

const freePort = () => new Promise((res, rej) => {
  const s = net.createServer();
  s.once('error', rej);
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
});
// appel HTTP : en-têtes par défaut conformes (Host, Origin, cookie, JSON) ; un en-tête à null est retiré
function call(method, p, { body, headers = {} } = {}) {
  const hdr = { host: `127.0.0.1:${port}`, origin: `http://127.0.0.1:${port}`, cookie: `od_k=${TOKEN}`, 'content-type': 'application/json', ...headers };
  for (const k of Object.keys(hdr)) if (hdr[k] == null) delete hdr[k];
  const data = body == null ? null : typeof body === 'string' ? body : JSON.stringify(body);
  if (data != null) hdr['content-length'] = Buffer.byteLength(data);
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port, path: p, method, headers: hdr }, (res) => {
      let b = '';
      res.setEncoding('utf8');
      res.on('data', (d) => { b += d; });
      res.on('end', () => { let j = null; try { j = JSON.parse(b); } catch {} resolve({ status: res.statusCode, text: b, json: j }); });
    });
    r.on('error', reject);
    r.end(data == null ? undefined : data);
  });
}
const waitFor = async (fn, ms = 8000) => {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error('délai dépassé');
    await new Promise((r) => setTimeout(r, 100));
  }
};
const snapshot = async () => (await call('GET', `/api/snapshot?p=${PID}`)).json;
// sortie du faux claude : null tant qu'elle n'est pas entièrement écrite
const readOut = () => { try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { return null; } };
const relaunch = (target, extra = {}) => call('POST', '/api/relaunch', { body: { project: PID, target, confirm: true, ...extra } });

before(async () => {
  fs.mkdirSync(HOME, { recursive: true });
  fs.mkdirSync(PROJ, { recursive: true });
  fs.mkdirSync(CLAUDE_CFG, { recursive: true });
  fs.writeFileSync(FAKE_BIN, FAKE + '\n');
  fs.writeFileSync(path.join(HOME, 'projects.json'), JSON.stringify({ projects: [{ dir: PROJ, adapter: 'json', file: '', added: new Date().toISOString() }] }));
  const sess = (id, extra) => ({ id, name: `Session ${id}`, kind: 'worker', alive: false, status: 'blocked', claudeSessionId: null, ...extra });
  fs.writeFileSync(path.join(PROJ, '.orchestrator-dashboard.json'), JSON.stringify({
    project: { name: 'Projet test' }, orchestrator: 'Test',
    sessions: [
      sess('s1', { claudeSessionId: 'sess-old-0001' }),
      sess('s2', { claudeSessionId: 'sess-new-0002' }),
      sess('s3', { claudeSessionId: 'sess-live-0003', alive: true }),
      sess('s4', { claudeSessionId: null }),
      sess('s5', { claudeSessionId: '--dangerously-skip-permissions' }), // identifiant invalide (QA issue #24)
    ],
    agents: [{ session: 's1', name: 'reviewer', status: 'failed', id: 'r1' }],
    tasks: [],
  }));
  // transcrits : s1 et s3 anciens (deux heures), s2 à l'instant (session possiblement utilisée ailleurs)
  const tdir = path.join(CLAUDE_CFG, 'projects', sanitize(PROJ));
  fs.mkdirSync(tdir, { recursive: true });
  const old = new Date(Date.now() - 2 * 3600 * 1000);
  for (const sid of ['sess-old-0001', 'sess-live-0003']) {
    fs.writeFileSync(path.join(tdir, `${sid}.jsonl`), '');
    fs.utimesSync(path.join(tdir, `${sid}.jsonl`), old, old);
  }
  fs.writeFileSync(path.join(tdir, 'sess-new-0002.jsonl'), '');
  port = await freePort();
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (/^ORCH_DASHBOARD_/i.test(k)) delete env[k];
  Object.assign(env, { ORCH_DASHBOARD_HOME: HOME, ORCH_DASHBOARD_TOKEN: TOKEN, ORCH_DASHBOARD_CLAUDE: FAKE_BIN, CLAUDE_CONFIG_DIR: CLAUDE_CFG, FAKE_CLAUDE_OUT: OUT, FAKE_CLAUDE_SLEEP: '1500' });
  srv = spawn(process.execPath, [path.join(ROOT, 'server.cjs'), 'serve', String(port)], { env, cwd: TMP, stdio: ['ignore', 'ignore', 'ignore'], windowsHide: true });
  await waitFor(async () => { try { return (await call('GET', '/api/whoami', { headers: { cookie: null } })).status === 200; } catch { return false; } }, 10000);
});

after(() => {
  if (srv && !srv.killed) { try { srv.kill(); } catch {} }
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
});

test('route : GET 405, sans jeton 401, Origin étranger 403, type non JSON 415, corps de plus de 8 Ko 413 ; rien ne se lance', async () => {
  assert.strictEqual((await call('GET', '/api/relaunch')).status, 405);
  assert.strictEqual((await call('POST', '/api/relaunch', { headers: { cookie: null }, body: { project: PID, target: 's:s1', confirm: true } })).status, 401);
  assert.strictEqual((await call('POST', '/api/relaunch', { headers: { origin: 'http://evil.example' }, body: { project: PID, target: 's:s1', confirm: true } })).status, 403);
  assert.strictEqual((await call('POST', '/api/relaunch', { headers: { 'content-type': 'text/plain' }, body: { project: PID, target: 's:s1', confirm: true } })).status, 415);
  const big = await call('POST', '/api/relaunch', { body: { project: PID, target: 's:s1', confirm: true, pad: 'x'.repeat(9000) } });
  assert.strictEqual(big.status, 413);
  assert.strictEqual(fs.existsSync(OUT), false, 'aucun processus lancé par les refus');
});

test('corps : confirmation absente 400, texte refusé 400, identifiant de projet invalide 400, projet inconnu 404, JSON invalide 400', async () => {
  assert.deepStrictEqual((await call('POST', '/api/relaunch', { body: { project: PID, target: 's:s1' } })).json, { error: 'confirm' });
  assert.strictEqual((await call('POST', '/api/relaunch', { body: { project: PID, target: 's:s1', confirm: true, text: 'bonjour' } })).status, 400);
  assert.strictEqual((await call('POST', '/api/relaunch', { body: { project: 'pas-un-id', target: 's:s1', confirm: true } })).status, 400);
  assert.strictEqual((await call('POST', '/api/relaunch', { body: { project: 'ffffffffff', target: 's:s1', confirm: true } })).status, 404);
  assert.strictEqual((await call('POST', '/api/relaunch', { body: '{pas du json' })).status, 400);
  assert.strictEqual(fs.existsSync(OUT), false, 'aucun processus lancé par les refus');
});

test('cibles : inconnue 404 ; « Toi », session vivante, sans identifiant, transcrit récent 409 avec raison ; aucun lancement', async () => {
  assert.deepStrictEqual((await relaunch('s:ghost')).json, { error: 'unknown' });
  assert.strictEqual((await relaunch('s:ghost')).status, 404);
  assert.deepStrictEqual((await relaunch('in:human')).json, { error: 'refused', reason: 'you' });
  assert.deepStrictEqual((await relaunch('s:s3')).json, { error: 'refused', reason: 'alive' });
  assert.deepStrictEqual((await relaunch('s:s4')).json, { error: 'refused', reason: 'noSession' });
  assert.deepStrictEqual((await relaunch('s:s2')).json, { error: 'refused', reason: 'recent' });
  assert.strictEqual(fs.existsSync(OUT), false, 'aucun processus lancé par les refus');
});

test('lancement : 202, arguments fixes, texte par l\'entrée standard, dossier du projet, environnement sans jeton', async () => {
  const r = await relaunch('s:s1');
  assert.strictEqual(r.status, 202);
  assert.deepStrictEqual(r.json, { ok: true, state: 'running' });
  const out = await waitFor(readOut);
  assert.deepStrictEqual(out.argv, ['-p', '--resume', 'sess-old-0001', '--output-format', 'json']);
  assert.strictEqual(out.stdin, L.RESUME_TEXT);
  assert.strictEqual(fs.realpathSync.native(out.cwd), fs.realpathSync.native(PROJ));
  assert.ok(!out.envNames.some((k) => /^ORCH_DASHBOARD_/i.test(k)), 'aucune variable ORCH_DASHBOARD_*');
  assert.ok(!out.envNames.includes('ORCH_DASHBOARD_TOKEN'));
});

test('une seule reprise par session : second envoi 409 pendant la reprise, puis état « terminé »', async () => {
  const again = await relaunch('s:s1');
  assert.strictEqual(again.status, 409);
  assert.deepStrictEqual(again.json, { error: 'refused', reason: 'running' });
  const s = await waitFor(async () => { const snap = await snapshot(); return snap.runs && snap.runs.s1 && snap.runs.s1.state === 'done' ? snap : null; });
  assert.strictEqual(s.runs.s1.code, 0);
  assert.strictEqual(JSON.stringify(s.runs).includes(L.RESUME_TEXT), false, 'la sortie et le texte ne sont pas exposés');
});

test('sous-agent : le nœud a:reviewer relance sa session propriétaire ; « Toi » et outils restent refusés', async () => {
  fs.rmSync(OUT, { force: true });
  assert.strictEqual((await relaunch('a:reviewer')).status, 202);
  const out = await waitFor(readOut);
  assert.deepStrictEqual(out.argv.slice(0, 3), ['-p', '--resume', 'sess-old-0001']);
  assert.deepStrictEqual((await relaunch('t:git')).json, { error: 'refused', reason: 'tool' });
  await waitFor(async () => { const snap = await snapshot(); return snap.runs.s1.state !== 'running'; });
});

test('journal : une ligne par envoi (route, cible, taille, issue), jamais le texte', async () => {
  const log = fs.readFileSync(path.join(HOME, 'server.log'), 'utf8');
  assert.match(log, /relance cible=s:s1 texte=0 issue=lancé/);
  assert.match(log, /relance cible=a:reviewer texte=0 issue=lancé/);
  assert.match(log, /relance cible=in:human texte=0 issue=refus : you/);
  assert.ok(!log.includes(L.RESUME_TEXT.slice(0, 20)), 'le texte n\'est pas journalisé');
});

// QA (issue 24) : identifiant présent mais invalide (commence par « - ») : 400 « identifiant invalide », pas 409
test('identifiant invalide présent dans le fichier du projet : 400, pas 409 ; aucun lancement', async () => {
  fs.rmSync(OUT, { force: true });
  const r = await relaunch('s:s5');
  assert.strictEqual(r.status, 400);
  assert.deepStrictEqual(r.json, { error: 'request' });
  assert.strictEqual(fs.existsSync(OUT), false, 'aucun processus lancé par les refus');
});
