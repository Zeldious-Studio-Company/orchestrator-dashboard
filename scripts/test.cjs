#!/usr/bin/env node
'use strict';
// Lanceur de tests sans dépendance (`npm test`), portable Windows / macOS / Linux, Node 18 à 25.
// Il ne dépend pas de l'expansion des motifs glob (npm ne la fait pas sous Windows avec Node 18/20) :
// il liste lui-même test/*.test.cjs, refuse une liste vide ou un fichier sans appel test(),
// puis lance `node --test` avec les fichiers explicites et renvoie son code de sortie.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT, 'test');

// Fichiers test/*.test.cjs d'un dossier, triés, chemins absolus.
function listTestFiles(dir = TEST_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.test.cjs'))
    .sort()
    .map((name) => path.join(dir, name));
}

// Vrai si le fichier contient au moins un appel test( (hors mot composé, ex. « latest(»).
function hasTestCall(file) {
  const src = fs.readFileSync(file, 'utf8');
  return /(^|[^\w$.])test\s*\(/m.test(src);
}

// Renvoie { files, problems } : problems est vide quand la suite est valide.
function checkTestFiles(dir = TEST_DIR) {
  const files = listTestFiles(dir);
  const problems = [];
  if (files.length === 0) {
    problems.push(`aucun fichier *.test.cjs trouvé dans ${dir}`);
  }
  for (const file of files) {
    if (!hasTestCall(file)) {
      problems.push(`${path.basename(file)} ne contient aucun appel test()`);
    }
  }
  return { files, problems };
}

function main(dir = TEST_DIR) {
  const { files, problems } = checkTestFiles(dir);
  if (problems.length > 0) {
    for (const p of problems) console.error(`npm test : ${p}`);
    return 1;
  }
  const run = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
  if (run.error) {
    console.error(`npm test : impossible de lancer node --test (${run.error.message})`);
    return 1;
  }
  return run.status === null ? 1 : run.status;
}

module.exports = { listTestFiles, hasTestCall, checkTestFiles, main };

if (require.main === module) {
  process.exitCode = main();
}
