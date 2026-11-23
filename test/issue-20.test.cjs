// Tests de l'issue #20 : server.json (qui contient le jeton d'accès) et le dossier d'état doivent être privés.
// Lancer : node --test test/issue-20.test.cjs   (Node 18+, aucune dépendance).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SERVER = path.join(ROOT, 'server.cjs');
const tmp = (n) => fs.mkdtempSync(path.join(os.tmpdir(), `od-${n}-`));

function freePort() { return new Promise((r) => { const s = http.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); }); }
// « start » lance le tableau de bord en arrière-plan, « stop » l'arrête
async function start(env, nodeArgs = []) {
  const port = await freePort();
  execFileSync(process.execPath, [...nodeArgs, SERVER, 'start', String(port)], { env, stdio: 'ignore' });
}
function stop(env) {
  try { execFileSync(process.execPath, [SERVER, 'stop'], { env, stdio: 'ignore' }); } catch {}
}
const privateBits = (p) => fs.statSync(p).mode & 0o077;

// ---------- droits réels (macOS / Linux : chmod a un effet ; sous Windows le test est ignoré) ----------
test('issue 20 : server.json en 0600 et dossier d\'état en 0700, y compris s\'il existait déjà en 0755', { skip: process.platform === 'win32' }, async () => {
  const claude = tmp('claude');
  const env = { ...process.env, CLAUDE_CONFIG_DIR: claude };
  delete env.ORCH_DASHBOARD_HOME;
  const etat = path.join(claude, 'orchestrator-dashboard');
  fs.mkdirSync(etat);
  fs.chmodSync(etat, 0o755); // dossier déjà existant, trop ouvert
  try {
    await start(env);
    assert.strictEqual(privateBits(etat), 0, 'dossier d\'état lisible par les autres comptes');
    assert.strictEqual(privateBits(path.join(etat, 'server.json')), 0, 'server.json lisible par les autres comptes');
  } finally { stop(env); }
});

test('issue 20 : ORCH_DASHBOARD_HOME neuf créé en 0700 et server.json en 0600 (macOS / Linux)', { skip: process.platform === 'win32' }, async () => {
  const etat = path.join(tmp('home'), 'etat'); // n'existe pas encore
  const env = { ...process.env, ORCH_DASHBOARD_HOME: etat, CLAUDE_CONFIG_DIR: tmp('claude') };
  try {
    await start(env);
    assert.strictEqual(privateBits(etat), 0, 'dossier d\'état lisible par les autres comptes');
    assert.strictEqual(privateBits(path.join(etat, 'server.json')), 0, 'server.json lisible par les autres comptes');
  } finally { stop(env); }
});

// ---------- portable (ce test discrimine aussi sous Windows) : on intercepte les appels fs et on vérifie les modes passés ----------
test('issue 20 : le code passe des modes privés pour server.json et le dossier d\'état (portable)', async () => {
  const etat = path.join(tmp('home'), 'etat');
  const journal = path.join(tmp('journal'), 'appels.jsonl');
  const espion = path.join(tmp('espion'), 'espion.cjs');
  fs.writeFileSync(espion, [
    "const fs = require('fs');",
    `const out = ${JSON.stringify(journal)};`,
    "const note = (op, p, mode) => { const fd = fs.openSync(out, 'a'); fs.writeSync(fd, JSON.stringify({ op, p: String(p), mode: mode == null ? null : mode }) + '\\n'); fs.closeSync(fd); };",
    "const modeOf = (o) => (o && typeof o === 'object' ? o.mode : undefined);",
    "const wf = fs.writeFileSync; fs.writeFileSync = function (p, d, o) { note('writeFile', p, modeOf(o)); return wf.apply(this, arguments); };",
    "const md = fs.mkdirSync; fs.mkdirSync = function (p, o) { note('mkdir', p, modeOf(o)); return md.apply(this, arguments); };",
    "const cm = fs.chmodSync; fs.chmodSync = function (p, m) { note('chmod', p, m); return cm.apply(this, arguments); };",
  ].join('\n'));
  const env = { ...process.env, ORCH_DASHBOARD_HOME: etat, CLAUDE_CONFIG_DIR: tmp('claude') };
  try {
    await start(env, ['-r', espion]);
    const appels = fs.readFileSync(journal, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    const prive = (m) => m != null && (m & 0o077) === 0;
    const dossier = appels.filter((a) => (a.op === 'mkdir' || a.op === 'chmod') && path.resolve(a.p) === path.resolve(etat));
    assert.ok(dossier.some((a) => prive(a.mode)), 'le dossier d\'état est créé (ou resserré) sans mode privé');
    const jeton = appels.filter((a) => a.op === 'writeFile' && path.basename(a.p).startsWith('server.json'));
    assert.ok(jeton.length > 0, 'server.json est écrit');
    for (const a of jeton) assert.ok(prive(a.mode), `server.json écrit sans mode privé (${a.p})`);
  } finally { stop(env); }
});
