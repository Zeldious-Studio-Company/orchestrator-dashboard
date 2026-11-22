# Brancher un orchestrateur sur le tableau de bord

*[English](FORMAT.md)*

Le tableau de bord (`server.cjs` + `index.html`) n'est lié à aucun orchestrateur : il affiche un **instantané au format neutre** décrit ici. Deux façons d'y brancher un orchestrateur :

1. **Sans code : le fichier JSON ouvert.** L'orchestrateur écrit `.orchestrator-dashboard.json` à la racine de son projet, et le réécrit à chaque changement (écriture dans un fichier temporaire puis renommage, pour ne jamais laisser un fichier à moitié écrit). Le tableau de bord le relit toutes les secondes. N'importe quel langage convient.
2. **Avec un adaptateur.** Un module `adapters/<nom>.cjs` à côté de `server.cjs` lit les fichiers de l'orchestrateur et rend l'instantané lui-même, avec ses propres textes traduits s'il le souhaite. Les adaptateurs sont chargés uniquement depuis ce dossier, jamais depuis un projet.

Puis, une fois par projet :

```bash
node server.cjs start /chemin/du/projet   # inscrit le projet et lance le serveur s'il ne tourne pas
```

Un seul serveur sert tous les projets inscrits, choisis dans la page (sélecteur de projet). Autres commandes : `add <dossier> [adaptateur] [fichier]`, `remove <dossier>`, `list`, `adapters`, `status`, `url [dossier]`, `stop`, `snapshot <dossier>` (affiche l'instantané lu, pour vérifier un fichier).

**Réglages** : `config.json` dans le dossier d'état (`{ "port": 4870, "editorUrl": "vscode://file{path}:{line}", "hideCommands": false }`) ou les variables `ORCH_DASHBOARD_PORT`, `ORCH_DASHBOARD_EDITOR` et `ORCH_DASHBOARD_HIDE_COMMANDS`. Le dossier d'état est `%LOCALAPPDATA%\orchestrator-dashboard` sous Windows, `~/Library/Application Support/orchestrator-dashboard` sous macOS et `$XDG_STATE_HOME/orchestrator-dashboard` (ou `~/.local/state/...`) ailleurs ; un dossier `~/.claude/orchestrator-dashboard` existant reste utilisé. Le dossier lui-même se change avec `ORCH_DASHBOARD_HOME`. Il contient aussi le registre des projets (`projects.json`), l'adresse du serveur et son journal.

## Textes et langues

L'interface est en français et en anglais (bouton dans l'en-tête, langue du navigateur par défaut). Partout où le format dit **Texte**, on peut donner :

- une chaîne : affichée telle quelle, quelle que soit la langue ;
- `{ "fr": "…", "en": "…" }` : un texte par langue (la langue de la page, sinon la première disponible) ;
- `{ "k": "clé", "p": { … } }` : une clé du dictionnaire (celui de la page ou celui d'un adaptateur).

## Le fichier `.orchestrator-dashboard.json`

Tous les champs sont facultatifs, sauf ceux marqués *(requis)*. Les dates sont en ISO 8601 (`2026-11-22T09:30:00Z`) ou en millisecondes depuis 1970. Exemple complet : [`examples/.orchestrator-dashboard.json`](examples/.orchestrator-dashboard.json).

```jsonc
{
  "schema": 1,
  "orchestrator": "CrewRunner",                        // nom de l'orchestrateur (badge et sélecteur)
  "project": { "name": "Shop API", "badges": [{ "text": "production", "tone": "ok" }] },
  "run": { "state": "active", "text": "…" },           // active | paused | frozen | idle | error (sinon déduit des sessions)

  "phases": {                                          // frise du déroulé (absente = pas de frise)
    "list": [{ "fr": "Plan", "en": "Plan" }, "Code", "Revue"],
    "current": 1,                                      // ou "live": [1, 2] (phases en cours) et "reached": 2
    "skipped": []
  },

  "sessions": [{                                       // sessions, workers, process… : bulles « Sessions »
    "id": "w1",                                        // (requis) identifiant stable
    "name": "Worker 1", "kind": "worker", "kindLabel": { "fr": "ouvrier", "en": "worker" },
    "parent": "lead",                                  // session qui l'a lancée (lien sur la carte)
    "alive": true, "auto": true,                       // auto = créée automatiquement (étiquette AUTO)
    "status": "waiting",                               // running | starting | waiting | blocked | paused | done | handed-off | idle | failed
    "phase": "Code", "mode": "…", "inProgress": ["SHOP-12"], "waitingFor": "review", "blockedReason": "…",
    "model": "claude-sonnet-5-5",                      // modèle affiché dans la bulle
    "claudeSessionId": "…",                            // session Claude Code : modèle et sous-agents lus dans son transcript
    "started": "…", "updated": "…", "host": "…", "note": "…", "pending": false
  }],

  "activity": [{                                       // fil d'activité (300 au plus)
    "ts": "2026-11-22T09:30:00Z", "session": "w1", "agent": "coder",
    "tool": "Bash", "what": "git commit -m feat",
    "category": "git",                                 // groupe d'outils (sinon déduit : git, files, build, web, shell…)
    "blocked": false                                   // action refusée par un garde-fou
  }],
  "tools": [{ "id": "jira", "label": "Jira", "desc": "tickets", "color": "var(--info)", "icon": "board" }],  // groupes en plus

  "agents": [{                                         // sous-agents : bulles « Agents »
    "name": "coder", "session": "w1", "model": "claude-sonnet-5-5", "status": "running",   // running | done | failed | silent
    "description": "Implémente SHOP-12", "updated": "…", "tools": [{ "tool": "Edit", "what": "src/cart.ts", "ts": "…" }]
  }],
  "roster": [{ "name": "reviewer", "description": "…", "model": "sonnet" }],             // agents disponibles (toujours visibles)

  "tasks": [{                                          // « À toi d'agir » : ce que l'humain doit faire, étape par étape
    "id": "stripe-key",                                // (requis) stable tant que la tâche est la même
    "kind": "blocked", "kindLabel": "Bloqué", "tone": "bad",
    "title": "Fournir la clé Stripe", "summary": "Worker 2 attend #12", "doneText": "…",
    "steps": [                                         // une action simple et vérifiable par étape, dans l'ordre
      { "text": "Crée une clé de test", "url": "https://dashboard.stripe.com/test/apikeys" },
      { "text": "Mets-la dans le fichier", "path": "config/.env", "line": 3 },
      { "text": "Relance le worker", "cmd": "crew resume w2", "where": "Terminal, dans le dossier du projet" }
    ]
  }],
  "links": { "item": "https://jira.example.com/browse/{id}", "pr": "https://…/pull/{id}" },   // #12 et "item"/"pr" des étapes

  "alerts": [{ "tone": "warn", "title": "Budget", "text": "64 % du budget utilisé" }],
  "usage": { "windows": [{ "label": "Budget tokens", "percent": 64, "resetsAt": "…" }], "updated": "…", "maxAgeMin": 30 },
  "claudeUsage": false,                                // true : à défaut de "usage", quotas du compte Claude (mod usage-band)
  "journal": ["Plan validé", { "text": "SHOP-12 commencé", "ts": "2026-11-22 10:00" }],
  "inbox": { "items": ["Utiliser Postgres 17"], "hint": "Écris tes consignes dans inbox.txt", "title": "Consignes" },
  "feed": { "title": "Déclencheurs", "items": [{ "ts": "…", "chip": "cron", "text": "Run nightly" }] },
  "workflows": [{ "id": "wf1", "tasks": [{ "id": "t1", "agent": "coder", "after": [] }], "parallel": 2, "done": false, "alive": true }],
  "hints": { "sessions": "…", "activity": "…", "usage": "…", "feed": "…", "inbox": "…" }  // textes quand une section est vide
}
```

Icônes disponibles pour `tools[].icon` : `board`, `git`, `files`, `build`, `web`, `gear`, `shell`.

### Ce que le tableau de bord vérifie

Le fichier n'est jamais considéré comme sûr :

- chaque champ est vérifié et tronqué, et les listes sont limitées en taille ;
- les liens doivent être en `http(s)` ; tout autre lien est ignoré. Le lien « ouvrir à la ligne » dans l'éditeur vient des réglages de l'utilisateur, jamais du fichier ;
- un emplacement local (`path`) doit exister **dans le dossier du projet**, sinon l'étape affiche « introuvable ou hors du projet » ;
- la page n'envoie au serveur que la référence d'un emplacement, jamais un chemin. Le fichier est seulement montré dans l'explorateur, jamais exécuté ;
- les couleurs sont limitées aux variables du thème et aux couleurs `#hex` ;
- tout est rendu en texte, jamais en HTML.

## Écrire un adaptateur

```js
// adapters/mon-orchestrateur.cjs
const path = require('path');
const L = require('../lib.cjs');            // lecture sûre, transcripts Claude, étapes contrôlées (normStep), T(clé, p)
module.exports = {
  id: 'mon-orchestrateur',
  name: 'Mon orchestrateur',
  detect(dir) { return !!L.stat(path.join(dir, '.mon-orch')); },   // ce dossier est-il à moi ?
  resolve(dir) { return dir; },              // facultatif : dossier principal du projet à suivre
  projectName(dir) { return 'Mon projet'; }, // facultatif
  // facultatif : textes traduits, chaînes seulement ({param}, {n|un|plusieurs}, textes imbriqués en paramètre)
  i18n: { fr: { 'moi.task': 'Valider {n|la PR|les PR}' }, en: { 'moi.task': 'Review {n|the PR|the PRs}' } },
  snapshot(dir, env) {                       // env.targets : emplacements ouvrables du projet (pour L.stepContext)
    const ctx = L.stepContext(dir, [dir], env.targets);
    return {
      project: { name: 'Mon projet', dir },
      sessions: [],
      tasks: [{ id: 'x', title: L.T('moi.task', { n: 2 }), steps: [L.normStep({ text: 'Lis le README', path: 'README.md' }, ctx)] }],
    };
  },
};
```

`snapshot` rend les mêmes champs que le fichier JSON ci-dessus, déjà au format de la page (`node server.cjs snapshot <dossier>` montre le résultat). Les adaptateurs propres à un orchestrateur passent avant l'adaptateur `json`. Pour choisir l'adaptateur d'un projet : `node server.cjs add <dossier> <adaptateur>`.
