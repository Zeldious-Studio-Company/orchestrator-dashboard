// Issue #22 (mise à jour) : le détail d'un nœud s'affiche en fenêtre flottante sur la carte en direct, reliée au nœud par un trait.
// Tests statiques sur index.html et app.js (aucun navigateur, aucun serveur) : conteneur positionné, role dialog,
// Échap, trait de liaison, parité fr/en des nouvelles clés, pas d'innerHTML ni d'attributs on*.
// Lancer : node --test test/node-popover.test.cjs   (Node 18+, aucune dépendance)
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

// bloc CSS ou JS d'une règle, par son sélecteur de début de ligne
function ruleOf(src, selector) {
  const m = src.match(new RegExp(`^${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^{\\n]*\\{[^}]*\\}`, 'm'));
  return m ? m[0] : '';
}

test('la fenêtre est dans un conteneur positionné qui encadre la carte', () => {
  assert.match(ruleOf(html, '.mapwrap'), /position:\s*relative/);
  const wrap = html.indexOf('id="mapWrap"');
  const legend = html.indexOf('class="legend"');
  assert.ok(wrap > 0, 'id="mapWrap" manquant');
  const inner = html.slice(wrap, legend);
  assert.match(inner, /id="map"/, 'la carte doit être dans #mapWrap');
  assert.match(inner, /id="mapDetail"/, 'le détail doit être dans #mapWrap, au-dessus de la carte');
});

test('la fenêtre est positionnée en absolu, bornée en hauteur avec défilement interne', () => {
  const pop = ruleOf(html, '.pop');
  assert.match(pop, /position:\s*absolute/);
  assert.match(pop, /max-height:\s*520px/);
  assert.match(pop, /overflow-y:\s*auto/);
  assert.match(js, /wrap\.style\.minHeight = /, 'la carte doit grandir quand la fenêtre est ouverte');
  assert.doesNotMatch(js, /(\blink|\$\('mapLink'\))\.hidden\s*=/, 'hidden n existe pas sur un SVG : utiliser toggleAttribute');
});

test('la fenêtre a role dialog, focus programmable et un libellé fixé par le script', () => {
  assert.match(html, /id="mapDetail"[^>]*role="dialog"/);
  assert.match(html, /id="mapDetail"[^>]*tabindex="-1"/);
  assert.match(js, /el\.setAttribute\('aria-label', t\('d\.dialog'/);
  assert.match(js, /el\.focus\(\{ preventScroll: true \}\)/);
});

test('Échap ferme la fenêtre et rend le focus au nœud', () => {
  assert.match(js, /ev\.key === 'Escape' && mapSel && !\$\('mapDetail'\)\.hidden\) closeMapDetail\(true\)/);
  const close = js.slice(js.indexOf('function closeMapDetail'), js.indexOf('function closeMapDetail') + 400);
  assert.match(close, /r\.g\.focus\(\{ preventScroll: true \}\)/);
  assert.match(js, /const close = h\('button', \{ class: 'f', onclick: \(\) => closeMapDetail\(true\) \}/, 'le bouton Fermer doit passer par closeMapDetail');
});

test('un trait relie la fenêtre au nœud, avec une pointe sur le nœud', () => {
  assert.match(html, /<svg id="mapLink"[^>]*class="plink"[^>]*aria-hidden="true"/);
  assert.match(html, /<line id="mapLinkL"/);
  assert.match(html, /<polygon id="mapLinkA"/);
  assert.match(ruleOf(html, '.plink'), /pointer-events:\s*none/, 'le trait ne doit pas bloquer les clics sur les nœuds');
  assert.match(js, /setAttr\(\$\('mapLinkL'\), 'x1'/);
  assert.match(js, /setAttr\(\$\('mapLinkA'\), 'points'/);
  assert.match(html, /\.plink line \{ stroke: var\(--accent\)/, 'trait dans la couleur d accent');
});

test('la fenêtre suit le nœud : glisser, défilement de la carte, redimensionnement, instantané', () => {
  assert.match(js, /this\.onMoveNode && this\.onMoveNode\(id\);/);
  assert.match(js, /bubbleMap\.onMoveNode = \(\) => placeMapDetail\(\)/);
  assert.match(js, /\$\('map'\)\.addEventListener\('scroll', \(\) => placeMapDetail\(\), \{ passive: true \}\)/);
  assert.match(js, /window\.addEventListener\('resize', \(\) => placeMapDetail\(\)\)/);
  assert.match(js, /if \(withDetail\) renderMapDetail\(\);\n  placeMapDetail\(\);/);
});

test('écran étroit : fenêtre quasi pleine largeur, sous le nœud', () => {
  assert.match(js, /const narrow = window\.innerWidth < 640/);
  assert.match(js, /x = narrow \? g : cx - PW \/ 2; y = cy \+ gap;/);
  assert.match(js, /const PW = narrow \? Math\.max\(200, W - 2 \* g\)/);
});

test('le champ Écrire garde son texte et sa sélection à la reconstruction', () => {
  assert.match(js, /const act = document\.activeElement, draftSel = /);
  assert.match(js, /el\.querySelector\('\.msgtext'\)/);
  assert.match(js, /msgDraft\.set\(node, e\.target\.value\)/);
});

test('parité fr / en des nouvelles clés', () => {
  const fr = js.slice(js.indexOf('  fr: {'), js.indexOf('  en: {'));
  const en = js.slice(js.indexOf('  en: {'), js.indexOf('\n};', js.indexOf('  en: {')));
  for (const k of ['d.dialog']) {
    assert.match(fr, new RegExp(`'${k.replace('.', '\\.')}':`), `${k} absent du fr`);
    assert.match(en, new RegExp(`'${k.replace('.', '\\.')}':`), `${k} absent du en`);
  }
});

test('pas d innerHTML ni attribut on* ajouté (CSP) dans la fenêtre et son trait', () => {
  assert.doesNotMatch(js, /innerHTML/);
  assert.doesNotMatch(html, /\son[a-z]+\s*=\s*["']/i);
  assert.doesNotMatch(js, /setAttribute\(\s*['"]on/);
});

test('les pages décrivent la fenêtre flottante et non le détail sous la carte', () => {
  for (const f of ['README.md', 'README.fr.md']) {
    const doc = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.doesNotMatch(doc, /dans le détail de ce nœud|that node's detail/, `${f} décrit encore le détail sous la carte`);
  }
});
