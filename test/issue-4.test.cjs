// Tests du point 4 (issue #4) : pollution de Object.prototype par un agent nommé __proto__.
// Lancer : node --test test/   (Node 18+, aucune dépendance).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

// Le scénario tourne dans un processus enfant : une éventuelle pollution ne touche pas le lanceur de tests.
function runScenario(agents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'od-issue4-'));
  fs.writeFileSync(path.join(dir, '.orchestrator-dashboard.json'), JSON.stringify({ agents }));
  const code = `
    const json = require(${JSON.stringify(path.join(ROOT, 'adapters', 'json.cjs'))});
    let error = null;
    try { json.snapshot(${JSON.stringify(dir)}, { targets: new Map(), entry: null }); } catch (e) { error = String(e && e.message); }
    const polluted = ['total', 'live', 'last', 'models', 'agentTypes'].filter((k) => k in Object.prototype || k in {});
    process.stdout.write(JSON.stringify({ error, polluted, protoTotal: Object.prototype.total }));
  `;
  return JSON.parse(execFileSync(process.execPath, ['-e', code], { encoding: 'utf8' }));
}

test('un agent nommé __proto__ ne pollue pas Object.prototype', () => {
  const r = runScenario([{ name: '__proto__', status: 'running', model: 'm' }]);
  assert.strictEqual(r.error, null, 'le snapshot ne doit pas lever d\'erreur');
  assert.deepStrictEqual(r.polluted, [], `Object.prototype a reçu : ${r.polluted.join(', ')}`);
  assert.strictEqual(r.protoTotal, undefined);
});

test('un agent nommé constructor n\'écrit pas sur Object', () => {
  const r = runScenario([{ name: 'constructor', status: 'running', model: 'm' }]);
  assert.strictEqual(r.error, null, 'le snapshot ne doit pas lever d\'erreur');
  assert.deepStrictEqual(r.polluted, [], `Object.prototype a reçu : ${r.polluted.join(', ')}`);
});
