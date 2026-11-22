// Tests des points 8 et 9 de l'audit (issues #8 et #9) : commandes des transcripts (masquage, option, recherche
// limitée aux projets inscrits), dossier d'état hors ~/.claude, rotation de server.log.
// Lancer : node --test test/   (Node 18+, aucune dépendance). Aucun serveur ni connexion réseau.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const L = require(path.join(ROOT, 'lib.cjs'));
const tmp = (n) => fs.mkdtempSync(path.join(os.tmpdir(), `od-issue8-${n}-`));

// positionne des variables d'environnement pendant f, puis les restaure
function withEnv(vars, f) {
  const old = {};
  for (const k of Object.keys(vars)) { old[k] = process.env[k]; if (vars[k] == null) delete process.env[k]; else process.env[k] = vars[k]; }
  try { return f(); } finally {
    for (const k of Object.keys(old)) { if (old[k] === undefined) delete process.env[k]; else process.env[k] = old[k]; }
  }
}
const CLEAN = { ORCH_DASHBOARD_HIDE_COMMANDS: null, ORCH_DASHBOARD_HOME: null };

// ---------- point 8 : secrets masqués, longueur réduite ----------
test('les jetons Bearer, options --token et mots de passe ne sortent pas en clair', () => {
  const cmd = "curl -H 'Authorization: Bearer SECRET_TOKEN_DEMO_123' --token abc123456 password=hunter22 sk-abcdefgh12345 ls -la";
  const out = L.maskSecrets(cmd);
  for (const secret of ['SECRET_TOKEN_DEMO_123', 'abc123456', 'hunter22', 'sk-abcdefgh12345']) assert.ok(!out.includes(secret), `${secret} visible : ${out}`);
  assert.match(out, /ls -la$/, 'le reste de la commande est conservé');
});

test('une commande Bash est masquée et tronquée avant affichage', () => {
  withEnv(CLEAN, () => {
    const what = L.toolWhat('Bash', { command: "curl -H 'Authorization: Bearer SECRET_TOKEN_DEMO_123' " + 'x'.repeat(400) });
    assert.ok(!what.includes('SECRET_TOKEN_DEMO_123'));
    assert.ok(what.length <= 160, `longueur ${what.length}`);
  });
});

test('l\'option masque les commandes Bash et PowerShell (env ou config.json)', () => {
  const home = tmp('hide');
  fs.writeFileSync(path.join(home, 'config.json'), JSON.stringify({ hideCommands: true }));
  withEnv({ ...CLEAN, ORCH_DASHBOARD_HOME: home }, () => {
    assert.strictEqual(L.toolWhat('Bash', { command: 'npm test' }), '', 'config.json');
    assert.strictEqual(L.toolWhat('PowerShell', { command: 'dir' }), '', 'config.json PowerShell');
    assert.strictEqual(L.toolWhat('Read', { file_path: 'a.txt' }), 'a.txt', 'les autres outils restent affichés');
  });
  withEnv({ ...CLEAN, ORCH_DASHBOARD_HOME: tmp('nohide'), ORCH_DASHBOARD_HIDE_COMMANDS: '1' }, () => {
    assert.strictEqual(L.toolWhat('Bash', { command: 'npm test' }), '', 'variable d\'environnement');
  });
  withEnv({ ...CLEAN, ORCH_DASHBOARD_HOME: tmp('show') }, () => {
    assert.strictEqual(L.toolWhat('Bash', { command: 'npm test' }), 'npm test', 'affiché par défaut');
  });
});

// ---------- point 8 : recherche limitée aux projets inscrits ----------
const sanitize = (d) => path.resolve(d).replace(/[^a-zA-Z0-9]/g, '-');
function writeTranscript(claudeDir, projectDir, sid, lines) {
  const d = path.join(claudeDir, 'projects', sanitize(projectDir));
  fs.mkdirSync(d, { recursive: true });
  const f = path.join(d, `${sid}.jsonl`);
  fs.writeFileSync(f, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
  return f;
}
const bashLine = (command) => ({ type: 'assistant', timestamp: new Date().toISOString(), message: { model: 'claude-test', content: [{ type: 'tool_use', id: 'u1', name: 'Bash', input: { command } }] } });

test('un transcript hors des projets inscrits n\'est pas retrouvé', () => {
  const claude = tmp('claude-scope');
  const registered = tmp('registered'); const other = tmp('other');
  const sid = 'sess-outside-1';
  writeTranscript(claude, other, sid, [bashLine('echo hors-projet')]);
  withEnv({ ...CLEAN, CLAUDE_CONFIG_DIR: claude }, () => {
    assert.strictEqual(L.findTranscript(sid, [registered]), null, 'le transcript d\'un autre dossier ne doit pas être lu');
  });
});

test('un transcript du projet inscrit est retrouvé, et sa commande secrète est masquée', () => {
  const claude = tmp('claude-in');
  const project = tmp('project');
  const sid = 'sess-inside-1';
  const f = writeTranscript(claude, project, sid, [bashLine("curl -H 'Authorization: Bearer SECRET_TOKEN_DEMO_123' https://example.invalid")]);
  withEnv({ ...CLEAN, CLAUDE_CONFIG_DIR: claude }, () => {
    assert.strictEqual(L.findTranscript(sid, [project]), f);
    const info = L.transcriptInfo(f, L.classifier());
    assert.strictEqual(info.tools.length, 1);
    assert.ok(!info.tools[0].what.includes('SECRET_TOKEN_DEMO_123'), `what = ${info.tools[0].what}`);
  });
});

// ---------- point 9 : dossier d'état ----------
test('le dossier d\'état suit la plateforme (hors ~/.claude) quand rien n\'existe encore', () => {
  const claude = tmp('claude-empty'); const local = tmp('localappdata'); const state = tmp('xdg');
  withEnv({ ...CLEAN, CLAUDE_CONFIG_DIR: claude, LOCALAPPDATA: local, XDG_STATE_HOME: state }, () => {
    const dir = L.stateDir();
    assert.ok(!dir.startsWith(claude), `${dir} sous la racine Claude`);
    if (process.platform === 'win32') assert.strictEqual(dir, path.join(local, 'orchestrator-dashboard'));
    else if (process.platform === 'darwin') assert.strictEqual(dir, path.join(os.homedir(), 'Library', 'Application Support', 'orchestrator-dashboard'));
    else assert.strictEqual(dir, path.join(state, 'orchestrator-dashboard'));
  });
});

test('l\'ancien dossier sous ~/.claude est repris s\'il existe', () => {
  const claude = tmp('claude-legacy');
  const legacy = path.join(claude, 'orchestrator-dashboard');
  fs.mkdirSync(legacy, { recursive: true });
  withEnv({ ...CLEAN, CLAUDE_CONFIG_DIR: claude }, () => assert.strictEqual(L.stateDir(), legacy));
});

test('ORCH_DASHBOARD_HOME reste prioritaire', () => {
  const home = tmp('explicit');
  withEnv({ ...CLEAN, ORCH_DASHBOARD_HOME: home }, () => assert.strictEqual(L.stateDir(), home));
});

// ---------- point 9 : rotation de server.log ----------
test('server.log au-delà de la taille maximale devient server.log.1', () => {
  const dir = tmp('log');
  const log = path.join(dir, 'server.log');
  fs.writeFileSync(log, 'x'.repeat(2000));
  assert.strictEqual(L.rotateLog(log, 1000), true);
  assert.ok(!fs.existsSync(log), 'le journal courant est déplacé');
  assert.strictEqual(fs.statSync(`${log}.1`).size, 2000);
  // une deuxième rotation remplace le .1 précédent (un seul fichier d'archive)
  fs.writeFileSync(log, 'y'.repeat(1500));
  assert.strictEqual(L.rotateLog(log, 1000), true);
  assert.strictEqual(fs.readFileSync(`${log}.1`, 'utf8')[0], 'y');
});

test('server.log sous la taille maximale n\'est pas touché', () => {
  const dir = tmp('log-small');
  const log = path.join(dir, 'server.log');
  fs.writeFileSync(log, 'petit\n');
  assert.strictEqual(L.rotateLog(log, 1000), false);
  assert.strictEqual(fs.readFileSync(log, 'utf8'), 'petit\n');
  assert.ok(!fs.existsSync(`${log}.1`));
});

test('server.cjs fait tourner le journal avant de l\'ouvrir', () => {
  const src = fs.readFileSync(path.join(ROOT, 'server.cjs'), 'utf8');
  assert.ok(src.indexOf('L.rotateLog(LOG)') > 0 && src.indexOf('L.rotateLog(LOG)') < src.indexOf("fs.openSync(LOG, 'a')"), 'rotation absente ou après l\'ouverture');
});
