# orchestrator-dashboard

*[Français](README.fr.md)*

A live, local web dashboard for **AI agent orchestrators**. It shows what your orchestrator is doing right now and, when it needs you, walks you through what to do **one step at a time**.

- **Live map**: sessions → agents → tools, linked by animated edges. Every real exchange (command, tool call, agent start, report, refusal) travels as a labelled packet. It shows the model each agent runs, AUTO tags for spawned agents, and draggable bubbles.
- **Your turn**: every blocker that needs a human becomes a guided task. Each step says *where* to act (exact link, local file opened at the right line, or command to copy), with one button per action.
- **Sessions, live activity, usage, workflows, log, pending instructions, events.**
- **Several projects** in one page (project selector), **English and French** interface.
- **Any orchestrator**: write one JSON file, or add a small adapter. Works with any language or framework.
- **No dependencies** (Node.js 18+), **read-only**, served on `127.0.0.1` only.

## Install (no git, no GitHub account)

One command downloads the latest version over HTTPS (Node.js 18+ required) and adds an `orchestrator-dashboard` command, which replaces `node server.cjs` below.

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/Zeldious-Studio-Company/orchestrator-dashboard/main/install.ps1 | iex
```

macOS / Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/Zeldious-Studio-Company/orchestrator-dashboard/main/install.sh | sh
```

Run the same command again to update. Set `ORCH_DASHBOARD_REF` (branch or tag, e.g. `v1.0.0`) or `ORCH_DASHBOARD_DIR` (install folder) to change the defaults.

## Quick start

```bash
git clone https://github.com/Zeldious-Studio-Company/orchestrator-dashboard.git
cd orchestrator-dashboard
node server.cjs start examples      # demo project; prints the URL (http://127.0.0.1:4870/?p=…)
node server.cjs stop
```

## Plug in your orchestrator

Have your orchestrator write `.orchestrator-dashboard.json` at the root of its project, rewriting it whenever something changes:

```json
{
  "orchestrator": "MyOrchestrator",
  "project": { "name": "My project" },
  "sessions": [{ "id": "main", "name": "Planner", "alive": true, "status": "running", "model": "claude-opus-5-5" }],
  "tasks": [{ "id": "key", "title": "Provide the API key", "steps": [
    { "text": "Create a key", "url": "https://example.com/keys" },
    { "text": "Put it in the file", "path": "config/.env", "line": 1 }
  ] }]
}
```

Then register the project:

```bash
node server.cjs start /path/to/project
```

The full format (sessions, agents, activity, phases, usage, tasks, translations) and how to write an adapter are in **[FORMAT.md](FORMAT.md)**. Start from the complete example in [`examples/`](examples/.orchestrator-dashboard.json).

**Claude Code users**: give a session's `claudeSessionId` and the dashboard reads its model, sub-agents and their tools from the local Claude Code transcripts (read-only).

## Commands

| Command | What it does |
| --- | --- |
| `node server.cjs start [folder] [port]` | registers the folder (if given) and starts the server in the background |
| `node server.cjs add <folder> [adapter] [file]` | registers a project without starting anything |
| `node server.cjs remove <folder>` | removes a project from the selector |
| `node server.cjs list` / `adapters` | registered projects / installed adapters |
| `node server.cjs status` / `url [folder]` / `stop` | server state, page address, stop |
| `node server.cjs snapshot <folder>` | prints the snapshot the dashboard reads (to check your file) |

**Settings**: `config.json` in the state folder (`{ "port": 4870, "editorUrl": "vscode://file{path}:{line}", "hideCommands": false }`), or the `ORCH_DASHBOARD_PORT`, `ORCH_DASHBOARD_EDITOR`, `ORCH_DASHBOARD_HIDE_COMMANDS` and `ORCH_DASHBOARD_HOME` variables. The state folder is `%LOCALAPPDATA%\orchestrator-dashboard` on Windows, `~/Library/Application Support/orchestrator-dashboard` on macOS and `$XDG_STATE_HOME/orchestrator-dashboard` (or `~/.local/state/...`) elsewhere; an existing `~/.claude/orchestrator-dashboard` folder is still used. `server.log` is rotated to `server.log.1` above 1 MB.

## Security

- The server only listens on `127.0.0.1` and rejects other `Host` headers (DNS rebinding) and foreign origins.
- Project files are never trusted. Fields are checked and truncated, links must be `http(s)`, and local paths must exist inside the project. Everything is rendered as text.
- The only action the page can trigger is revealing a step's file or folder in the file explorer. It goes by reference, never by path, and files are never executed.
- Adapters are only loaded from the dashboard's own `adapters/` folder.

## License

[MIT](LICENSE)
