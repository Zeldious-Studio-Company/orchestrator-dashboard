# Plugging an orchestrator into the dashboard

*[Français](FORMAT.fr.md)*

The dashboard (`server.cjs` + `index.html`) is not tied to any orchestrator: it shows a **snapshot in a neutral format** described here. There are two ways to plug an orchestrator in:

1. **No code: the open JSON file.** The orchestrator writes `.orchestrator-dashboard.json` at the root of its project and rewrites it on every change (write to a temporary file, then rename, so the file is never half-written). The dashboard rereads it every second. Any language works.
2. **An adapter.** A module `adapters/<name>.cjs` next to `server.cjs` reads the orchestrator's own files and returns the snapshot itself, with its own translated texts if it wants. Adapters are only loaded from that folder, never from a project.

Then, once per project:

```bash
node server.cjs start /path/to/project   # registers the project and starts the server if it is not running
```

One server serves every registered project, picked in the page (project selector). Other commands: `add <folder> [adapter] [file]`, `remove <folder>`, `list`, `adapters`, `status`, `url [folder]`, `stop`, `snapshot <folder>` (prints the snapshot it reads, to check a file).

**Settings**: `config.json` in the state folder (`{ "port": 4870, "editorUrl": "vscode://file{path}:{line}", "hideCommands": false }`) or the `ORCH_DASHBOARD_PORT`, `ORCH_DASHBOARD_EDITOR` and `ORCH_DASHBOARD_HIDE_COMMANDS` variables. The state folder is `%LOCALAPPDATA%\orchestrator-dashboard-state` on Windows, `~/Library/Application Support/orchestrator-dashboard` on macOS and `$XDG_STATE_HOME/orchestrator-dashboard` (or `~/.local/state/...`) elsewhere; an existing `~/.claude/orchestrator-dashboard` is still used. Move the folder itself with `ORCH_DASHBOARD_HOME`. It also holds the project registry (`projects.json`), the server address and its log.

## Texts and languages

The interface is in English and French (button in the header, browser language by default). Wherever the format says **Text**, you can give:

- a string: shown as is, whatever the language;
- `{ "en": "…", "fr": "…" }`: one text per language (the page language, otherwise the first available);
- `{ "k": "key", "p": { … } }`: a dictionary key (the page's or an adapter's).

## The `.orchestrator-dashboard.json` file

Every field is optional except those marked *(required)*. Dates are ISO 8601 (`2026-11-22T09:30:00Z`) or milliseconds since 1970. Full example: [`examples/.orchestrator-dashboard.json`](examples/.orchestrator-dashboard.json).

```jsonc
{
  "schema": 1,
  "orchestrator": "CrewRunner",                        // orchestrator name (badge and selector)
  "project": { "name": "Shop API", "badges": [{ "text": "production", "tone": "ok" }] },
  "run": { "state": "active", "text": "…" },           // active | paused | frozen | idle | error (otherwise derived from the sessions)

  "phases": {                                          // progress strip (absent = no strip)
    "list": [{ "en": "Plan", "fr": "Plan" }, "Build", "Review"],
    "current": 1,                                      // or "live": [1, 2] (running phases) and "reached": 2
    "skipped": []
  },

  "sessions": [{                                       // sessions, workers, processes…: session nodes on the map
    "id": "w1",                                        // (required) stable id
    "name": "Worker 1", "kind": "worker", "kindLabel": { "en": "worker", "fr": "ouvrier" },
    "parent": "lead",                                  // session that started it (link on the map)
    "alive": true, "auto": true,                       // auto = created automatically (AUTO tag)
    "status": "waiting",                               // running | starting | waiting | blocked | paused | done | handed-off | idle | failed
    "phase": "Build", "mode": "…", "inProgress": ["SHOP-12"], "waitingFor": "review", "blockedReason": "…",
    "model": "claude-sonnet-5-5",                      // model shown in the bubble
    "claudeSessionId": "…",                            // Claude Code session: model and sub-agents read from its transcript; letters, digits, _ and -, 8 to 80 characters, not starting with "-". Relaunchable and writable from the page only when alive is false (sub-agents relaunch or write to their owning session; the dashboard's own config.json sets the binary, never this file)
    "started": "…", "updated": "…", "host": "…", "note": "…", "pending": false   // pending: true keeps the session on the map while it is not done, even if not alive
  }],

  "activity": [{                                       // activity feed (300 at most)
    "ts": "2026-11-22T09:30:00Z", "session": "w1", "agent": "coder",
    "tool": "Bash", "what": "git commit -m feat",
    "category": "git",                                 // tool group (otherwise guessed: git, files, build, web, shell…)
    "blocked": false                                   // action refused by a guardrail
  }],
  "tools": [{ "id": "jira", "label": "Jira", "desc": "tickets", "color": "var(--info)", "icon": "board" }],  // extra groups

  "agents": [{                                         // sub-agents: "Agents" bubbles
    "name": "coder", "session": "w1", "model": "claude-sonnet-5-5", "status": "running",   // running | done | failed | silent
    "description": "Implements SHOP-12", "updated": "…", "tools": [{ "tool": "Edit", "what": "src/cart.ts", "ts": "…" }]
  }],
  "roster": [{ "name": "reviewer", "description": "…", "model": "sonnet" }],             // available agents (always shown)

  "tasks": [{                                          // what the human must do, step by step, shown on the node the task belongs to
    "id": "stripe-key",                                // (required) stable while the task stays the same
    "session": "w2",                                   // id of the session it belongs to (its node), optional
    "agent": "reviewer",                               // or the type of a sub-agent (its node "a:<type>"), optional
    "kind": "blocked", "kindLabel": "Blocked", "tone": "bad",
    "title": "Provide the Stripe key", "summary": "Worker 2 is waiting for #12", "doneText": "…",
    "steps": [                                         // one simple, checkable action per step, in order
      { "text": "Create a test key", "url": "https://dashboard.stripe.com/test/apikeys" },
      { "text": "Put it in the file", "path": "config/.env", "line": 3 },
      { "text": "Restart the worker", "cmd": "crew resume w2", "where": "Terminal, in the project folder" }
    ]
  }],
  // Attachment: "agent" wins over "session" when both are known; an unknown id, no id, or a node not drawn on the map goes to the "You" node, with a note. Nothing is deduced from status, pending or waitingFor.
  "links": { "item": "https://jira.example.com/browse/{id}", "pr": "https://…/pull/{id}" },   // #12 and step "item"/"pr"

  "alerts": [{ "tone": "warn", "title": "Budget", "text": "64% of the budget used" }],
  "usage": { "windows": [{ "label": "Token budget", "percent": 64, "resetsAt": "…" }], "updated": "…", "maxAgeMin": 30 },
  "claudeUsage": false,                                // true: when "usage" is absent, Claude account usage (usage-band mod)
  "journal": ["Plan approved", { "text": "SHOP-12 started", "ts": "2026-11-22 10:00" }],
  "inbox": { "items": ["Use Postgres 17"], "hint": "Write your instructions in inbox.txt", "title": "Instructions" },
  "feed": { "title": "Triggers", "items": [{ "ts": "…", "chip": "cron", "text": "Nightly run" }] },
  "workflows": [{ "id": "wf1", "tasks": [{ "id": "t1", "agent": "coder", "after": [] }], "parallel": 2, "done": false, "alive": true }],
  "hints": { "sessions": "…", "activity": "…", "usage": "…", "feed": "…", "inbox": "…" }  // texts shown when a section is empty; only "usage" is displayed as a panel, the other keys are read but not displayed
}
```

Icons available for `tools[].icon`: `board`, `git`, `files`, `build`, `web`, `gear`, `shell`.

### What the dashboard checks

The file is never trusted:

- every field is checked and truncated, and lists are capped;
- links must be `http(s)`; any other link is dropped. The "open at line" editor link comes from the user's settings, never from the file;
- a local location (`path`) must exist **inside the project folder**, otherwise the step shows "not found or outside the project";
- the page only sends the server the reference of a location, never a path. The file is only revealed in the file explorer, never run;
- colours are limited to theme variables and `#hex` colours;
- everything is rendered as text, never as HTML.

## Writing an adapter

```js
// adapters/my-orchestrator.cjs
const path = require('path');
const L = require('../lib.cjs');            // safe reads, Claude transcripts, checked steps (normStep), T(key, p)
module.exports = {
  id: 'my-orchestrator',
  name: 'My orchestrator',
  detect(dir) { return !!L.stat(path.join(dir, '.my-orch')); },    // is this folder mine?
  resolve(dir) { return dir; },              // optional: main folder of the project to follow
  projectName(dir) { return 'My project'; }, // optional
  // optional: translated texts, strings only ({param}, {n|one|many}, nested texts as parameters)
  i18n: { en: { 'mine.task': 'Review {n|the PR|the PRs}' }, fr: { 'mine.task': 'Valider {n|la PR|les PR}' } },
  snapshot(dir, env) {                       // env.targets: openable locations of the project (for L.stepContext)
    const ctx = L.stepContext(dir, [dir], env.targets);
    return {
      project: { name: 'My project', dir },
      sessions: [],
      tasks: [{ id: 'x', title: L.T('mine.task', { n: 2 }), steps: [L.normStep({ text: 'Read the README', path: 'README.md' }, ctx)] }],
    };
  },
};
```

`snapshot` returns the same fields as the JSON file above, already in the page's format (`node server.cjs snapshot <folder>` shows the result). Orchestrator-specific adapters are tried before the `json` adapter. To pick a project's adapter: `node server.cjs add <folder> <adapter>`.

`tasks[].attach` is computed by the dashboard, not by the adapter: from `session` and `agent` (a known `agent` wins), against the sessions and agent types of the snapshot. Any `attach` the adapter returns is overwritten. A task of a workflow session (`kind: "workflow"`) that the map does not draw (not alive, not recent, not blocked, not pending) stays on the « You » node with the note « attached to … not shown on the map »: a task does not make its workflow visible.
