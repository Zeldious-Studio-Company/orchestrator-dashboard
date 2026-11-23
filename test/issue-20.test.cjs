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
const samePath = (a, b) => path.resolve(a) === path.resolve(b);

// ---------- droits réels (macOS / Linux : chmod a un effet ; sous Windows le test est ignoré) ----------
test('issue 20 : server.json en 0600 et dossier d\'état en 0700, y compris s\'ils existaient déjà en 0755 / 0644', { skip: process.platform === 'win32' }, async () => {
  const claude = tmp('claude');
  const env = { ...process.env, CLAUDE_CONFIG_DIR: claude };
  delete env.ORCH_DASHBOARD_HOME;
  const etat = path.join(claude, 'orchestrator-dashboard');
  fs.mkdirSync(etat);
  fs.chmodSync(etat, 0o755); // dossier déjà existant, trop ouvert
  const info = path.join(etat, 'server.json');
  fs.writeFileSync(info, '{}\n'); // server.json préexistant, trop ouvert (aucun serveur en cours)
  fs.chmodSync(info, 0o644);
  try {
    await start(env);
    assert.strictEqual(privateBits(etat), 0, 'dossier d\'état lisible par les autres comptes');
    assert.strictEqual(privateBits(info), 0, 'server.json lisible par les autres comptes');
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
// Espion chargé avec « node -r » : il journalise les écritures, mkdir, chmod et renames faits par le processus « start ».
function espionDe(journal) {
  const espion = path.join(tmp('espion'), 'espion.cjs');
  fs.writeFileSync(espion, [
    "const fs = require('fs');",
    `const out = ${JSON.stringify(journal)};`,
    "const note = (op, p, mode, to) => { const fd = fs.openSync(out, 'a'); fs.writeSync(fd, JSON.stringify({ op, p: String(p), mode: mode == null ? null : mode, to: to == null ? null : String(to) }) + '\\n'); fs.closeSync(fd); };",
    "const modeOf = (o) => (o && typeof o === 'object' ? o.mode : undefined);",
    "const wf = fs.writeFileSync; fs.writeFileSync = function (p, d, o) { note('writeFile', p, modeOf(o)); return wf.apply(this, arguments); };",
    "const md = fs.mkdirSync; fs.mkdirSync = function (p, o) { note('mkdir', p, modeOf(o)); return md.apply(this, arguments); };",
    "const cm = fs.chmodSync; fs.chmodSync = function (p, m) { note('chmod', p, m); return cm.apply(this, arguments); };",
    "const rn = fs.renameSync; fs.renameSync = function (a, b) { note('rename', a, null, b); return rn.apply(this, arguments); };",
  ].join('\n'));
  return espion;
}
const lireAppels = (journal) => (fs.existsSync(journal) ? fs.readFileSync(journal, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const prive = (m) => m != null && (m & 0o077) === 0;

test('issue 20 (portable) : le dossier d\'état préexistant est resserré en 0700 (chmod explicite)', async () => {
  const claude = tmp('claude');
  const etat = path.join(claude, 'orchestrator-dashboard');
  fs.mkdirSync(etat); // existe déjà : mkdir { mode } ne change rien, seul chmod peut le resserrer
  const journal = path.join(tmp('journal'), 'appels.jsonl');
  const env = { ...process.env, CLAUDE_CONFIG_DIR: claude };
  delete env.ORCH_DASHBOARD_HOME;
  try {
    await start(env, ['-r', espionDe(journal)]);
    const appels = lireAppels(journal);
    const resserre = appels.some((a) => a.op === 'chmod' && samePath(a.p, etat) && prive(a.mode));
    assert.ok(resserre, 'le dossier d\'état préexistant n\'est pas resserré en 0700 (aucun chmod privé)');
  } finally { stop(env); }
});

test('issue 20 (portable) : le code passe des modes privés pour server.json et le dossier d\'état (portable)', async () => {
  const etat = path.join(tmp('home'), 'etat');
  const journal = path.join(tmp('journal'), 'appels.jsonl');
  const env = { ...process.env, ORCH_DASHBOARD_HOME: etat, CLAUDE_CONFIG_DIR: tmp('claude') };
  const info = path.join(etat, 'server.json');
  try {
    await start(env, ['-r', espionDe(journal)]);
    const appels = lireAppels(journal);
    const dossier = appels.filter((a) => a.op === 'mkdir' && samePath(a.p, etat));
    assert.ok(dossier.some((a) => prive(a.mode)), 'le dossier d\'état est créé sans mode privé');
    // server.json ne doit jamais être écrit directement à sa cible (il serait lisible si le fichier existait déjà en 644) :
    // écriture dans un fichier temporaire en 0600, puis rename sur la cible
    const directes = appels.filter((a) => a.op === 'writeFile' && samePath(a.p, info));
    assert.strictEqual(directes.length, 0, 'server.json est écrit directement à sa cible, sans fichier temporaire');
    const temporaires = appels.filter((a) => a.op === 'writeFile' && path.basename(a.p).startsWith('server.json'));
    assert.ok(temporaires.length > 0, 'server.json est écrit');
    for (const a of temporaires) assert.ok(prive(a.mode), `server.json écrit sans mode privé (${a.p})`);
    assert.ok(appels.some((a) => a.op === 'rename' && samePath(a.to, info)), 'server.json n\'est pas renommé sur sa cible');
  } finally { stop(env); }
});
