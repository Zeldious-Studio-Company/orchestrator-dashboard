// Issue #23 : ne garder que la carte en direct, les quotas du forfait et le journal.
// Les panneaux Sessions, Activité en direct, Workflows, Consignes et Événements (listes), ainsi que le stepper des phases,
// sont retirés ; le bandeau #alerts ne sert plus qu'aux erreurs de lecture. Les nœuds « Toi » et « Événements » gardent
// leur vue détail, et la vue détail d'une session reste la seule lecture détaillée d'une session.
// Lancer : node --test test/issue-23.test.cjs   (Node 18+, aucune dépendance, aucun serveur).
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const ROOT = path.resolve(__dirname, '..');
// fins de ligne normalisées (CRLF sur le disque, LF dans les tests)
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').split('\r\n').join('\n');

// corps d'une fonction nommée : de « function nom(» jusqu'à la « } » de fin en début de ligne
function fnBody(src, name) {
  const start = src.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `fonction ${name} introuvable`);
  const end = src.indexOf('\n}\n', start);
  assert.ok(end > start, `fin de la fonction ${name} introuvable`);
  return src.slice(start, end + 3);
}
// branche d'une vue détail : de « d.type === 'x' » jusqu'à la marque de la branche suivante
function detailBranch(src, type, next) {
  const a = src.indexOf(`d.type === '${type}') {`);
  assert.ok(a >= 0, `branche ${type} introuvable`);
  const b = src.indexOf(next, a + 10);
  assert.ok(b > a, `fin de la branche ${type} introuvable`);
  return src.slice(a, b);
}
// clés d'un bloc du dictionnaire DICT (fr ou en)
function dictKeys(js, lang) {
  const start = js.indexOf(`\n  ${lang}: {`);
  assert.ok(start >= 0, `bloc ${lang} introuvable dans DICT`);
  const end = js.indexOf('\n  }', start);
  return [...js.slice(start, end).matchAll(/'([a-zA-Z][\w.-]*)'\s*:/g)].map((m) => m[1]);
}

const html = read('index.html');
const js = read('app.js');
const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
const body = html.slice(html.indexOf('<body>'));

test('index.html ne contient plus les panneaux retirés ni leurs identifiants', () => {
  for (const id of ['sessions', 'sessCount', 'activity', 'actCount', 'actFilter', 'wfCard', 'workflows', 'wfCount', 'inbox', 'inboxTitle', 'feed', 'feedTitle', 'stepper']) {
    assert.doesNotMatch(html, new RegExp(`id="${id}"`), `id="${id}" encore présent`);
  }
  for (const key of ['sess.title', 'act.title', 'wf.title']) {
    assert.doesNotMatch(html, new RegExp(`data-t="${key}"`), `${key} encore affiché`);
  }
});

test('index.html garde la carte, les quotas, le journal, le bandeau et le détail de la carte', () => {
  for (const id of ['map', 'mapCount', 'mapModels', 'mapReset', 'mapDetail', 'quotas', 'qAge', 'journal', 'jCount', 'alerts']) {
    assert.match(html, new RegExp(`id="${id}"`), `id="${id}" manquant`);
  }
});

test('la mise en page est une colonne : plus de grille à deux colonnes, quotas puis journal', () => {
  assert.doesNotMatch(body, /class="grid"/);
  const col = body.indexOf('<div class="col">');
  const quotas = body.indexOf('id="quotas"');
  const journal = body.indexOf('id="journal"');
  assert.ok(col > 0 && col < quotas && quotas < journal, 'quotas puis journal dans la colonne unique');
  assert.doesNotMatch(css, /\.grid\s*\{/, 'règle .grid encore définie');
  assert.match(css, /\.col \{ display: grid; gap: 16px; min-width: 0; \}/);
});

test('les règles CSS mortes sont retirées ; les règles utiles restent', () => {
  const dead = [/\.sess[\s{.:]/, /\.feed\s*\{/, /\.ev[\s{.:]/, /\.wf[\s{.:]/, /\.stepper\s*\{/, /\.step[\s{.:]/, /@keyframes flash/];
  for (const re of dead) assert.doesNotMatch(css, re, `règle morte encore présente : ${re}`);
  for (const sel of ['.chip', '.kind', '.c-ok', '.tool {', '.list', '.row', '.toolbar', 'button.f']) {
    assert.ok(css.includes(sel), `règle utile manquante : ${sel}`);
  }
});

test('le bandeau #alerts ne sert qu’aux erreurs de lecture', () => {
  const render = fnBody(js, 'render');
  const cut = render.indexOf('const name = tr(snap.project.name);');
  const errorBlock = render.slice(0, cut);
  // branche d'erreur : erreur de l'instantané, ou fichier illisible (run.state « error » de l'adaptateur json)
  const condSrc = "snap.error || (snap.run && snap.run.state === 'error')";
  assert.ok(errorBlock.includes(`if (${condSrc}) {`), 'condition de la branche d’erreur introuvable');
  const cond = [null, condSrc];
  assert.ok(errorBlock.includes("const errs = snap.error ? [tr(snap.error)] : (snap.alerts || []).filter((a) => a && a.tone === 'bad')"), 'filtre des alertes « bad » introuvable');
  assert.ok(errorBlock.includes("fill($('alerts'), errs.map((e) => h('div', { class: 'alert bad' }, h('b', null, t('err.read')), e)))"), 'rendu des erreurs introuvable');
  assert.doesNotMatch(render.slice(cut), /class: 'alert/, 'aucun message d’alerte n’est rendu après la branche d’erreur');

  // comportement : l'instantané d'un fichier illisible doit satisfaire la condition (régression constatée)
  const pred = new Function('snap', `return ${cond[1]};`);
  const json = require(path.join(ROOT, 'adapters', 'json.cjs'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-issue23-'));
  try {
    fs.writeFileSync(path.join(dir, '.orchestrator-dashboard.json'), '{ pas du json');
    const broken = json.snapshot(dir, {});
    assert.ok(pred(broken), 'instantané illisible non rendu par le bandeau');
    assert.ok(broken.alerts.some((a) => a.tone === 'bad'), 'alerte bad absente de l’instantané illisible');
    // un fichier valide ne déclenche pas la branche d'erreur, même avec une alerte « bad » écrite par l'utilisateur
    fs.writeFileSync(path.join(dir, '.orchestrator-dashboard.json'), JSON.stringify({ project: 'x', alerts: [{ tone: 'bad', title: 'a', text: 'b' }], tasks: [] }));
    const valid = json.snapshot(dir, {});
    assert.ok(!pred(valid), 'un fichier valide ne doit pas passer par la branche d’erreur');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('render() ne rend plus que le bandeau de l’état, la carte, les quotas et le journal', () => {
  const render = fnBody(js, 'render');
  for (const fn of ['renderSessions', 'renderActivity', 'renderWorkflows', 'renderInbox', 'renderFeed', 'renderStepper', 'renderAlerts']) {
    assert.doesNotMatch(render, new RegExp(`\\b${fn}\\(`), `${fn}() encore appelée par render()`);
  }
  for (const fn of ['renderRun', 'renderDiagrams', 'renderQuotas', 'renderJournal']) {
    assert.match(render, new RegExp(`\\b${fn}\\(`), `${fn}() absente de render()`);
  }
});

test('app.js ne définit plus les fonctions, variables ni fils de rendu des panneaux retirés', () => {
  for (const name of ['sessionRow', 'renderSessions', 'renderActivity', 'renderWorkflows', 'renderInbox', 'renderFeed', 'renderStepper', 'renderAlerts', 'filterKey', 'seenEv', 'firstRender']) {
    assert.doesNotMatch(js, new RegExp(`\\b${name}\\b`), `${name} encore présent dans app.js`);
  }
  assert.doesNotMatch(js, /innerHTML/, 'innerHTML interdit (CSP)');
  assert.doesNotMatch(js, /\bon[a-z]+\s*=\s*['"]/, 'attributs on*= interdits (CSP)');
});

test('l’intervalle de rafraîchissement ne reconstruit plus la liste des sessions', () => {
  assert.match(js, /setInterval\(renderUpdated, 5000\);/);
  assert.doesNotMatch(js, /renderSessions/);
});

test('resetView ne vide que les zones encore affichées', () => {
  const reset = fnBody(js, 'resetView');
  const m = reset.match(/for \(const id of \[([^\]]*)\]\)/);
  assert.ok(m, 'liste des zones vidées introuvable');
  const list = [...m[1].matchAll(/'(\w+)'/g)].map((x) => x[1]).sort();
  assert.deepStrictEqual(list, ['alerts', 'journal', 'mapDetail', 'quotas']);
});

test('la vue détail d’une session liste statut, phase, mode, tâche, attente, blocage et les 12 derniers événements', () => {
  const branch = detailBranch(js, 'session', "d.type === 'tool')");
  for (const field of ['s.status', 's.phase', 's.mode', 's.inProgress', 's.waitingFor', 's.blockedReason']) {
    assert.ok(branch.includes(field), `${field} absent de la vue détail d’une session`);
  }
  assert.match(branch, /\.filter\(\(e\) => e\.session === s\.id\)\.slice\(0, 12\)/, 'limite de 12 événements');
});

test('les nœuds « Toi » et « Événements » gardent leur vue détail (consignes et événements)', () => {
  assert.match(detailBranch(js, 'human', "d.type === 'quota')"), /snap\.inbox/, 'consignes listées sur le nœud « Toi »');
  assert.match(detailBranch(js, 'watch', '\n}\n'), /snap\.feed/, 'événements listés sur le nœud « Événements »');
  assert.match(js, /id: 'in:watch'/, 'nœud « Événements » toujours construit');
  assert.match(js, /id: 'in:human'/, 'nœud « Toi » toujours construit');
});

test('les quotas et le journal gardent leurs données d’origine', () => {
  assert.match(fnBody(js, 'renderJournal'), /snap\.journal \|\| \[\]/);
  assert.match(fnBody(js, 'renderQuotas'), /snap\.usage/);
});

test('DICT : fr et en ont exactement les mêmes clés', () => {
  assert.deepStrictEqual(dictKeys(js, 'en').sort(), dictKeys(js, 'fr').sort());
});

test('DICT : plus aucune clé des panneaux retirés', () => {
  const fr = dictKeys(js, 'fr');
  for (const k of ['sess.title', 'sess.count', 'sess.empty', 'sess.hint', 'act.title', 'act.all', 'act.none', 'act.empty', 'act.human', 'act.newSession', 'act.blocked', 'wf.title', 'inbox.title', 'phase.n', 'alert.inbox', 'alert.inbox.t']) {
    assert.ok(!fr.includes(k), `${k} devrait être retirée de DICT`);
  }
});

test('chaque clé sess.*, act.*, wf.*, feed.* et inbox.* restante est encore utilisée dans les sources', () => {
  const sources = js + html;
  for (const k of dictKeys(js, 'fr')) {
    if (!/^(sess|act|wf|feed|inbox)\./.test(k)) continue;
    // les occurrences entre quotes dans DICT (fr et en) ne comptent pas comme usage
    const quoted = sources.split(`'${k}'`).length - 1;
    const dataT = html.split(`data-t="${k}"`).length - 1;
    assert.ok(quoted + dataT > 2, `${k} n’est utilisée nulle part`);
  }
});
