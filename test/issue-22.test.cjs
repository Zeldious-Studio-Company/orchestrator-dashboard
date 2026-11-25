// Issue #22 : « À toi d'agir » retiré ; chaque blocage est rattaché à son nœud (session ou sous-agent), sinon au nœud « Toi ».
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const L = require(path.join(ROOT, 'lib.cjs'));
const json = require(path.join(ROOT, 'adapters', 'json.cjs'));
const server = require(path.join(ROOT, 'server.cjs'));
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const EXAMPLE = path.join(ROOT, 'examples');

// dossier temporaire avec un fichier .orchestrator-dashboard.json
function projectWith(obj) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-issue22-'));
  fs.writeFileSync(path.join(dir, '.orchestrator-dashboard.json'), JSON.stringify(obj));
  return dir;
}
const step = (text) => ({ text: { en: text, fr: text } });

test('attachTask : champ explicite agent, puis session, identifiant inconnu, aucun champ', () => {
  const ctx = { sessions: new Set(['w1', 'lead']), types: new Set(['reviewer']) };
  assert.deepStrictEqual(L.attachTask({ agent: 'reviewer' }, ctx), { node: 'a:reviewer', reason: 'agent', ref: 'reviewer' });
  assert.deepStrictEqual(L.attachTask({ session: 'w1' }, ctx), { node: 's:w1', reason: 'session', ref: 'w1' });
  // agent inconnu, session connue : la session l'emporte
  assert.deepStrictEqual(L.attachTask({ agent: 'ghost', session: 'w1' }, ctx), { node: 's:w1', reason: 'session', ref: 'w1' });
  // agent connu : il l'emporte sur la session
  assert.deepStrictEqual(L.attachTask({ agent: 'reviewer', session: 'w1' }, ctx), { node: 'a:reviewer', reason: 'agent', ref: 'reviewer' });
  // identifiant absent des données : pas de nœud, la raison est « unknown » (la page dit « introuvable »)
  assert.deepStrictEqual(L.attachTask({ session: 'w9' }, ctx), { node: null, reason: 'unknown', ref: 'w9' });
  assert.deepStrictEqual(L.attachTask({ agent: 'ghost' }, ctx), { node: null, reason: 'unknown', ref: 'ghost' });
  // aucun champ explicite : pas de déduction, donc pas de nœud
  assert.deepStrictEqual(L.attachTask({ kind: 'blocked', summary: 'waiting for w1' }, ctx), { node: null, reason: 'none', ref: '' });
});

test('attachTasks écrit task.attach sur chaque tâche et écrase la valeur fournie par un adaptateur', () => {
  const snap = {
    sessions: [{ id: 'w1' }],
    agents: [{ session: 'w1', agentTypes: { reviewer: { total: 1 } } }],
    roster: [{ name: 'tester' }],
    tasks: [
      { id: 'a', session: 'w1' },
      { id: 'b', agent: 'tester' },
      { id: 'c', session: 'w2', attach: { node: 's:w1', reason: 'session', ref: 'w1' } },
      { id: 'd', agent: 'reviewer' },
    ],
  };
  L.attachTasks(snap);
  assert.deepStrictEqual(snap.tasks.map((t) => t.attach.node), ['s:w1', 'a:tester', null, 'a:reviewer']);
  assert.deepStrictEqual(snap.tasks[2].attach, { node: null, reason: 'unknown', ref: 'w2' });
  // sans liste de tâches, rien ne change
  assert.deepStrictEqual(L.attachTasks({ sessions: [] }), { sessions: [] });
});

test('adaptateur json : session et agent transmis, aucune tâche avec étape perdue', () => {
  const dir = projectWith({
    sessions: [{ id: 'w1', name: 'Worker 1', kind: 'worker', alive: true, status: 'blocked' }],
    tasks: [
      { id: 't1', session: 'w1', title: 'Clé', steps: [step('Fais-la')] },
      { id: 't2', agent: 'reviewer', title: 'Relecture', steps: [step('Relis')] },
      { id: 't3', title: 'Sans champ', steps: [step('Une')] },
      { id: 't4', session: 'w1', title: 'Sans étape', steps: [] },
    ],
  });
  try {
    const snap = json.snapshot(dir, { targets: new Map(), entry: {} });
    assert.deepStrictEqual(snap.tasks.map((t) => t.id), ['t1', 't2', 't3']);
    assert.strictEqual(snap.tasks[0].session, 'w1');
    assert.strictEqual(snap.tasks[0].agent, null);
    assert.strictEqual(snap.tasks[1].session, null);
    assert.strictEqual(snap.tasks[1].agent, 'reviewer');
    assert.strictEqual(snap.tasks[2].session, null);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('snapshotOf (exemple) : tâche rattachée à la session w2, tâche de la session absente gardée avec « unknown »', () => {
  const snap = server.snapshotOf({ id: 'example-22', dir: EXAMPLE, adapter: 'json', file: '' }, new Map());
  assert.ok(!snap.error, 'l instantané de l exemple se lit');
  assert.strictEqual(snap.tasks.length, 3, 'aucune tâche ne disparaît');
  const byId = Object.fromEntries(snap.tasks.map((t) => [t.id, t]));
  assert.deepStrictEqual(byId['stripe-key'].attach, { node: 's:w2', reason: 'session', ref: 'w2' });
  assert.deepStrictEqual(byId['review-pr'].attach, { node: null, reason: 'unknown', ref: 'w9' });
  assert.deepStrictEqual(byId['review-code'].attach, { node: 'a:reviewer', reason: 'agent', ref: 'reviewer' });
});

test('un blocage sans champ explicite reste sur « Toi » dans l instantané (rien n est déduit)', () => {
  const dir = projectWith({
    sessions: [{ id: 'w1', name: 'Worker 1', kind: 'worker', alive: true, status: 'blocked' }],
    tasks: [{ id: 'free', title: 'Libre', summary: 'bloqué', kind: 'blocked', steps: [step('Agis')] }],
  });
  try {
    const snap = server.snapshotOf({ id: 'p22', dir, adapter: 'json', file: '' }, new Map());
    assert.strictEqual(snap.tasks.length, 1);
    assert.deepStrictEqual(snap.tasks[0].attach, { node: null, reason: 'none', ref: '' });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('index.html ne contient plus la section « À toi d\'agir »', () => {
  const html = read('index.html');
  assert.doesNotMatch(html, /id="humanCard"/);
  assert.doesNotMatch(html, /data-t="human\.title"/);
  assert.doesNotMatch(html, /id="humanCount"|id="human"/);
});

test('app.js ne contient plus les libellés « À toi d\'agir » / « Your turn » ni les anciens noms', () => {
  const js = read('app.js');
  assert.doesNotMatch(js, /À toi d'agir/);
  assert.doesNotMatch(js, /Your turn/);
  assert.doesNotMatch(js, /renderHuman|humanCard|humanCount|humanSig/);
});

test('chaque identifiant lu par $(…) dans app.js existe dans index.html', () => {
  const js = read('app.js');
  const html = read('index.html');
  const ids = new Set([...js.matchAll(/\$\('([\w-]+)'\)/g)].map((m) => m[1]));
  assert.ok(ids.size > 10);
  const missing = [...ids].filter((id) => !html.includes(`id="${id}"`));
  assert.deepStrictEqual(missing, [], 'aucun $(id) orphelin après le retrait de la section');
});

test('les clés human.*, hkind.* et blk.* existent en fr et en en (mêmes clés)', () => {
  const js = read('app.js');
  const frStart = js.indexOf('  fr: {');
  const enStart = js.indexOf('  en: {');
  const end = js.indexOf('\n};', enStart);
  assert.ok(frStart > 0 && enStart > frStart && end > enStart, 'DICT trouvé');
  const keysOf = (block) => new Set([...block.matchAll(/'((?:human|hkind|blk)\.[\w.]+)'\s*:/g)].map((m) => m[1]));
  const fr = keysOf(js.slice(frStart, enStart));
  const en = keysOf(js.slice(enStart, end));
  assert.ok(fr.has('blk.unknown') && fr.has('blk.hidden') && fr.has('blk.noNode') && fr.has('blk.here'));
  assert.deepStrictEqual([...fr].filter((k) => !en.has(k)), [], 'clés fr sans en');
  assert.deepStrictEqual([...en].filter((k) => !fr.has(k)), [], 'clés en sans fr');
  assert.ok(!fr.has('human.title') && !en.has('human.title'), 'human.title retiré des deux langues');
});

test('les quatre documents et l exemple décrivent session, agent et pending pour les tâches', () => {
  for (const f of ['FORMAT.md', 'FORMAT.fr.md', 'README.md', 'README.fr.md', path.join('examples', '.orchestrator-dashboard.json')]) {
    const s = read(f);
    for (const field of ['session', 'agent', 'pending']) assert.match(s, new RegExp(`\\b${field}\\b`), `${f} cite ${field}`);
  }
  const tasksBlock = read('FORMAT.md').split('"tasks": [{')[1].split('"links"')[0];
  assert.doesNotMatch(tasksBlock, /"tool"\s*:/, 'aucun champ tool dans tasks');
});

test('aucun chemin absolu ni adresse e-mail dans les fichiers modifiés', () => {
  const files = ['app.js', 'index.html', 'lib.cjs', 'server.cjs', 'adapters/json.cjs', 'FORMAT.md', 'FORMAT.fr.md', 'README.md', 'README.fr.md', 'examples/.orchestrator-dashboard.json', 'test/issue-22.test.cjs'];
  for (const f of files) {
    const s = read(f);
    assert.doesNotMatch(s, /[A-Za-z]:[\\/](Users|agent-orchestrator)/, `${f} : chemin absolu`);
    assert.doesNotMatch(s, /[\w.+-]+@[\w-]+\.[\w.]+/, `${f} : adresse e-mail`);
  }
});

// QA (issue 22) : la vue « Toi » liste les tâches sans rattachement, pas toutes les tâches du projet
test('vue détail « Toi » : la liste vient des tâches sans rattachement (mapBlocks), pas de lastTasks', () => {
  const js = read('app.js');
  const i = js.indexOf("d.type === 'human'");
  assert.ok(i > 0, 'branche « Toi » trouvée');
  const seg = js.slice(i, js.indexOf("d.type === 'quota'", i));
  assert.ok(!/lastTasks/.test(seg), 'la branche « Toi » ne lit plus lastTasks');
  assert.ok(/mapBlocks\.get\('in:human'\)/.test(seg), 'la branche « Toi » lit les tâches sans rattachement');
});

// QA (issue 22) : un workflow qui ne se dessine pas ne devient pas visible à cause d'une tâche (documenté)
test('workflow non dessiné : la documentation le dit (fr et en)', () => {
  assert.match(read('FORMAT.md'), /a task does not make its workflow visible/);
  assert.match(read('FORMAT.fr.md'), /ne rend pas le workflow visible/);
});
