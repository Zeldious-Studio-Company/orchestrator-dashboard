// Outils communs du tableau de bord, partagés par le serveur et par les adaptateurs (adapters/*.cjs) :
// lecture sûre de fichiers, processus vivants, transcripts Claude Code (modèle de chaque session et sous-agent),
// agents installés, quotas du mod usage-band, et étapes d'action humaine contrôlées (liens, emplacements locaux,
// commandes). Sans dépendance (Node 18+).
//
// Textes : un texte affiché par la page est soit une chaîne (écrite par une session ou un autre orchestrateur, montrée
// telle quelle), soit { k: 'clé', p: { paramètres } } traduit par la page (dictionnaire FR/EN de index.html),
// soit { fr: '…', en: '…' } (un texte par langue). T(k, p) fabrique le deuxième cas.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');

const T = (k, p) => (p ? { k, p } : { k });

// ---------- chemins ----------
// /c/x (Git Bash) -> C:/x ; C:\x -> C:/x
function toNative(p) {
  if (!p) return p;
  let s = String(p).trim();
  if (process.platform === 'win32') {
    const m = s.match(/^\/([a-zA-Z])(\/|$)(.*)$/);
    if (m) s = `${m[1].toUpperCase()}:/${m[3]}`;
  }
  return path.resolve(s);
}
const same = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
function inside(p, root) {
  const a = process.platform === 'win32' ? p.toLowerCase() : p;
  const r = process.platform === 'win32' ? root.toLowerCase() : root;
  const rel = path.relative(r, a);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

// ---------- lecture sûre ----------
function readText(f) { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } }
function stat(f) { try { return fs.statSync(f); } catch { return null; } }
function listDir(d) { try { return fs.readdirSync(d); } catch { return []; } }
function tailText(f, maxBytes) {
  let fd;
  try {
    fd = fs.openSync(f, 'r');
    const size = fs.fstatSync(fd).size;
    const len = Math.min(size, maxBytes);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len);
    return buf.toString('utf8');
  } catch { return ''; } finally { if (fd !== undefined) try { fs.closeSync(fd); } catch {} }
}
function tailLines(f, n, maxBytes = 256 * 1024) {
  const st = stat(f);
  if (!st) return [];
  let lines = tailText(f, maxBytes).split(/\r?\n/);
  if (st.size > maxBytes) lines.shift(); // première ligne coupée
  return lines.filter((l) => l.trim() !== '').slice(-n);
}
// les fichiers d'état sont écrits par les sessions : un fichier à moitié écrit garde sa dernière lecture valide
const jsonCache = new Map();
function readJson(f) {
  const st = stat(f);
  if (!st) { jsonCache.delete(f); return null; }
  const c = jsonCache.get(f);
  if (c && c.mtimeMs === st.mtimeMs && c.size === st.size) return c.data;
  const txt = readText(f);
  try {
    const data = JSON.parse(String(txt).replace(/^\uFEFF/, ''));
    if (jsonCache.size > 2000) jsonCache.clear();
    jsonCache.set(f, { mtimeMs: st.mtimeMs, size: st.size, data });
    return data;
  } catch { return c ? c.data : null; }
}
// fichier de configuration shell (VAR="valeur") : lu sans l'exécuter
function readShConfig(file, into = {}) {
  const txt = readText(file);
  if (txt == null) return into;
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z][A-Z0-9_]*)=(?:"([^"]*)"|'([^']*)'|([^\s#]*))/);
    if (m) into[m[1]] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return into;
}

// ---------- processus vivants (une seule commande tasklist, en cache) ----------
// exécutables Windows par chemin absolu (sinon Windows peut lancer un programme du dossier courant)
const WIN_SYSROOT = process.env.SystemRoot || 'C:\\Windows';
const WIN_TASKLIST = path.join(WIN_SYSROOT, 'System32', 'tasklist.exe');
const WIN_EXPLORER = path.join(WIN_SYSROOT, 'explorer.exe');
let procCache = { at: 0, pids: null };
let procPending = null;
function refreshProcs() {
  if (process.platform !== 'win32') return Promise.resolve();
  if (procPending) return procPending;
  if (procCache.pids && Date.now() - procCache.at < 5000) return Promise.resolve(); // au plus une fois toutes les 5 s
  procPending = new Promise((resolve) => {
    execFile(WIN_TASKLIST, ['/FO', 'CSV', '/NH'], { windowsHide: true, maxBuffer: 8 * 1024 * 1024 }, (err, out) => {
      if (!err) {
        const pids = new Map();
        for (const line of out.split(/\r?\n/)) {
          const m = line.match(/^"([^"]*)","(\d+)"/);
          if (m) pids.set(Number(m[2]), m[1]);
        }
        procCache = { at: Date.now(), pids };
      }
      procPending = null; resolve();
    });
  });
  return procPending;
}
// pidAlive(pid, image) : sous Windows, un pid réutilisé par un autre programme ne compte pas (image = nom attendu)
function pidAlive(pid, image) {
  if (!/^\d+$/.test(String(pid || ''))) return false;
  const n = Number(pid);
  if (process.platform === 'win32') {
    if (!procCache.pids) return false;
    const img = procCache.pids.get(n);
    return !!img && (!image || image.test(img));
  }
  try { process.kill(n, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

// ---------- catégorie d'un appel d'outil (cible vers laquelle va l'action) ----------
// rules : règles propres à un orchestrateur, essayées avant les règles communes sur les commandes shell
// ([{ cat: 'tickets', re: /jira-cli/ }, …])
function classifier(rules = []) {
  return function classify(tool, what) {
    if (/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(tool)) return 'files';
    if (/^(Read|Grep|Glob|LS)$/.test(tool)) return 'read';
    if (tool === 'Agent' || tool === 'Task') return 'agent';
    if (tool === 'Workflow') return 'workflow';
    if (tool === 'mcp__ccd_session__start_session') return 'session';
    if (/^(WebSearch|WebFetch)$/.test(tool) || /^mcp__(Claude_Browser|claude-in-chrome)__/.test(tool)) return 'web';
    if (tool !== 'Bash' && tool !== 'PowerShell') return /^mcp__/.test(tool) ? 'mcp' : 'other';
    const w = what || '';
    for (const r of rules) if (r.re.test(w)) return r.cat;
    if (/(^|[\s;&|(])git\s/.test(w)) return 'git';
    if (/(^|[\s;&|(\/])(dotnet|npm|npx|pnpm|yarn|node|python3?|py|pytest|cargo|go|make|gradle|mvn|godot|tsc|vitest|jest)(\s|$)|build[-\w]*\.sh|test[-\w]*\.sh/.test(w)) return 'build';
    return 'shell';
  };
}
// groupes d'outils communs (bulles « Outils » de la carte) ; un adaptateur peut en ajouter (gestion de tickets…)
const BASE_TOOLS = [
  { id: 'git', label: T('tool.git'), desc: T('tool.git.d'), color: 'var(--warn)' },
  { id: 'files', label: T('tool.files'), desc: T('tool.files.d'), color: 'var(--ok)' },
  { id: 'build', label: T('tool.build'), desc: T('tool.build.d'), color: 'var(--accent)' },
  { id: 'web', label: T('tool.web'), desc: T('tool.web.d'), color: 'var(--m-fable)' },
  { id: 'shell', label: T('tool.shell'), desc: T('tool.shell.d'), color: 'var(--muted)' },
];
// résumé d'un appel d'outil (commande, fichier, agent…), sur une ligne
function toolWhat(name, input) {
  const i = input || {};
  let w;
  if (name === 'Bash' || name === 'PowerShell') w = i.command;
  else if (/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(name)) w = i.file_path || i.notebook_path;
  else if (name === 'Agent' || name === 'Task') w = `${i.subagent_type || ''} : ${i.description || ''}`;
  else w = i.description || i.file_path || i.pattern || i.url || i.query || i.name || i.title || i.scriptPath || '';
  return String(w || '').replace(/[\t\r\n]+/g, ' ').slice(0, 300);
}
// résumé tel qu'un hook PreToolUse le note dans un fil d'activité (pour retrouver la ligne d'un appel lu dans un transcript)
function guardWhat(name, input) {
  const i = input || {};
  if (name === 'Bash' || name === 'PowerShell') return i.command || '';
  if (/^(Edit|Write|MultiEdit)$/.test(name)) return i.file_path || '';
  if (name === 'Agent' || name === 'Task') return `${i.subagent_type || ''} : ${i.description || ''}`;
  if (name === 'mcp__ccd_session__start_session') return i.title || '';
  return i.description || i.name || i.scriptPath || '';
}
const sigOf = (tool, what) => `${tool}|${String(what || '').replace(/\s+/g, ' ').trim().slice(0, 80)}`;
const HOOK_REFUSAL = /^PreToolUse:\S+ hook (error|blocking)/;

// ---------- transcripts Claude Code : modèle de chaque session et de chaque sous-agent ----------
// <racine Claude>/projects/<dossier assaini>/<session_id>.jsonl (session) et <session_id>/subagents/ :
//   agent-<id>.meta.json (type d'agent, alias de modèle demandé) + agent-<id>.jsonl (transcript),
//   workflows/wf_<id>/ (tâches d'un workflow, journal.jsonl : started / result / failed).
// Lecture seule ; seules les fins de fichiers récents sont lues, en cache tant que le fichier ne change pas.
const RECENT_MS = 6 * 3600 * 1000;        // au-delà, un agent ou une session sans activité n'est plus montré
const LIVE_MS = 15 * 60 * 1000;           // fichier modifié depuis moins longtemps : agent considéré actif
function claudeRoot() {
  return process.env.CLAUDE_CONFIG_DIR ? toNative(process.env.CLAUDE_CONFIG_DIR) : path.join(os.homedir(), '.claude');
}
// dossier du tableau de bord (registre des projets, adresse du serveur, journal, config.json)
function stateDir() {
  return process.env.ORCH_DASHBOARD_HOME ? toNative(process.env.ORCH_DASHBOARD_HOME) : path.join(claudeRoot(), 'orchestrator-dashboard');
}
// réglages de l'utilisateur : <stateDir>/config.json ({ "port": 4870, "editorUrl": "vscode://file{path}:{line}" }),
// remplacés par les variables ORCH_DASHBOARD_PORT et ORCH_DASHBOARD_EDITOR
function settings() {
  const j = readJson(path.join(stateDir(), 'config.json'));
  const c = j && typeof j === 'object' ? j : {};
  const env = process.env;
  return {
    port: Number(env.ORCH_DASHBOARD_PORT || c.port || 4870),
    editorUrl: env.ORCH_DASHBOARD_EDITOR != null ? env.ORCH_DASHBOARD_EDITOR : typeof c.editorUrl === 'string' ? c.editorUrl : 'vscode://file{path}:{line}',
  };
}
// usageBand : quotas du compte lus par le mod usage-band (windows.json : 5 h / 7 j, models.json : par modèle) ;
// null si le mod n'est pas installé ou si ses fichiers sont illisibles
function usageBand() {
  const d = path.join(claudeRoot(), 'usage-band');
  const windows = []; let at = 0;
  for (const f of ['windows.json', 'models.json']) {
    const j = readJson(path.join(d, f));
    if (!j || !Array.isArray(j.list) || !(Number(j.observedAt) > 0)) continue;
    for (const w of j.list) {
      if (!w || typeof w.kind !== 'string' || typeof w.percentUsed !== 'number') continue;
      const label = w.kind === 'five_hour' ? T('usage.fiveHour') : w.kind === 'seven_day' ? T('usage.sevenDay')
        : w.kind.startsWith('model:') ? T('usage.model', { m: w.kind.slice(6) }) : w.kind;
      windows.push({ label, percent: w.percentUsed, resetsAt: w.resetsAt || '' });
    }
    at = Math.max(at, Number(j.observedAt));
  }
  return windows.length ? { savedTs: Math.floor(at / 1000), source: 'usage-band', windows } : null;
}
const sanitize = (d) => path.resolve(d).replace(/[^a-zA-Z0-9]/g, '-');
const transcriptPath = new Map(); // sid -> { file, at }
function findTranscript(sid, dirs) {
  if (!/^[A-Za-z0-9_-]+$/.test(sid)) return null;
  const c = transcriptPath.get(sid);
  if (c && c.file && stat(c.file)) return c.file;
  if (c && !c.file && Date.now() - c.at < 10 * 60 * 1000) return null;
  const projects = path.join(claudeRoot(), 'projects');
  let file = null;
  for (const d of dirs) { const f = path.join(projects, sanitize(d), `${sid}.jsonl`); if (stat(f)) { file = f; break; } }
  // dossier de travail différent (worktree, nom long abrégé par Claude Code) : on cherche dans tous les projets
  if (!file) for (const p of listDir(projects)) { const f = path.join(projects, p, `${sid}.jsonl`); if (stat(f)) { file = f; break; } }
  transcriptPath.set(sid, { file, at: Date.now() });
  return file;
}
function lastMatch(re, txt) { let m, last = null; re.lastIndex = 0; while ((m = re.exec(txt))) last = m[1]; return last; }
// modèle des réponses de l'agent (message), à défaut des requêtes (params) ; jamais un champ « model » quelconque
const MSG_MODEL_RE = /"message":\{"model":"([^"<]+)"/g;
const REQ_MODEL_RE = /"params":\{"model":"([^"<]+)"/g;

// lecture d'un transcript : modèle, raison d'arrêt, derniers outils utilisés et refus d'un hook
const infoCache = new Map();
function transcriptInfo(f, classify) {
  const st = stat(f);
  if (!st) return null;
  const c = infoCache.get(f);
  if (c && c.mtimeMs === st.mtimeMs && c.size === st.size && c.classify === classify) return c.data;
  const TAIL = 256 * 1024;
  let txt = tailText(f, TAIL);
  let model = '', stop = '', handback = false;
  const tools = []; const byId = new Map();
  const lines = txt.split('\n');
  if (st.size > TAIL) lines.shift(); // première ligne coupée
  for (const line of lines) {
    if (!line || !(line.includes('"tool_') || line.includes('"model"') || line.includes('"stop_reason"'))) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    const msg = o && o.message;
    if (!msg || typeof msg !== 'object') continue;
    if (o.type === 'assistant' && typeof msg.model === 'string' && msg.model && !msg.model.startsWith('<')) model = msg.model;
    if (typeof msg.stop_reason === 'string' && msg.stop_reason) stop = msg.stop_reason;
    if (!Array.isArray(msg.content)) continue;
    const t = Date.parse(o.timestamp) || st.mtimeMs;
    for (const b of msg.content) {
      if (!b || typeof b !== 'object') continue;
      if (b.type === 'tool_use' && typeof b.name === 'string') {
        // rapport rendu à l'appelant : le sous-agent a fini (son transcript s'arrête sur cet appel, sans end_turn)
        if (b.name === 'SubagentHandback') { handback = true; continue; }
        const what = toolWhat(b.name, b.input);
        const x = { t, tool: b.name, what, cat: classify(b.name, what), refused: false, sig: sigOf(b.name, String(guardWhat(b.name, b.input)).replace(/[\t\r\n]+/g, ' ').slice(0, 300)) };
        tools.push(x); if (b.id) byId.set(b.id, x);
      } else if (b.type === 'tool_result' && b.is_error && byId.has(b.tool_use_id)) {
        const ct = typeof b.content === 'string' ? b.content : Array.isArray(b.content) ? b.content.map((k) => (k && k.text) || '').join(' ') : '';
        if (HOOK_REFUSAL.test(ct)) { const x = byId.get(b.tool_use_id); x.refused = true; x.reason = ct.replace(HOOK_REFUSAL, '').replace(/^[:\s]+/, '').replace(/^\[[^\]]*\]:\s*/, '').slice(0, 200); }
      }
    }
  }
  if (!model && st.size > TAIL) { txt = tailText(f, 4 * 1024 * 1024); model = lastMatch(MSG_MODEL_RE, txt) || ''; }
  if (!model) model = lastMatch(REQ_MODEL_RE, txt) || '';
  const refused = tools.filter((x) => x.refused);
  const data = { model, stop, finished: stop === 'end_turn' || handback, mtime: st.mtimeMs, tools: tools.slice(-15), lastRefusal: refused.length ? refused[refused.length - 1] : null };
  if (infoCache.size > 3000) infoCache.clear();
  infoCache.set(f, { mtimeMs: st.mtimeMs, size: st.size, classify, data });
  return data;
}

// ---------- agents installés (fichiers .md avec en-tête name / description / model) ----------
function readRoster(dirs) {
  const out = new Map();
  for (const d of dirs) {
    for (const n of listDir(d)) {
      if (!n.endsWith('.md')) continue;
      const txt = readText(path.join(d, n)) || '';
      const fm = txt.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!fm) continue;
      const get = (k) => { const m = fm[1].match(new RegExp(`^${k}:\\s*(.*)$`, 'm')); return m ? m[1].trim().replace(/^["']|["']$/g, '') : ''; };
      const name = get('name') || n.replace(/\.md$/, '');
      if (!out.has(name)) out.set(name, { name, description: get('description').slice(0, 300), model: get('model') });
    }
  }
  return [...out.values()].sort((a, b) => a.name.localeCompare(b.name));
}
const wfCache = new Map();
function wfJournal(f) {
  const st = stat(f);
  if (!st) return new Map();
  const c = wfCache.get(f);
  if (c && c.mtimeMs === st.mtimeMs && c.size === st.size) return c.data;
  const data = new Map(); // agentId -> { status, label }
  for (const line of (readText(f) || '').split(/\r?\n/)) {
    if (!line) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    if (!o.agentId) continue;
    const prev = data.get(o.agentId) || {};
    if (o.type === 'started') data.set(o.agentId, { status: 'running', label: o.label || prev.label || '' });
    else if (o.type === 'result') data.set(o.agentId, { ...prev, status: 'done' });
    else if (o.type === 'failed') data.set(o.agentId, { ...prev, status: 'failed' });
  }
  if (wfCache.size > 500) wfCache.clear();
  wfCache.set(f, { mtimeMs: st.mtimeMs, size: st.size, data });
  return data;
}
function subAgents(sessDir, now, parentStopped, classify) {
  const out = [];
  const scan = (dir, wf, journal) => {
    for (const n of listDir(dir)) {
      const m = n.match(/^agent-([A-Za-z0-9_-]+)\.meta\.json$/);
      if (!m) continue;
      const jf = path.join(dir, `agent-${m[1]}.jsonl`);
      const st = stat(jf) || stat(path.join(dir, n));
      if (!st || now - st.mtimeMs > RECENT_MS) continue;
      const meta = readJson(path.join(dir, n)) || {};
      const info = transcriptInfo(jf, classify);
      const j = journal ? journal.get(m[1]) : null;
      let status;
      if (j && j.status !== 'running') status = j.status;
      else if (info && info.finished && !j) status = 'done';
      else status = now - st.mtimeMs < LIVE_MS && !parentStopped ? 'running' : 'silent';
      out.push({
        id: m[1], type: meta.agentType || 'agent', description: meta.description || (j && j.label) || '',
        alias: meta.model || '', model: (info && info.model) || meta.pickedEffortModel || '',
        status, mtime: Math.round(st.mtimeMs), workflow: wf, background: meta.requestShape === 'background',
        tools: info ? info.tools : [], lastRefusal: info ? info.lastRefusal : null,
      });
    }
  };
  const sub = path.join(sessDir, 'subagents');
  scan(sub, null, null);
  for (const w of listDir(path.join(sub, 'workflows'))) {
    if (!/^wf_[A-Za-z0-9_-]+$/.test(w)) continue;
    const wd = path.join(sub, 'workflows', w);
    const jst = stat(path.join(wd, 'journal.jsonl'));
    if (jst && now - jst.mtimeMs > RECENT_MS) continue;
    scan(wd, w, wfJournal(path.join(wd, 'journal.jsonl')));
  }
  // totaux par type d'agent sur les 6 dernières heures, avant la coupe (les agents en cours passent en premier)
  const types = {};
  for (const a of out) {
    const t = types[a.type] || (types[a.type] = { live: 0, total: 0, last: 0, models: {} });
    t.total++; if (a.status === 'running') t.live++;
    t.last = Math.max(t.last, a.mtime);
    if (a.model) t.models[a.model] = (t.models[a.model] || 0) + 1;
  }
  out.sort((a, b) => ((b.status === 'running') - (a.status === 'running')) || b.mtime - a.mtime);
  // détail gardé : agents en cours ou actifs dans les 30 dernières minutes
  const keep = out.filter((a) => a.status === 'running' || now - a.mtime < 30 * 60 * 1000);
  return { list: keep.slice(0, 60), types, count: out.length };
}
// claudeAgents : une entrée par session Claude Code connue de l'orchestrateur (dernier transcript), avec son modèle
// et ses sous-agents.
//   sids     : Map(id de session Claude -> id de session de l'orchestrateur, ou null = session ouverte par l'humain)
//   sessions : Map(id de session de l'orchestrateur -> { name, alive })
function claudeAgents(dirs, sids, sessions, classify) {
  const now = Date.now();
  const perId = new Map();
  for (const [sid, key] of sids) {
    const f = findTranscript(sid, dirs);
    const st = f && stat(f);
    if (!st) continue;
    const id = key || `human:${sid}`; // une entrée par session ouverte par l'humain (chacune a ses sous-agents)
    const prev = perId.get(id);
    if (prev && prev.st.mtimeMs >= st.mtimeMs) continue;
    perId.set(id, { sid, key, f, st });
  }
  const out = [];
  for (const [id, x] of perId) {
    const sess = x.key ? sessions.get(x.key) : null;
    if (!(sess && sess.alive) && now - x.st.mtimeMs > RECENT_MS) continue;
    const info = transcriptInfo(x.f, classify) || {};
    const active = sess ? sess.alive : now - x.st.mtimeMs < LIVE_MS && info.stop !== 'end_turn';
    const sub = subAgents(path.join(path.dirname(x.f), x.sid), now, !!sess && !sess.alive, classify);
    // signatures gardées pour le rapprochement avec le fil d'activité, puis retirées (copies : le cache garde l'original)
    const _tools = sub.list.flatMap((a) => (a.tools || []).map((u) => ({ t: u.t, sig: u.sig, agent: a.type, id: a.id })));
    for (const a of sub.list) { a.tools = (a.tools || []).map(({ sig, ...r }) => r); if (a.lastRefusal) { const { sig, ...r } = a.lastRefusal; a.lastRefusal = r; } }
    out.push({
      session: x.key || 'human', sid: x.sid, name: sess ? sess.name : null, model: info.model || '', stop: info.stop || '',
      alive: !!active, mtime: Math.round(x.st.mtimeMs), agents: sub.list, agentTypes: sub.types, agentCount: sub.count, _tools,
    });
  }
  out.sort((a, b) => (b.alive - a.alive) || b.mtime - a.mtime);
  return out.slice(0, 25);
}
// un outil lancé par un sous-agent est noté par le hook sous l'id de la session parente : on le rend au
// sous-agent quand son transcript contient le même appel à quelques secondes près (activity : { sid, tool, what, t })
function attributeSubagentTools(agents, activity) {
  const subTools = new Map(); // sid -> Map(signature -> [{t, agent, id}])
  for (const a of agents) {
    for (const u of a._tools || []) {
      const m = subTools.get(a.sid) || new Map(); subTools.set(a.sid, m);
      const arr = m.get(u.sig) || []; arr.push({ t: u.t, agent: u.agent, id: u.id }); m.set(u.sig, arr);
    }
    delete a._tools;
  }
  for (const e of activity) {
    const m = subTools.get(e.sid); if (!m || !e.t) continue;
    const hit = (m.get(sigOf(e.tool, e.what)) || []).find((c) => Math.abs(c.t - e.t) < 20000);
    if (hit) { e.agent = hit.agent; e.agentId = hit.id; }
  }
}

// ---------- étapes d'action humaine ----------
// Une étape = un texte et, au choix, un lien web (url), un emplacement local (ouvert par POST /api/open : la page
// n'envoie qu'une référence, jamais un chemin) ou une commande à copier (cmd). Tout ce qui vient d'un fichier écrit
// par une session ou par un autre orchestrateur passe par normStep : liens http(s) seulement, emplacements limités
// aux dossiers du projet (ctx.roots), textes tronqués.
const BAD_SCHEME = /^\s*(javascript|data|vbscript|file|blob):/i;
const httpUrl = (u) => (typeof u === 'string' && /^https?:\/\/[^\s"'<>]+$/i.test(u.trim()) ? u.trim() : null);
// cleanText : texte affichable venu d'un fichier (chaîne, { k, p } ou { fr, en, … }) ; '' sinon
function cleanText(v, max = 2000) {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v).slice(0, max);
  if (typeof v !== 'object' || Array.isArray(v)) return '';
  if (typeof v.k === 'string') {
    const p = {};
    if (v.p && typeof v.p === 'object') for (const [k, x] of Object.entries(v.p).slice(0, 20)) p[String(k).slice(0, 40)] = typeof x === 'object' ? cleanText(x, 500) : String(x).slice(0, 500);
    return { k: v.k.slice(0, 80), p };
  }
  const o = {};
  for (const [k, x] of Object.entries(v)) if (/^[a-z]{2}(-[A-Za-z]{2})?$/.test(k) && typeof x === 'string') o[k] = x.slice(0, max);
  return Object.keys(o).length ? o : '';
}
const plain = (v) => (typeof v === 'string' ? v : '');
function editorUrl(tpl, p, line) {
  if (!tpl || BAD_SCHEME.test(tpl) || !/^[a-z][a-z0-9+.-]*:/i.test(tpl)) return null;
  let u = p.replace(/\\/g, '/');
  if (!u.startsWith('/')) u = `/${u}`; // C:/x -> /C:/x (vscode://file/C:/x)
  return tpl.replace('{path}', encodeURI(u).replace(/#/g, '%23').replace(/\?/g, '%3F')).replace('{line}', String(line || 1));
}
// stepContext : contexte des étapes d'un dossier ; targets est partagé par tout un projet (références ouvrables)
//   { dir, roots: [dossiers autorisés], targets: Map, links: { wi(id), pr(id, repo) } | null, editorTpl }
function stepContext(dir, roots, targets, opts = {}) {
  const real = [];
  for (const r of roots) { try { real.push(fs.realpathSync(r)); } catch {} }
  return { dir, roots: real, targets, claude: claudeRoot(), links: opts.links || null, editorTpl: opts.editorTpl ?? settings().editorUrl };
}
// localTarget : emplacement local existant sous un dossier autorisé, sinon null
function localTarget(p, line, ctx) {
  if (typeof p !== 'string' || !p.trim() || p.length > 1000) return null;
  let s = p.trim().replace(/^["'`]|["'`]$/g, '').replace(/^~(?=[/\\])/, os.homedir());
  let ln = Number(line) > 0 ? Math.floor(Number(line)) : null;
  const m = s.match(/^(.+?):(\d+)(?::\d+)?$/); // chemin:ligne
  if (m && !/^[a-zA-Z]$/.test(m[1])) { s = m[1]; ln = ln || Number(m[2]); }
  const abs = path.isAbsolute(s) || /^\/[a-zA-Z](\/|$)/.test(s) ? toNative(s) : path.resolve(ctx.dir, s);
  let real;
  try { real = fs.realpathSync(abs); } catch { return null; }
  if (!ctx.roots.some((r) => inside(real, r))) return null;
  const st = stat(real);
  if (!st) return null;
  const dir = st.isDirectory();
  const ref = crypto.createHash('sha1').update(`${real}\n${ln || ''}`).digest('hex').slice(0, 16);
  ctx.targets.set(ref, { path: real, line: ln, dir, roots: ctx.roots }); // roots : revérifiés au clic (openLocal)
  const root = ctx.roots.find((r) => inside(real, r));
  const rel = path.relative(root, real) || path.basename(real);
  const label = `${same(root, ctx.claude) ? '~/.claude/' : ''}${rel.replace(/\\/g, '/')}${dir ? '/' : ''}${ln ? `:${ln}` : ''}`;
  return { ref, label, full: real, line: ln, dir, editor: dir ? null : editorUrl(ctx.editorTpl, real, ln) };
}
// normStep : étape (texte, ou objet { text, url, label, path, line, cmd, where, item, pr })
function normStep(x, ctx) {
  if (x == null) return null;
  if (typeof x !== 'object' || Array.isArray(x) || typeof x.k === 'string') x = { text: x };
  const text = cleanText(x.text ?? x.title ?? x.step ?? '');
  const raw = typeof text === 'string' ? text.trim() : '';
  const step = { text: typeof text === 'string' ? raw : text };
  const u = httpUrl(x.url || x.link);
  const num = (v) => String(v ?? '').replace(/^#/, '');
  if (u) step.url = u;
  else if (ctx.links && /^\d+$/.test(num(x.item))) step.url = ctx.links.wi(num(x.item));
  else if (ctx.links && /^\d+$/.test(num(x.pr))) step.url = ctx.links.pr(num(x.pr));
  if (!step.url) { const mu = raw.match(/https?:\/\/[^\s<>"'`)\]]+/); if (mu) step.url = httpUrl(mu[0].replace(/[.,;:!?]+$/, '')) || undefined; }
  if (!step.url) delete step.url;
  if (x.label) step.urlLabel = String(plain(x.label) || '').slice(0, 80) || undefined;
  const want = x.path || x.file;
  let t = want ? localTarget(String(want), x.line, ctx) : null;
  if (want && !t) step.missing = String(want).slice(0, 300);
  if (!t && !want) { // `chemin` cité dans le texte et qui existe : rendu cliquable
    for (const mm of raw.matchAll(/`([^`\n]{2,300})`/g)) { if ((t = localTarget(mm[1], null, ctx))) break; }
  }
  if (t) step.open = t;
  const c = x.cmd || x.command;
  if (c) step.cmd = String(c).slice(0, 500);
  // où faire l'étape quand ce n'est ni une page web ni un emplacement local : l'outil où taper la commande
  const w = cleanText(x.where ?? x.tool ?? '', 300);
  if (w) step.where = w;
  else if (step.cmd) step.where = /^\//.test(step.cmd) ? T('where.claudeCode') : T('where.terminal', { dir: ctx.dir });
  if (!raw && typeof step.text === 'string' && !step.url && !step.open && !step.cmd) return null;
  if (!step.text) step.text = step.url ? T('step.openLink') : step.open ? T('step.openPlace', { place: step.open.label }) : T('step.runCmd');
  if (!step.urlLabel) delete step.urlLabel;
  return step;
}
// refs : #123 cités dans les textes -> lien du work item (rendu cliquable par la page)
function itemRefs(texts, links) {
  const refs = {};
  if (!links) return refs;
  for (const t of texts) if (typeof t === 'string') for (const m of t.matchAll(/(?:^|[^\w&/])#(\d{1,7})\b/g)) refs[m[1]] = links.wi(m[1]);
  return refs;
}

module.exports = {
  T, toNative, same, inside, readText, stat, listDir, tailText, tailLines, readJson, readShConfig,
  WIN_TASKLIST, WIN_EXPLORER, refreshProcs, pidAlive, classifier, BASE_TOOLS, toolWhat, guardWhat, sigOf,
  RECENT_MS, LIVE_MS, claudeRoot, stateDir, settings, usageBand, findTranscript, transcriptInfo, readRoster, claudeAgents, attributeSubagentTools,
  httpUrl, cleanText, plain, editorUrl, stepContext, localTarget, normStep, itemRefs,
};
