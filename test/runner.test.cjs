'use strict';
// Tests du lanceur scripts/test.cjs : il doit refuser une liste vide et un fichier sans test().
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { checkTestFiles, hasTestCall } = require('../scripts/test.cjs');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'runner-test-'));
}

test('refuse un dossier sans fichier *.test.cjs', () => {
  const dir = tmpDir();
  const { files, problems } = checkTestFiles(dir);
  assert.deepStrictEqual(files, []);
  assert.strictEqual(problems.length, 1);
});

test('refuse un fichier de test vide', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'vide.test.cjs'), '');
  const { problems } = checkTestFiles(dir);
  assert.ok(problems.some((p) => p.includes('vide.test.cjs')));
});

test('accepte un fichier qui appelle test()', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'ok.test.cjs'), "const test = require('node:test');\ntest('a', () => {});\n");
  const { files, problems } = checkTestFiles(dir);
  assert.strictEqual(files.length, 1);
  assert.deepStrictEqual(problems, []);
  assert.strictEqual(hasTestCall(files[0]), true);
});

test('ignore les fichiers qui ne sont pas *.test.cjs', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'helper.cjs'), "test('x', () => {});");
  const { files } = checkTestFiles(dir);
  assert.deepStrictEqual(files, []);
});
