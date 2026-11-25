# orchestrator-dashboard

*[Français](README.fr.md)*

A live, local web dashboard for **AI agent orchestrators**. It shows what your orchestrator is doing right now and, when it needs you, walks you through what to do **one step at a time**.

- **Live map**: sessions → agents → tools, linked by animated edges. Every real exchange (command, tool call, agent start, report, refusal) travels as a labelled packet. It shows the model each agent runs, AUTO tags for spawned agents, and draggable bubbles.
- **Blockers on their node**: each task that needs a human is attached to the session (`session`) or sub-agent (`agent`) it belongs to, and its steps show, one at a time, in a small window that floats over the live map, next to that node and linked to it by a line. Each step says *where* to act (exact link, local file opened at the right line, or command to copy), with one button per action. Without one, it stays on the « You » node. A session marked `pending` stays on the map until it is done.
- **Live map, usage quotas and log.** The dashboard shows the live map, the plan's usage quotas and the log. Sessions, live activity, pending instructions and events are shown on the map: the « You » and « Events » nodes and the session detail (click a session node).
- **Several projects** in one page (project selector), **English and French** interface.
- **Any orchestrator**: write one JSON file, or add a small adapter. Works with any language or framework.
- **No dependencies** (Node.js 18+), **read-only** for projects (confirmed actions run `claude`: relaunching a blocked session and writing a message to a session, see below), served on `127.0.0.1` only.

## Requirements

Node.js 18+ is required. **Node.js 22 or 24 LTS is recommended**, since Node.js 18 and 20 are end-of-life.

## Install (no git, no GitHub account)

The `v1.0.0` addresses below only work once the `v1.0.0` tag is published (before that, set `ORCH_DASHBOARD_REF` to a branch). The installer downloads a fixed release over HTTPS (Node.js 18+ required) and adds an `orchestrator-dashboard` command, which replaces `node server.cjs` below. Do not pipe it into a shell: download the script, check it, read it, then run it.

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/Zeldious-Studio-Company/orchestrator-dashboard/v1.0.0/install.ps1 -OutFile install.ps1
Get-Content install.ps1        # read it
.\install.ps1
```

macOS / Linux:

```bash
curl -fsSL -o install.sh https://raw.githubusercontent.com/Zeldious-Studio-Company/orchestrator-dashboard/v1.0.0/install.sh
less install.sh                # read it
sh install.sh
```

If a SHA256 checksum is published for the release, pass it to verify the downloaded archive before anything is installed: `ORCH_DASHBOARD_SHA256=<checksum>` (PowerShell: `$env:ORCH_DASHBOARD_SHA256 = '<checksum>'`). The installer then stops on any mismatch.

Options: `ORCH_DASHBOARD_REF` (tag or branch, default `v1.0.0`), `ORCH_DASHBOARD_DIR` (install folder). Windows only: the launcher folder is added to your user PATH only if you set `ORCH_DASHBOARD_ADD_PATH=1`. On macOS / Linux, the installer never edits your shell profile.

The installer only replaces an existing folder if it contains `server.cjs` and a `package.json` named `orchestrator-dashboard`; otherwise it stops and changes nothing. To update, run the installer again with the newer `ORCH_DASHBOARD_REF`.

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
  "tasks": [{ "id": "key", "session": "main", "title": "Provide the API key", "steps": [
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

**Relaunching a blocked session**: a blocked session with a valid `claudeSessionId` that is not alive gets a **Relaunch the session** button. After a confirmation box (project, session, folder and exact command), the dashboard runs `claude -p --resume <id> --output-format json` in the project folder, and shows whether it is running, finished or failed. The binary comes from `claudePath` in the dashboard's `config.json` (or the `ORCH_DASHBOARD_CLAUDE` variable); a `.cmd` script is refused. `claudePermissionMode` (`default`, `acceptEdits`, `plan`, `auto`, `dontAsk`) is optional and set only by the user. See [SECURITY.md](SECURITY.md).

**Writing to a session**: a node that is not alive (a session, a sub-agent, a workflow session) gets a **Write to the session** button. You type a message (up to 4000 characters, and 8 KB in bytes: about 2700 CJK characters or emoji), then confirm a box that shows the project, session, folder, exact command and the text. The dashboard runs the same `claude -p --resume <id>` command and passes the message on standard input; a sub-agent's message is sent to its owning session with a prefix naming the agent. Tools, « You » and « Events » have no such button. Messages are logged without their text. See [SECURITY.md](SECURITY.md).

## Commands

| Command | What it does |
| --- | --- |
| `node server.cjs start [folder] [port]` | registers the folder (if given) and starts the server in the background |
| `node server.cjs add <folder> [adapter] [file]` | registers a project without starting anything |
| `node server.cjs remove <folder>` | removes a project from the selector |
| `node server.cjs list` / `adapters` | registered projects / installed adapters |
| `node server.cjs status` / `url [folder]` / `stop` | server state, page address, stop |
| `node server.cjs snapshot <folder>` | prints the snapshot the dashboard reads (to check your file) |

**Settings**: `config.json` in the state folder (`{ "port": 4870, "editorUrl": "vscode://file{path}:{line}", "hideCommands": false }`), or the `ORCH_DASHBOARD_PORT`, `ORCH_DASHBOARD_EDITOR`, `ORCH_DASHBOARD_HIDE_COMMANDS` and `ORCH_DASHBOARD_HOME` variables. The state folder is `%LOCALAPPDATA%\orchestrator-dashboard-state` on Windows, `~/Library/Application Support/orchestrator-dashboard` on macOS and `$XDG_STATE_HOME/orchestrator-dashboard` (or `~/.local/state/...`) elsewhere; an existing `~/.claude/orchestrator-dashboard` folder is still used. `server.log` is rotated to `server.log.1` above 1 MB.

## Security

- The server only listens on `127.0.0.1` and rejects other `Host` headers (DNS rebinding) and foreign origins.
- Project files are never trusted. Fields are checked and truncated, links must be `http(s)`, and local paths must exist inside the project. Everything is rendered as text.
- The only action the page can trigger is revealing a step's file or folder in the file explorer. It goes by reference, never by path, and files are never executed.
- Adapters are only loaded from the dashboard's own `adapters/` folder.

## License

[MIT](LICENSE)
