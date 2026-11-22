// Tests du point 3 (installeurs install.sh / install.ps1). Aucune dépendance. Lancer : node --test test/
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const tmp = (n) => fs.mkdtempSync(path.join(os.tmpdir(), `od-issue3-${n}-`));
const posix = (p) => p.replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`).replace(/\\/g, '/');

// ---------- vérifications statiques ----------
test('README : plus de tuyau vers le shell ni vers iex', () => {
  for (const f of ['README.md', 'README.fr.md']) assert.doesNotMatch(read(f), /\|\s*(sh|iex)\b/, f);
});

test('installeurs : version figée par défaut, jamais main', () => {
  assert.match(read('install.sh'), /REF="\$\{ORCH_DASHBOARD_REF:-v1\.0\.0\}"/);
  assert.match(read('install.ps1'), /else \{ 'v1\.0\.0' \}/);
  assert.doesNotMatch(read('install.sh'), /:-main\}/);
  assert.doesNotMatch(read('install.ps1'), /'main'/);
});

test('install.ps1 : PATH modifié seulement si ORCH_DASHBOARD_ADD_PATH=1', () => {
  const src = read('install.ps1');
  const gate = src.indexOf("ORCH_DASHBOARD_ADD_PATH -eq '1'");
  const set = src.indexOf("SetEnvironmentVariable('Path'");
  assert.ok(gate > 0 && set > gate, 'la modification du PATH doit être derrière l\'option');
});

test('installeurs : le dossier n\'est supprimé qu\'après contrôle de l\'installation', () => {
  const ps = read('install.ps1');
  assert.ok(ps.indexOf('Test-Install $dir') > 0 && ps.indexOf('Test-Install $dir') < ps.indexOf('Remove-Item -LiteralPath $dir'));
  const sh = read('install.sh');
  assert.ok(sh.indexOf('is_install "$DIR"') > 0 && sh.indexOf('is_install "$DIR"') < sh.indexOf('rm -rf "$DIR"'));
});

// ---------- comportement de install.sh (fausse commande curl, pas de réseau) ----------
// Sous Windows, node cherche « sh » dans le PATH de l'appelant : on prend le sh.exe de Git Bash ou MSYS2 s'il existe.
const SH = process.platform === 'win32'
  ? (process.env.PATH || '').split(';').map((d) => path.join(d, 'sh.exe')).find((p) => fs.existsSync(p))
  : 'sh';
const hasSh = !!SH && spawnSync(SH, ['-c', 'exit 0']).status === 0;
const shTest = (name, fn) => test(name, { skip: !hasSh && 'sh indisponible' }, fn);

function makeArchive({ pkgName = 'orchestrator-dashboard', withPkg = true } = {}) {
  const root = tmp('src');
  const top = path.join(root, 'orchestrator-dashboard-1.0.0');
  fs.mkdirSync(top);
  fs.writeFileSync(path.join(top, 'server.cjs'), '// test\n');
  if (withPkg) fs.writeFileSync(path.join(top, 'package.json'), JSON.stringify({ name: pkgName, version: '1.0.0' }));
  // Chemins relatifs : sous Windows, « C: » serait lu comme un nom d'hôte distant par GNU tar.
  const r = spawnSync('tar', ['-czf', 'src.tar.gz', 'orchestrator-dashboard-1.0.0'], { cwd: root });
  assert.strictEqual(r.status, 0, String(r.stderr));
  return path.join(root, 'src.tar.gz');
}

function fakeCurl(archive) {
  const bin = tmp('bin');
  const log = path.join(bin, 'calls.log');
  const script = [
    '#!/bin/sh',
    `echo "$@" >> "${posix(log)}"`,
    'out=',
    'while [ $# -gt 0 ]; do case "$1" in -o) out="$2"; shift ;; esac; shift; done',
    `cp "${posix(archive)}" "$out"`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(bin, 'curl'), script);
  fs.chmodSync(path.join(bin, 'curl'), 0o755);
  return { bin, log };
}

function runInstall({ archive, env = {}, dir }) {
  const { bin, log } = fakeCurl(archive);
  const home = tmp('home');
  const launcherDir = tmp('launcher');
  const r = spawnSync(SH, [posix(path.join(ROOT, 'install.sh'))], {
    encoding: 'utf8',
    env: {
      PATH: [posix(bin), posix(path.dirname(process.execPath)), '/usr/bin', '/bin'].join(':'),
      HOME: posix(home),
      ORCH_DASHBOARD_DIR: posix(dir),
      ORCH_DASHBOARD_BIN: posix(launcherDir),
      ...env,
    },
  });
  const calls = fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '';
  return { status: r.status, out: (r.stdout || '') + (r.stderr || ''), calls };
}

const sha256 = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const newDir = () => path.join(tmp('dest'), 'orchestrator-dashboard');

shTest('par défaut, l\'archive demandée est l\'étiquette v1.0.0', () => {
  const r = runInstall({ archive: makeArchive(), dir: newDir() });
  assert.strictEqual(r.status, 0, r.out);
  assert.match(r.calls, /refs\/tags\/v1\.0\.0/);
});

shTest('une référence invalide est refusée avant tout téléchargement', () => {
  const r = runInstall({ archive: makeArchive(), dir: newDir(), env: { ORCH_DASHBOARD_REF: '../../x' } });
  assert.notStrictEqual(r.status, 0);
  assert.match(r.out, /invalid ORCH_DASHBOARD_REF/);
  assert.strictEqual(r.calls, '');
});

shTest('somme SHA256 fausse : rien n\'est installé', () => {
  const dir = newDir();
  const r = runInstall({ archive: makeArchive(), dir, env: { ORCH_DASHBOARD_SHA256: '0'.repeat(64) } });
  assert.notStrictEqual(r.status, 0);
  assert.match(r.out, /SHA256 mismatch/);
  assert.ok(!fs.existsSync(dir));
});

shTest('somme SHA256 correcte : l\'installation se fait', () => {
  const archive = makeArchive();
  const dir = newDir();
  const r = runInstall({ archive, dir, env: { ORCH_DASHBOARD_SHA256: sha256(archive).toUpperCase() } });
  assert.strictEqual(r.status, 0, r.out);
  assert.match(r.out, /SHA256 verified/);
  assert.ok(fs.existsSync(path.join(dir, 'server.cjs')));
});

shTest('un dossier qui n\'est pas une installation n\'est jamais supprimé', () => {
  const dir = newDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'precieux.txt'), 'à garder');
  const r = runInstall({ archive: makeArchive(), dir });
  assert.notStrictEqual(r.status, 0);
  assert.match(r.out, /refusing to replace/);
  assert.strictEqual(fs.readFileSync(path.join(dir, 'precieux.txt'), 'utf8'), 'à garder');
});

shTest('un server.cjs d\'un autre projet n\'est pas exécuté avant le refus', () => {
  const dir = newDir();
  fs.mkdirSync(dir, { recursive: true });
  const marker = path.join(dir, 'execute.marker');
  fs.writeFileSync(path.join(dir, 'server.cjs'), `require('fs').writeFileSync(${JSON.stringify(marker)}, 'x');\n`);
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'autre-projet' }));
  const r = runInstall({ archive: makeArchive(), dir });
  assert.notStrictEqual(r.status, 0);
  assert.ok(!fs.existsSync(marker), 'le server.cjs étranger a été exécuté');
});

shTest('une installation existante est remplacée', () => {
  const dir = newDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'server.cjs'), '// ancien\n');
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'orchestrator-dashboard' }));
  fs.writeFileSync(path.join(dir, 'ancien.txt'), 'x');
  const r = runInstall({ archive: makeArchive(), dir });
  assert.strictEqual(r.status, 0, r.out);
  assert.ok(!fs.existsSync(path.join(dir, 'ancien.txt')));
});

shTest('une archive sans package.json au bon nom est refusée', () => {
  const dir = newDir();
  const r = runInstall({ archive: makeArchive({ withPkg: false }), dir });
  assert.notStrictEqual(r.status, 0);
  assert.match(r.out, /unexpected archive content/);
  assert.ok(!fs.existsSync(dir));
});
