# Security policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 1.0.x (`main`) | Yes |
| < 1.0.0 | No |

Only the latest release line receives security fixes.

## Reporting a vulnerability

Please do **not** open a public issue for a security problem.

Report it privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability** (private vulnerability reporting). Include:

- the affected version or commit,
- the steps or a proof of concept to reproduce it,
- the expected impact (for example: data exposed, local file access, remote access).

This is a local dashboard served on `127.0.0.1`. It is read-only for projects, with the exceptions described below, so reports about exposure beyond the local machine, cross-origin access, or unsafe handling of project files are especially useful.

## Relaunching a blocked session (the one action that runs a command)

A blocked session node can be relaunched from the page: the server runs `claude -p --resume <claudeSessionId> --output-format json`. What this does and what it exposes:

- It runs one Claude Code process with the **full rights of the user** who runs the dashboard. The dashboard cannot grant less than that: approval requests are refused in `-p` mode unless the user sets `claudePermissionMode` in their own `config.json`.
- Only sessions known from the latest snapshot can be targeted. The page sends a project id, a node id and a confirmation; the session id, folder and command are resolved by the server. A sub-agent relaunches its owning session. Sessions still alive, sessions whose transcript changed in the last 60 seconds, and sessions with a relaunch already running are refused.
- The user confirms each relaunch in a box that shows the project, session, folder and exact command. Nothing starts without that click.
- The binary is taken only from the user's setting (`claudePath` in `config.json`, or `ORCH_DASHBOARD_CLAUDE`), never from a project file. `.cmd` and `.bat` scripts are refused. The process starts without a shell, with arguments as an array, and its environment has no `ORCH_DASHBOARD_*` variable (so no dashboard token). The resume text is fixed and goes through standard input only.
- The process is stopped after 10 minutes, with its whole process tree. Its output is never shown to the page. Each attempt is logged in `server.log` (time, route, target, outcome), without any text.
- The route refuses requests without the access token (401), from another origin (403), without a JSON content type (415), with a body over 8 KB (413), and on any method other than POST (405).

## Writing a message to a session (a command that runs with your text)

The page can send a message to a session: the server runs `claude -p --resume <claudeSessionId> --output-format json` and passes the message on standard input. The message is the **only user text** that reaches the process, and it is never placed on the command line. What this exposes:

- The same process rights, refusals and limits as the relaunch above (same route guards, same binary setting, same 10-minute limit, same one-run-per-session lock, same refusals for alive, recent or unknown sessions). The text can make the session use its tools, which run with the user's rights; approval requests are refused in `-p` mode.
- Sub-agents send to their owning session, prefixed with `Pour l'agent <type> : ` (or `Pour le workflow « … » : ` for a workflow session), so the session knows whom the message is for. Human-opened sub-agents, tools, « Toi » and « Événements » refuse messages.
- The message is at most 4000 characters, and its request body at most 8 KB: either limit is refused with 413. The 8 KB limit counts bytes, so a text in multi-byte characters (CJK, emoji) reaches it at about 2700 characters, and the refusal is logged with a dash for the target and the size. An empty message is refused (400). The page shows the message as plain text, and the user confirms it in a box that shows the project, session, folder, exact command, length and the text itself. Nothing is sent without that click.
- Projects' hooks and MCP servers run, because the command does not use `--bare`. The dashboard does not add that risk: it runs in the project folder with the user's own configuration.
- The log (`server.log`) records time, route, target, length and outcome (sent, finished, failed, timed out), never the text.

We will do our best to acknowledge a report within 7 days and to keep you informed until it is resolved. Please allow a reasonable time for a fix before any public disclosure.
