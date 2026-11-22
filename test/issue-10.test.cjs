'use strict';
// Tests de base (issue #10) : aucune dépendance, lancés par `npm test` (node --test test/).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

test('package.json déclare le script "test" (node --test, sans dépendance)', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.match(pkg.scripts.test, /^node --test test\//);
  assert.deepStrictEqual(pkg.dependencies || {}, {}, 'le projet ne doit avoir aucune dépendance');
});

test('SECURITY.md existe et décrit le signalement et les versions suivies', () => {
  const text = fs.readFileSync(path.join(ROOT, 'SECURITY.md'), 'utf8');
  assert.match(text, /## Supported versions/);
  assert.match(text, /## Reporting a vulnerability/);
  assert.match(text, /Security/);
});

test('lib.cjs se charge sans erreur et expose ses fonctions', () => {
  const L = require(path.join(ROOT, 'lib.cjs'));
  for (const name of ['readText', 'stat', 'tailText', 'refreshProcs', 'pidAlive']) {
    assert.strictEqual(typeof L[name], 'function', `lib.cjs : ${name}`);
  }
});
