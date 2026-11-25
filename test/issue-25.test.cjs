// Issue #25 : écrire un message à une session (POST /api/message). Réutilise le socle de l'issue #24 : jeton, Origin,
// Content-Type, corps borné, cible résolue côté serveur, confirmation, sans shell, environnement sans ORCH_DASHBOARD_*,
// verrou par session, journal sans texte. Le texte part par l'entrée standard, jamais dans les arguments. Le binaire
// claude est remplacé par un faux script (ORCH_DASHBOARD_CLAUDE) ; aucun vrai claude n'est lancé.
// Lancer : node --test test/issue-25.test.cjs   (Node 18+, aucune dépendance)
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
test('messageText : mention de l\'agent ou du workflow ajoutée par le serveur ; message seul sinon', () => {
  assert.strictEqual(L.messageText('bonjour', 'a:reviewer', { name: 'x', kind: 'worker' }), 'Pour l\'agent reviewer : bonjour');
  assert.strictEqual(L.messageText('bonjour', 's:w1', { id: 'w1', name: 'Pipeline', kind: 'workflow' }), 'Pour le workflow « Pipeline » : bonjour');
  assert.strictEqual(L.messageText('bonjour', 's:s1', { id: 's1', name: 'Session', kind: 'worker' }), 'bonjour');
  assert.strictEqual(L.messageText('bonjour', 's:s1', null), 'bonjour');
});

test('MESSAGE_MAX_CHARS : 4000 caractères, distinct du plafond de la relance', () => {
  assert.strictEqual(L.MESSAGE_MAX_CHARS, 4000);
  assert.strictEqual(L.ACTION_BODY_MAX, 8192);
});

// ---------- source : interface, documentation, aucun shell ----------
test('aucun shell : le lancement déclare shell: false et n\'utilise jamais shell: true', () => {
  for (const f of ['server.cjs', 'lib.cjs']) assert.ok(!/shell\s*:\s*true/.test(read(f)), `${f} ne doit pas utiliser shell: true`);
  assert.ok(/shell:\s*false/.test(read('server.cjs')));
});

test('interface : pas de innerHTML ; libellés msg.* présents en français et en anglais ; pied de page mentionne l\'envoi', () => {
  const src = read('app.js');
  assert.ok(!/innerHTML|insertAdjacentHTML|outerHTML/.test(src));
  assert.ok(!/\son[a-z]+\s*=\s*['"]/.test(src.replace(/\/\/.*$/gm, '')), 'pas d\'attribut on*= dans le HTML construit');
  const start = src.indexOf('const DICT = ') + 'const DICT = '.length;
  const end = src.indexOf('\n};', start) + 3;
  const DICT = vm.runInNewContext('(' + src.slice(start, end).replace(/;\s*$/, '') + ')');
  const fr = Object.keys(DICT.fr).filter((k) => k.startsWith('msg.'));
  const en = Object.keys(DICT.en).filter((k) => k.startsWith('msg.'));
  assert.ok(fr.length >= 15, 'libellés fr présents');
  assert.deepStrictEqual(fr.slice().sort(), en.slice().sort());
  for (const k of fr) assert.ok(DICT.fr[k] && DICT.en[k], `libellé en et fr : ${k}`);
  assert.ok(/message/.test(DICT.fr['footer.ro']), 'pied de page fr mentionne l\'envoi d\'un message');
  assert.ok(/message/.test(DICT.en['footer.ro']), 'pied de page en mentionne l\'envoi d\'un message');
  assert.ok(/\/api\/message/.test(src), 'la page appelle POST /api/message');
  assert.ok(!/\/api\/message\?/.test(src), 'le texte ne passe jamais dans l\'adresse');
});

test('documentation : l\'envoi de message est décrit dans SECURITY, README, FORMAT (fr et en)', () => {
  assert.ok(/Writing a message to a session/.test(read('SECURITY.md')));
  assert.ok(/4000 characters/.test(read('SECURITY.md')));
  for (const f of ['README.md', 'README.fr.md']) assert.ok(/message/i.test(read(f)), `${f} décrit l'envoi`);
  for (const f of ['FORMAT.md', 'FORMAT.fr.md']) assert.ok(/writable|écrivable/.test(read(f)), `${f} décrit l'envoi`);
  assert.ok(/POST \/api\/message/.test(read('server.cjs')), 'en-tête de server.cjs décrit la route');
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
  "  setTimeout(() => process.exit(input.includes('__EXIT1__') ? 1 : 0), Number(process.env.FAKE_CLAUDE_SLEEP || 0));",
  '});',
].join('\n');

const TOKEN = crypto.randomBytes(24).toString('hex');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-issue25-'));
const HOME = path.join(TMP, 'home');
const CLAUDE_CFG = path.join(TMP, 'claude-config');
const PROJ = path.join(TMP, 'projet');
const FAKE_BIN = path.join(TMP, 'fake-claude.cjs');
const OUT = path.join(TMP, 'fake-out.json');
const PID = server.projectId(PROJ);
const sanitize = (d) => path.resolve(d).replace(/[^a-zA-Z0-9]/g, '-');
const LONG = 'a'.repeat(4000);
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
const readOut = () => { try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { return null; } };
const message = (target, text, extra = {}) => call('POST', '/api/message', { body: { project: PID, target, confirm: true, text, ...extra } });
const waitIdle = (sid) => waitFor(async () => { const s = await snapshot(); return s.runs && s.runs[sid] && s.runs[sid].state !== 'running' ? s.runs[sid] : null; });

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
      sess('w1', { kind: 'workflow', name: 'Pipeline', claudeSessionId: 'sess-wf-0005' }),
    ],
    agents: [{ session: 's1', name: 'reviewer', status: 'failed', id: 'r1' }],
    tasks: [],
  }));
  // transcrits : anciens (deux heures) sauf sess-new-0002, modifié à l'instant (session peut-être utilisée ailleurs)
  const tdir = path.join(CLAUDE_CFG, 'projects', sanitize(PROJ));
  fs.mkdirSync(tdir, { recursive: true });
  const old = new Date(Date.now() - 2 * 3600 * 1000);
  for (const sid of ['sess-old-0001', 'sess-live-0003', 'sess-wf-0005']) {
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
  assert.strictEqual((await call('GET', '/api/message')).status, 405);
  assert.strictEqual((await call('POST', '/api/message', { headers: { cookie: null }, body: { project: PID, target: 's:s1', confirm: true, text: 'x' } })).status, 401);
  assert.strictEqual((await call('POST', '/api/message', { headers: { origin: 'http://evil.example' }, body: { project: PID, target: 's:s1', confirm: true, text: 'x' } })).status, 403);
  assert.strictEqual((await call('POST', '/api/message', { headers: { 'content-type': 'text/plain' }, body: { project: PID, target: 's:s1', confirm: true, text: 'x' } })).status, 415);
  const big = await call('POST', '/api/message', { body: { project: PID, target: 's:s1', confirm: true, text: 'x', pad: 'x'.repeat(9000) } });
  assert.strictEqual(big.status, 413);
  assert.strictEqual(fs.existsSync(OUT), false, 'aucun processus lancé par les refus');
});

test('corps : confirmation absente 400 ; texte absent ou vide 400 ; texte de plus de 4000 caractères 413 ; JSON invalide 400', async () => {
  assert.deepStrictEqual((await call('POST', '/api/message', { body: { project: PID, target: 's:s1', text: 'x' } })).json, { error: 'confirm' });
  assert.deepStrictEqual((await call('POST', '/api/message', { body: { project: PID, target: 's:s1', confirm: true } })).json, { error: 'text' });
  assert.strictEqual((await message('s:s1', '   ')).status, 400);
  const over = await message('s:s1', 'a'.repeat(4001));
  assert.strictEqual(over.status, 413);
  assert.deepStrictEqual(over.json, { error: 'large' });
  assert.strictEqual((await call('POST', '/api/message', { body: '{pas du json' })).status, 400);
  assert.strictEqual((await call('POST', '/api/message', { body: { project: 'pas-un-id', target: 's:s1', confirm: true, text: 'x' } })).status, 400);
  assert.strictEqual((await call('POST', '/api/message', { body: { project: 'ffffffffff', target: 's:s1', confirm: true, text: 'x' } })).status, 404);
  assert.strictEqual(fs.existsSync(OUT), false, 'aucun processus lancé par les refus');
});

test('cibles : inconnue 404 ; « Toi », outil, session vivante, sans identifiant, transcrit récent 409 avec raison ; aucun lancement', async () => {
  assert.deepStrictEqual((await message('s:ghost', 'bonjour')).json, { error: 'unknown' });
  assert.strictEqual((await message('s:ghost', 'bonjour')).status, 404);
  assert.deepStrictEqual((await message('in:human', 'bonjour')).json, { error: 'refused', reason: 'you' });
  assert.deepStrictEqual((await message('t:git', 'bonjour')).json, { error: 'refused', reason: 'tool' });
  assert.deepStrictEqual((await message('s:s3', 'bonjour')).json, { error: 'refused', reason: 'alive' });
  assert.deepStrictEqual((await message('s:s4', 'bonjour')).json, { error: 'refused', reason: 'noSession' });
  assert.deepStrictEqual((await message('s:s2', 'bonjour')).json, { error: 'refused', reason: 'recent' });
  assert.strictEqual(fs.existsSync(OUT), false, 'aucun processus lancé par les refus');
});

test('lancement : 202, arguments fixes sans le texte, texte par l\'entrée standard, dossier du projet, environnement sans jeton', async () => {
  const dangerous = '--dangerously-skip-permissions ; rm -rf / $(id) "quotes"';
  const r = await message('s:s1', dangerous);
  assert.strictEqual(r.status, 202);
  assert.deepStrictEqual(r.json, { ok: true, state: 'running' });
  const out = await waitFor(readOut);
  assert.deepStrictEqual(out.argv, ['-p', '--resume', 'sess-old-0001', '--output-format', 'json']);
  assert.ok(!out.argv.join(' ').includes('dangerously'), 'le texte n\'est jamais dans les arguments');
  assert.strictEqual(out.stdin, dangerous, 'session ordinaire : le message seul, sans mention');
  assert.strictEqual(fs.realpathSync.native(out.cwd), fs.realpathSync.native(PROJ));
  assert.ok(!out.envNames.some((k) => /^ORCH_DASHBOARD_/i.test(k)), 'aucune variable ORCH_DASHBOARD_*');
  assert.ok(!out.envNames.includes('ORCH_DASHBOARD_TOKEN'));
  await waitIdle('s1');
});

test('une seule exécution par session : second envoi 409 pendant le premier, puis état « terminé »', async () => {
  fs.rmSync(OUT, { force: true });
  assert.strictEqual((await message('s:s1', 'premier')).status, 202);
  const again = await message('s:s1', 'second');
  assert.strictEqual(again.status, 409);
  assert.deepStrictEqual(again.json, { error: 'refused', reason: 'running' });
  const st = await waitIdle('s1');
  assert.strictEqual(st.state, 'done');
  assert.strictEqual(st.code, 0);
  assert.strictEqual(JSON.stringify(await snapshot()).includes('premier'), false, 'le texte n\'est pas exposé dans l\'instantané');
});

test('échec : code de sortie non nul → état failed, code 1, raison exit', async () => {
  fs.rmSync(OUT, { force: true });
  assert.strictEqual((await message('s:s1', '__EXIT1__')).status, 202);
  const st = await waitIdle('s1');
  assert.strictEqual(st.state, 'failed');
  assert.strictEqual(st.code, 1);
  assert.strictEqual(st.reason, 'exit');
});

test('plafond : 4000 caractères exacts acceptés ; le sous-agent écrit à sa session avec la mention de l\'agent', async () => {
  fs.rmSync(OUT, { force: true });
  assert.strictEqual((await message('a:reviewer', LONG)).status, 202);
  const out = await waitFor(readOut);
  assert.deepStrictEqual(out.argv.slice(0, 3), ['-p', '--resume', 'sess-old-0001']);
  assert.strictEqual(out.stdin, 'Pour l\'agent reviewer : ' + LONG);
  await waitIdle('s1');
});

test('workflow : la session de kind workflow reçoit son message avec la mention du workflow', async () => {
  fs.rmSync(OUT, { force: true });
  assert.strictEqual((await message('s:w1', 'bonjour')).status, 202);
  const out = await waitFor(readOut);
  assert.deepStrictEqual(out.argv.slice(0, 3), ['-p', '--resume', 'sess-wf-0005']);
  assert.strictEqual(out.stdin, 'Pour le workflow « Pipeline » : bonjour');
  await waitIdle('w1');
});

test('lancement synchrone impossible : startRun renvoie null, état failed, aucune ligne de journal (l\'appelant journalise)', () => {
  const lines = [];
  const key = 'test|sync';
  const r = server.startRun(key, { file: 'bad\0name', args: [], cwd: TMP, text: '', log: (o) => lines.push(o) });
  assert.strictEqual(r, null);
  assert.strictEqual(server.RUNS.get(key).state, 'failed');
  assert.strictEqual(server.RUNS.get(key).reason, 'spawn');
  assert.deepStrictEqual(lines, []);
});

const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
test('délai maximal : processus et petit-enfant arrêtés, état failed (timeout), journal « délai dépassé »', async () => {
  const TREE = path.join(TMP, 'tree-claude.cjs');
  const PIDS = path.join(TMP, 'tree-pids.json');
  fs.writeFileSync(TREE, [
    "'use strict';",
    "const fs = require('fs');",
    "const { spawn } = require('child_process');",
    "const g = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });",
    "fs.writeFileSync(process.argv[2], JSON.stringify({ grandchild: g.pid, child: process.pid }));",
    'setInterval(() => {}, 1000);',
  ].join('\n') + '\n');
  const lines = [];
  const key = 'test|tree';
  const child = server.startRun(key, { file: process.execPath, args: [TREE, PIDS], cwd: TMP, text: '', log: (o) => lines.push(o), maxMs: 3000 });
  assert.ok(child, 'lancement');
  let pids = null;
  try {
    pids = await waitFor(() => { try { return JSON.parse(fs.readFileSync(PIDS, 'utf8')); } catch { return null; } });
    await waitFor(() => child.exitCode !== null || child.signalCode !== null);
    const st = server.RUNS.get(key);
    assert.strictEqual(st.state, 'failed');
    assert.strictEqual(st.reason, 'timeout', 'la sortie du processus ne doit pas écraser le délai');
    assert.ok(lines.includes('délai dépassé'), 'journal : délai dépassé');
    await waitFor(() => !alive(pids.grandchild));
    assert.ok(!alive(pids.child), 'le processus lui-même est arrêté');
  } finally {
    for (const p of [pids && pids.grandchild, pids && pids.child, child && child.pid]) {
      if (p && alive(p)) { try { process.kill(p, 'SIGKILL'); } catch {} }
    }
  }
});

test('journal : une ligne à l\'envoi et une à la fin (route, cible, taille, issue), jamais le texte', async () => {
  const log = fs.readFileSync(path.join(HOME, 'server.log'), 'utf8');
  assert.match(log, /message cible=s:s1 texte=\d+ issue=lancé/);
  assert.match(log, /message cible=s:s1 texte=\d+ issue=terminé \(code 0\)/);
  assert.match(log, /message cible=a:reviewer texte=4000 issue=lancé/);
  assert.match(log, /message cible=in:human texte=\d+ issue=refus : you/);
  assert.match(log, /message cible=s:s1 texte=\d+ issue=échec : code 1/);
  assert.match(log, /message cible=- texte=- issue=corps trop volumineux/);
  assert.match(log, /message cible=s:ghost texte=\d+ issue=projet inconnu|message cible=s:ghost texte=\d+ issue=cible inconnue/);
  assert.ok(!log.includes('premier') && !log.includes('bonjour') && !log.includes('dangerously'), 'aucun texte journalisé');
  assert.ok(!log.includes(LONG.slice(0, 50)), 'le texte long n\'est pas journalisé');
});

// QA (issue 25) : la limite de 8 Ko s'applique en octets ; la documentation annonce le plafond effectif
test('limite d\'octets : 2600 caractères chinois tiennent dans 8 Ko, 3000 non ; la documentation annonce les deux limites', () => {
  const body = (text) => Buffer.byteLength(JSON.stringify({ project: '0123456789', target: 's:s1', confirm: true, text }));
  assert.ok(body('\u4e2d'.repeat(2600)) <= L.ACTION_BODY_MAX);
  assert.ok(body('\u4e2d'.repeat(3000)) > L.ACTION_BODY_MAX);
  assert.match(read('SECURITY.md'), /about 2700 characters/);
  assert.match(read('README.md'), /about 2700 CJK characters/);
  assert.match(read('README.fr.md'), /environ 2700 caractères CJK/);
});

// QA (issue 25) : le message envoyé ne promet pas une réponse affichée dans le nœud
test('libellé « message envoyé » : pas de promesse de réponse dans le nœud (fr et en)', () => {
  const src = read('app.js');
  const start = src.indexOf('const DICT = ') + 'const DICT = '.length;
  const end = src.indexOf('\n};', start) + 3;
  const DICT = vm.runInNewContext('(' + src.slice(start, end).replace(/;\s*$/, '') + ')');
  for (const lang of ['fr', 'en']) assert.doesNotMatch(DICT[lang]['msg.sent'], /apparaîtra|will appear/);
});
