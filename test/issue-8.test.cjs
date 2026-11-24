// Tests des points 8 et 9 de l'audit (issues #8 et #9) : masquage des secrets et des commandes (transcripts et
// fichier json), recherche des transcripts limitée aux projets inscrits (worktrees compris), dossier d'état hors
// dossier d'installation et hors ~/.claude, rotation de server.log.
// Lancer : node --test test/issue-8.test.cjs   (Node 18+, aucune dépendance, aucun serveur ni réseau).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const L = require(path.join(ROOT, 'lib.cjs'));
const tmp = (n) => fs.mkdtempSync(path.join(os.tmpdir(), `od-issue8-${n}-`));
let sidSeq = 0;
const uniqSid = () => `sid-issue8-${process.pid}-${++sidSeq}`; // findTranscript met en cache : un sid par test

// positionne des variables d'environnement pendant f, puis les restaure
function withEnv(vars, f) {
  const old = {};
  for (const k of Object.keys(vars)) { old[k] = process.env[k]; if (vars[k] == null) delete process.env[k]; else process.env[k] = vars[k]; }
  try { return f(); } finally {
    for (const k of Object.keys(old)) { if (old[k] === undefined) delete process.env[k]; else process.env[k] = old[k]; }
  }
}
// environnement isolé : aucun réglage ni transcript réel n'est lu
function iso(extra = {}) {
  return { ORCH_DASHBOARD_HIDE_COMMANDS: null, ORCH_DASHBOARD_HOME: tmp('home'), CLAUDE_CONFIG_DIR: tmp('claude'),
    LOCALAPPDATA: tmp('localappdata'), XDG_STATE_HOME: tmp('xdg'), ...extra };
}
// fait semblant d'être une autre plateforme pendant f
function withPlatform(p, f) {
  const d = Object.getOwnPropertyDescriptor(process, 'platform');
  Object.defineProperty(process, 'platform', { value: p, configurable: true });
  try { return f(); } finally { Object.defineProperty(process, 'platform', d); }
}

// ---------- point 2 : secrets masqués dans toutes les sorties (pas seulement Bash) ----------
test('les jetons Bearer, options --token et mots de passe ne sortent pas en clair', () => {
  const cmd = "curl -H 'Authorization: Bearer SECRET_TOKEN_DEMO_123' --token abc123456 password=hunter22 sk-abcdefgh12345 ls -la";
  const out = L.maskSecrets(cmd);
  for (const secret of ['SECRET_TOKEN_DEMO_123', 'abc123456', 'hunter22', 'sk-abcdefgh12345']) assert.ok(!out.includes(secret), `${secret} visible : ${out}`);
  assert.match(out, /ls -la$/, 'le reste de la commande est conservé');
});

test('Authorization Basic : le code base64 est masqué, pas seulement le mot Basic', () => {
  const out = L.maskSecrets('curl -H "Authorization: Basic dXNlcjpzM2NyZXRQVw==" https://example.invalid');
  assert.ok(!out.includes('dXNlcjpzM2NyZXRQVw'), out);
  assert.match(out, /Basic \*\*\*/);
});

test('curl -u user:pass, y compris entre guillemets', () => {
  const cases = [
    ['curl -u alice:S3CRET_U1 https://x.invalid', 'S3CRET_U1'],
    ['curl -u "bob:pa ss W2" https://x.invalid', 'pa ss W2'],
    ['curl --user=carol:S3CRET_U3 x', 'S3CRET_U3'],
  ];
  for (const [cmd, secret] of cases) {
    const out = L.maskSecrets(cmd);
    assert.ok(!out.includes(secret), `${secret} visible : ${out}`);
  }
});

test('paramètres d\'URL et clés nommées, toutes casses, sans masquer le reste de l\'URL', () => {
  const cases = [
    ['https://x.invalid/a?token=TOK_Q1&x=1', 'TOK_Q1'],
    ['https://x.invalid/a?access_token=AT_Q2', 'AT_Q2'],
    ['https://x.invalid/a?api_key=AK_Q3', 'AK_Q3'],
    ['https://x.invalid/a?APIKEY=AK_Q4', 'AK_Q4'],
    ['https://x.invalid/a?Password=PW_Q5', 'PW_Q5'],
    ['https://x.invalid/a?KEY=KEY_Q6', 'KEY_Q6'],
    ['curl -H "X-Api-Key: VALUE_Q7" https://x.invalid', 'VALUE_Q7'],
  ];
  for (const [input, secret] of cases) assert.ok(!L.maskSecrets(input).includes(secret), `${secret} visible : ${L.maskSecrets(input)}`);
  assert.match(L.maskSecrets('https://x.invalid/a?token=TOK_Q1&x=1'), /&x=1$/);
});

test('affectations d\'environnement dont le nom contient PASSWORD, TOKEN, SECRET ou KEY', () => {
  const cases = [
    ['DB_PASSWORD=DBPW_E1 npm start', 'DBPW_E1'],
    ['GITHUB_TOKEN=GHT_E2 git push', 'GHT_E2'],
    ['AWS_SECRET_ACCESS_KEY=AWS_E3 aws s3 ls', 'AWS_E3'],
    ['MY_API_KEY="MAK_E4" node x.js', 'MAK_E4'],
    ['export SOME_KEY_PATH=KP_E5 run', 'KP_E5'],
  ];
  for (const [input, secret] of cases) {
    const out = L.maskSecrets(input);
    assert.ok(!out.includes(secret), `${secret} visible : ${out}`);
  }
  assert.match(L.maskSecrets('DB_PASSWORD=DBPW_E1 npm start'), /npm start$/);
});

test('une commande Bash est masquée et tronquée ; le masquage passe avant la coupure', () => {
  withEnv(iso(), () => {
    const what = L.toolWhat('Bash', { command: "curl -H 'Authorization: Bearer SECRET_TOKEN_DEMO_123' " + 'x'.repeat(400) });
    assert.ok(!what.includes('SECRET_TOKEN_DEMO_123'));
    assert.ok(what.length <= 160, `longueur ${what.length}`);
  });
  withEnv(iso(), () => {
    // un secret qui tombe à cheval sur la limite de 160 caractères ne doit pas fuir en partie
    const what = L.toolWhat('Bash', { command: 'a'.repeat(150) + ' password=ZZZZZZZZZZZZ' });
    assert.ok(!what.includes('Z'), what);
  });
});

test('toolWhat masque aussi les autres outils (ex. WebFetch, url)', () => {
  withEnv(iso(), () => {
    const what = L.toolWhat('WebFetch', { url: 'https://x.invalid/?access_token=WF_SECRET_9' });
    assert.ok(!what.includes('WF_SECRET_9'), what);
  });
});

// ---------- point 3 : le champ what du fichier json est masqué et caché comme les transcripts ----------
test('shown() : commandes shell cachées si l\'option est active (casse ignorée), secrets masqués sinon', () => {
  const home = tmp('shown');
  fs.writeFileSync(path.join(home, 'config.json'), JSON.stringify({ hideCommands: true }));
  withEnv(iso({ ORCH_DASHBOARD_HOME: home }), () => {
    assert.strictEqual(L.shown('bash', 'npm test'), '', 'bash, casse ignorée');
    assert.strictEqual(L.shown('shell', 'npm test'), '', 'shell');
    assert.strictEqual(L.shown('Read', 'npm test'), 'npm test', 'un outil non shell reste affiché');
    assert.ok(!L.shown('Read', 'a?token=SHOWN_X1').includes('SHOWN_X1'), 'masqué même quand affiché');
  });
  withEnv(iso({ ORCH_DASHBOARD_HOME: tmp('shown-off') }), () => {
    assert.strictEqual(L.shown('bash', 'npm test'), 'npm test', 'affiché par défaut');
    assert.ok(!L.shown('bash', 'run DB_PASSWORD=SHOWN_Y2').includes('SHOWN_Y2'));
  });
});

test('l\'option masque les commandes Bash et PowerShell (config.json ou variable d\'environnement)', () => {
  const home = tmp('hide');
  fs.writeFileSync(path.join(home, 'config.json'), JSON.stringify({ hideCommands: true }));
  withEnv(iso({ ORCH_DASHBOARD_HOME: home }), () => {
    assert.strictEqual(L.toolWhat('Bash', { command: 'npm test' }), '', 'config.json');
    assert.strictEqual(L.toolWhat('PowerShell', { command: 'dir' }), '', 'config.json PowerShell');
    assert.strictEqual(L.toolWhat('Read', { file_path: 'a.txt' }), 'a.txt', 'les autres outils restent affichés');
  });
  withEnv(iso({ ORCH_DASHBOARD_HIDE_COMMANDS: '1' }), () => {
    assert.strictEqual(L.toolWhat('Bash', { command: 'npm test' }), '', 'variable d\'environnement');
  });
  withEnv(iso(), () => {
    assert.strictEqual(L.toolWhat('Bash', { command: 'npm test' }), 'npm test', 'affiché par défaut');
  });
});

test('fichier .orchestrator-dashboard.json : what masqué, commandes cachées avec l\'option (snapshot complet)', () => {
  const project = tmp('json-project');
  const now = new Date().toISOString();
  fs.writeFileSync(path.join(project, '.orchestrator-dashboard.json'), JSON.stringify({
    orchestrator: 'issue8',
    activity: [
      { ts: now, tool: 'Bash', what: 'curl -u al:SNAP_PW_1 --token SNAP_TK_2 https://x.invalid/?api_key=SNAP_AK_3' },
      { ts: now, tool: 'bash', what: 'npm run SNAPSHOT_CMD_4' },
      { ts: now, tool: 'WebFetch', what: 'https://x.invalid/?access_token=SNAP_AT_5' },
    ],
    agents: [{ name: 'worker', status: 'running', tools: [{ tool: 'Bash', what: 'echo DB_PASSWORD=SNAP_DB_6' }] }],
  }));
  const run = (extra) => {
    const env = { ...process.env, ...iso(), ...extra };
    for (const k of Object.keys(env)) if (env[k] === null) delete env[k];
    const r = spawnSync(process.execPath, [path.join(ROOT, 'server.cjs'), 'snapshot', project, 'json'], { env, encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stderr);
    return r.stdout;
  };
  const out = run({});
  for (const secret of ['SNAP_PW_1', 'SNAP_TK_2', 'SNAP_AK_3', 'SNAP_AT_5', 'SNAP_DB_6']) assert.ok(!out.includes(secret), `${secret} visible dans le snapshot`);
  assert.ok(out.includes('SNAPSHOT_CMD_4'), 'commande non secrète affichée par défaut');
  const hidden = run({ ORCH_DASHBOARD_HIDE_COMMANDS: '1' });
  assert.ok(!hidden.includes('SNAPSHOT_CMD_4'), 'commande cachée quand l\'option est active');
  assert.ok(!hidden.includes('SNAP_PW_1') && !hidden.includes('SNAP_AT_5'), 'secrets toujours masqués');
});

// ---------- point 4 : recherche des transcripts limitée aux projets inscrits ----------
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
  const sid = uniqSid();
  writeTranscript(claude, other, sid, [bashLine('echo hors-projet')]);
  withEnv(iso({ CLAUDE_CONFIG_DIR: claude }), () => {
    assert.strictEqual(L.findTranscript(sid, [registered]), null, 'le transcript d\'un autre dossier ne doit pas être lu');
  });
});

test('le transcript du dossier exact d\'un projet inscrit est retrouvé', () => {
  const claude = tmp('claude-exact');
  const project = tmp('project');
  const sid = uniqSid();
  const f = writeTranscript(claude, project, sid, [bashLine('echo ok')]);
  withEnv(iso({ CLAUDE_CONFIG_DIR: claude }), () => assert.strictEqual(L.findTranscript(sid, [project]), f));
});

test('le transcript d\'un worktree ou sous-dossier d\'un projet inscrit est retrouvé', () => {
  const claude = tmp('claude-wt');
  const project = tmp('project-wt');
  const worktree = path.join(project, '.claude', 'worktrees', 'wf_abc-1');
  const sub = path.join(project, 'packages', 'app');
  const sidW = uniqSid(); const sidS = uniqSid();
  const fW = writeTranscript(claude, worktree, sidW, [bashLine('echo wt')]);
  const fS = writeTranscript(claude, sub, sidS, [bashLine('echo sub')]);
  withEnv(iso({ CLAUDE_CONFIG_DIR: claude }), () => {
    assert.strictEqual(L.findTranscript(sidW, [project]), fW, 'worktree');
    assert.strictEqual(L.findTranscript(sidS, [project]), fS, 'sous-dossier');
  });
});

test('un dossier voisin dont le nom n\'est qu\'un préfixe sans tiret n\'est pas accepté', () => {
  const claude = tmp('claude-sibling');
  const project = tmp('project-sib');
  const sid = uniqSid();
  writeTranscript(claude, project + 'x', sid, [bashLine('echo voisin')]);
  withEnv(iso({ CLAUDE_CONFIG_DIR: claude }), () => assert.strictEqual(L.findTranscript(sid, [project]), null));
});

test('transcript d\'un projet inscrit : commande secrète masquée dans les outils', () => {
  const claude = tmp('claude-in');
  const project = tmp('project');
  const sid = uniqSid();
  const f = writeTranscript(claude, project, sid, [bashLine("curl -H 'Authorization: Bearer SECRET_TOKEN_DEMO_123' https://example.invalid")]);
  withEnv(iso({ CLAUDE_CONFIG_DIR: claude }), () => {
    assert.strictEqual(L.findTranscript(sid, [project]), f);
    const info = L.transcriptInfo(f, L.classifier());
    assert.strictEqual(info.tools.length, 1);
    assert.ok(!info.tools[0].what.includes('SECRET_TOKEN_DEMO_123'), `what = ${info.tools[0].what}`);
  });
});

// ---------- point 1 : dossier d'état distinct du dossier d'installation ----------
// nom du dossier d'installation par défaut, lu dans les scripts d'installation (le test suit les scripts)
const ps1 = fs.readFileSync(path.join(ROOT, 'install.ps1'), 'utf8');
const sh = fs.readFileSync(path.join(ROOT, 'install.sh'), 'utf8');
const WIN_INSTALL_DEFAULT = /Join-Path \$env:LOCALAPPDATA '([^']+)'/.exec(ps1)[1];
const POSIX_INSTALL_DEFAULT = /ORCH_DASHBOARD_DIR:-\$HOME\/\.local\/share\/([^}]+)\}/.exec(sh)[1];

test('Windows : le dossier d\'état n\'est pas le dossier d\'installation par défaut', () => {
  const local = tmp('lad-win');
  withEnv(iso({ CLAUDE_CONFIG_DIR: tmp('c'), LOCALAPPDATA: local, ORCH_DASHBOARD_HOME: null }), () => withPlatform('win32', () => {
    const dir = L.stateDir();
    assert.strictEqual(dir, path.join(local, 'orchestrator-dashboard-state'));
    assert.notStrictEqual(dir, path.join(local, WIN_INSTALL_DEFAULT), 'collision avec install.ps1');
    assert.ok(!dir.startsWith(path.join(local, WIN_INSTALL_DEFAULT) + path.sep), 'pas à l\'intérieur du dossier d\'installation');
  }));
});

test('macOS et Linux : le dossier d\'état est distinct du dossier d\'installation (install.sh)', () => {
  const state = tmp('xdg');
  const installDir = path.join(os.homedir(), '.local', 'share', POSIX_INSTALL_DEFAULT);
  withEnv(iso({ CLAUDE_CONFIG_DIR: tmp('c'), XDG_STATE_HOME: state, ORCH_DASHBOARD_HOME: null }), () => {
    withPlatform('darwin', () => {
      assert.strictEqual(L.stateDir(), path.join(os.homedir(), 'Library', 'Application Support', 'orchestrator-dashboard'));
      assert.notStrictEqual(L.stateDir(), installDir);
    });
    withPlatform('linux', () => {
      assert.strictEqual(L.stateDir(), path.join(state, 'orchestrator-dashboard'));
      assert.notStrictEqual(L.stateDir(), installDir);
    });
  });
});

test('le dossier d\'état est hors ~/.claude quand rien n\'existe encore', () => {
  const claude = tmp('claude-empty');
  withEnv(iso({ CLAUDE_CONFIG_DIR: claude, ORCH_DASHBOARD_HOME: null }), () => {
    const dir = L.stateDir();
    assert.ok(!dir.startsWith(claude), `${dir} sous la racine Claude`);
  });
});

test('l\'ancien dossier sous ~/.claude est repris s\'il existe', () => {
  const claude = tmp('claude-legacy');
  const legacy = path.join(claude, 'orchestrator-dashboard');
  fs.mkdirSync(legacy, { recursive: true });
  withEnv(iso({ CLAUDE_CONFIG_DIR: claude, ORCH_DASHBOARD_HOME: null }), () => assert.strictEqual(L.stateDir(), legacy));
});

test('ORCH_DASHBOARD_HOME reste prioritaire', () => {
  const home = tmp('explicit');
  withEnv(iso({ ORCH_DASHBOARD_HOME: home }), () => assert.strictEqual(L.stateDir(), home));
});

// ---------- point 1 (suite) : rotation de server.log ----------
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
