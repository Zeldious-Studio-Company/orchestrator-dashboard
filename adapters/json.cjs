// Adaptateur « json » : format ouvert pour n'importe quel orchestrateur. L'orchestrateur écrit (et réécrit à chaque
// changement) le fichier .orchestrator-dashboard.json à la racine de son projet ; le tableau de bord le relit, le
// contrôle et l'affiche. Format décrit dans ../FORMAT.md.
// Le fichier n'est jamais considéré comme sûr : chaque champ est vérifié et tronqué, les liens doivent être en
// http(s), les emplacements locaux des étapes doivent exister dans le dossier du projet, les couleurs sont limitées
// aux variables du thème et aux couleurs #hex.
'use strict';
const path = require('path');
const L = require('../lib.cjs');
const { T } = L;

const FILE = '.orchestrator-dashboard.json';
const classify = L.classifier(); // une seule instance : le cache des transcripts en dépend
const MAX = { sessions: 200, activity: 300, journal: 200, inbox: 100, feed: 80, tasks: 50, steps: 30, agents: 200, tools: 16, workflows: 30, alerts: 10, phases: 16, windows: 12, roster: 100 };

const str = (v, n = 300) => (v == null ? '' : typeof v === 'object' ? '' : String(v).slice(0, n));
const txt = (v, n = 2000) => L.cleanText(v, n);
const bool = (v) => v === true || v === 1 || v === 'true';
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
const arr = (v, n) => (Array.isArray(v) ? v.slice(0, n) : []);
const id = (v) => str(v, 120).replace(/[^\w.:@\-/ ]/g, '_');
const color = (v) => (typeof v === 'string' && /^(var\(--[a-z0-9-]{1,30}\)|#[0-9a-fA-F]{3,8})$/.test(v.trim()) ? v.trim() : '');
const tone = (v) => (['ok', 'warn', 'bad', 'info', 'accent', 'muted'].includes(v) ? v : '');
const time = (v) => { if (v == null || v === '') return 0; const n = Number(v); if (Number.isFinite(n)) return n < 1e12 ? n * 1000 : n; const d = Date.parse(v); return Number.isFinite(d) ? d : 0; };
// heure locale « AAAA-MM-JJ HH:MM:SS », comme les lignes d'activity.log
const localTs = (ms) => { const d = new Date(ms), z = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`; };
const STATUSES =['running', 'starting', 'waiting', 'blocked', 'paused', 'done', 'handed-off', 'idle', 'failed'];
const RUN = ['active', 'paused', 'frozen', 'idle', 'error'];
const AGENT_ST = ['running', 'done', 'failed', 'silent'];
const BASE_CATS = new Set(['files', 'read', 'agent', 'workflow', 'session', 'web', 'mcp', 'other', 'git', 'build', 'shell']);

function fileOf(dir, entry) {
  const f = entry && entry.file ? L.toNative(path.resolve(dir, entry.file)) : path.join(dir, FILE);
  return L.inside(f, dir) ? f : path.join(dir, FILE); // le fichier reste dans le dossier du projet
}

function snapshot(dir, env) {
  const f = fileOf(dir, env.entry);
  const st = L.stat(f);
  const j = L.readJson(f);
  const now = Date.now();
  if (!j || typeof j !== 'object') return { project: { name: path.basename(dir), dir }, run: { state: 'error' }, alerts: [{ tone: 'bad', title: T('json.unreadable.t'), text: T('json.unreadable', { file: f }) }], tasks: [] };

  const links = {};
  const tpl = (v) => { const u = L.httpUrl(typeof v === 'string' ? v.replace('{id}', '0') : null); return u ? v : null; };
  const lt = j.links && typeof j.links === 'object' ? j.links : {};
  const itemTpl = tpl(lt.item), prTpl = tpl(lt.pr);
  const linkOps = itemTpl || prTpl ? {
    wi: (x) => (itemTpl ? itemTpl.replace('{id}', encodeURIComponent(x)) : null),
    pr: (x) => (prTpl ? prTpl.replace('{id}', encodeURIComponent(x)) : null),
  } : null;
  // lien « ouvrir à la ligne » : réglage de l'utilisateur (L.settings), jamais pris dans le fichier du projet
  const ctx = L.stepContext(dir, [dir], env.targets, { links: linkOps });
  const fileMs = st ? Math.round(st.mtimeMs) : now;

  // outils : groupes communs, remplaçables ou complétés par ceux de l'orchestrateur
  const tools = [];
  for (const t of arr(j.tools, MAX.tools)) { const k = id(t && t.id); if (k && !tools.some((x) => x.id === k)) tools.push({ id: k, label: txt(t.label, 40) || k, desc: txt(t.desc, 80), color: color(t.color) || 'var(--accent)', icon: str(t.icon, 20) || undefined }); }
  for (const t of L.BASE_TOOLS) if (!tools.some((x) => x.id === t.id)) tools.push(t);
  const toolIds = new Set(tools.map((t) => t.id));
  const catOf = (c, tool, what) => { c = id(c); return c && (toolIds.has(c) || BASE_CATS.has(c)) ? c : classify(tool, what); };

  const sessions = arr(j.sessions, MAX.sessions).filter((s) => s && typeof s === 'object' && id(s.id)).map((s) => ({
    id: id(s.id), name: txt(s.name, 120) || id(s.id), kind: str(s.kind, 30) || 'other', kindLabel: txt(s.kindLabel, 40) || undefined,
    parent: s.parent ? id(s.parent) : null, alive: bool(s.alive), attached: s.attached == null ? true : bool(s.attached), auto: bool(s.auto), human: bool(s.human),
    status: STATUSES.includes(s.status) ? s.status : str(s.status, 30), phase: str(s.phase, 60), mode: str(s.mode, 40),
    inProgress: arr(s.inProgress, 20).map((x) => str(x, 80)), waitingFor: str(s.waitingFor, 300), blockedReason: str(s.blockedReason, 500),
    handedOffTo: str(s.handedOffTo, 120), updated: str(s.updated, 40), started: str(s.started, 40), host: str(s.host, 60), dirLabel: str(s.dirLabel, 60),
    note: str(s.note, 500), pending: bool(s.pending), launched: bool(s.launched), isMain: true, model: str(s.model, 60),
    claudeSessionId: /^[A-Za-z0-9_-]{8,80}$/.test(String(s.claudeSessionId || '')) ? s.claudeSessionId : null,
  }));
  const sessIds = new Set(sessions.map((s) => s.id));

  const activity = arr(j.activity, MAX.activity).filter((e) => e && typeof e === 'object').map((e) => {
    const t = time(e.ts ?? e.time);
    const tool = str(e.tool, 60) || 'tool', what = str(e.what, 300);
    return { ts: t ? localTs(t) : '', t, sid: '', session: sessIds.has(id(e.session)) ? id(e.session) : (e.session ? id(e.session) : null),
      tool, cat: catOf(e.category ?? e.cat, tool, what), blocked: bool(e.blocked), what, dirLabel: str(e.dirLabel, 60), agent: str(e.agent, 60) || undefined, quota: bool(e.quota) };
  }).sort((a, b) => b.t - a.t);

  // agents (sous-agents, workers…) : regroupés par session, comme les sous-agents Claude Code
  const bySess = new Map();
  for (const a of arr(j.agents, MAX.agents)) {
    if (!a || typeof a !== 'object') continue;
    const type = str(a.name ?? a.type, 60); if (!type) continue;
    const owner = a.session ? id(a.session) : 'human';
    const g = bySess.get(owner) || { session: owner, name: null, model: '', alive: false, mtime: 0, agents: [], agentTypes: Object.create(null), agentCount: 0 };
    const status = AGENT_ST.includes(a.status) ? a.status : 'running';
    const mtime = time(a.updated) || fileMs; // sans date : celle du fichier (stable d'une lecture à l'autre)
    const tl = arr(a.tools, 15).filter((u) => u && typeof u === 'object').map((u) => { const tool = str(u.tool, 60) || 'tool', what = str(u.what, 300); return { t: time(u.ts) || mtime, tool, what, cat: catOf(u.category, tool, what), refused: bool(u.blocked) }; });
    const x = { id: id(a.id) || `${owner}:${type}:${g.agents.length}`, type, description: str(a.description, 300), alias: '', model: str(a.model, 60), status, mtime, workflow: null, tools: tl, lastRefusal: tl.filter((u) => u.refused).pop() || null };
    g.agents.push(x); g.agentCount++;
    const ty = g.agentTypes[type] || (g.agentTypes[type] = { live: 0, total: 0, last: 0, models: Object.create(null) });
    ty.total++; if (status === 'running') ty.live++; ty.last = Math.max(ty.last, mtime); if (x.model) ty.models[x.model] = (ty.models[x.model] || 0) + 1;
    bySess.set(owner, g);
  }
  let agents = [...bySess.values()];
  // sessions Claude Code déclarées (claudeSessionId) : modèle et sous-agents lus dans leurs transcripts
  const sids = new Map(sessions.filter((s) => s.claudeSessionId).map((s) => [s.claudeSessionId, s.id]));
  if (sids.size) {
    try {
      const ca = L.claudeAgents([dir], sids, new Map(sessions.map((s) => [s.id, { name: s.name, alive: s.alive }])), classify);
      for (const a of ca) { delete a._tools; const g = agents.find((x) => x.session === a.session); if (g) { g.model = g.model || a.model; g.agents.push(...a.agents); Object.assign(g.agentTypes, a.agentTypes); } else agents.push(a); }
    } catch {}
  }
  for (const s of sessions) { const g = agents.find((x) => x.session === s.id); if (g) { g.alive = s.alive; g.name = s.name; g.model = g.model || s.model; } }

  const tasks = arr(j.tasks, MAX.tasks).filter((t) => t && typeof t === 'object').map((t, i) => {
    const steps = arr(t.steps, MAX.steps).map((x) => L.normStep(x, ctx)).filter(Boolean);
    const summary = txt(t.summary, 1000);
    return { id: id(t.id) || `task-${i}`, kind: str(t.kind, 30) || 'action', kindLabel: txt(t.kindLabel, 40) || undefined, tone: tone(t.tone) || undefined,
      title: txt(t.title, 200) || T('json.task'), summary, explicit: true, doneText: txt(t.doneText, 300) || undefined, session: t.session ? id(t.session) : null,
      refs: L.itemRefs([summary, ...steps.map((s) => s.text)], linkOps), steps };
  }).filter((t) => t.steps.length);

  const ph = j.phases && typeof j.phases === 'object' && Array.isArray(j.phases.list) ? j.phases : null;
  const phases = ph ? {
    list: arr(ph.list, MAX.phases).map((x) => txt(x, 40)),
    live: arr(ph.live ?? (ph.current != null ? [ph.current] : []), MAX.phases).map(num).filter((x) => x != null),
    reached: num(ph.reached ?? ph.current) ?? 0, skipped: arr(ph.skipped, MAX.phases).map(num).filter((x) => x != null),
  } : null;

  const u = j.usage && typeof j.usage === 'object' ? j.usage : null;
  const windows = u ? arr(u.windows, MAX.windows).filter((w) => w && typeof w === 'object' && num(w.percent) != null).map((w) => ({ label: txt(w.label, 60), percent: num(w.percent), resetsAt: str(w.resetsAt, 40) })) : [];
  const savedTs = u ? Math.floor((time(u.updated) || (st ? st.mtimeMs : now)) / 1000) : 0;
  let usage = windows.length ? { savedTs, source: 'orchestrator', windows, ageMin: Math.max(0, Math.round((now / 1000 - savedTs) / 60)), maxAge: num(u.maxAgeMin) ?? 30 } : null;
  if (!usage && bool(j.claudeUsage)) { const b = L.usageBand(); if (b) usage = { ...b, tip: T('usage.tip.band'), ageMin: Math.max(0, Math.round((now / 1000 - b.savedTs) / 60)), maxAge: 30 }; }

  const inboxRaw = Array.isArray(j.inbox) ? { items: j.inbox } : j.inbox && typeof j.inbox === 'object' ? j.inbox : { items: [] };
  const feedRaw = Array.isArray(j.feed) ? { items: j.feed } : j.feed && typeof j.feed === 'object' ? j.feed : { items: [] };
  const line = (x) => (typeof x === 'object' && x ? { text: txt(x.text, 1000), ts: str(x.ts, 40), dirLabel: str(x.dirLabel, 60) } : { text: str(x, 1000), ts: '', dirLabel: '' });
  const hints = {};
  if (j.hints && typeof j.hints === 'object') for (const k of ['sessions', 'activity', 'usage', 'feed', 'inbox']) if (j.hints[k]) hints[k] = txt(j.hints[k], 300);

  const run = j.run && typeof j.run === 'object' ? j.run : {};
  const active = sessions.filter((s) => s.alive).length;
  return {
    orchestrator: txt(j.orchestrator, 60),
    project: { name: txt(j.project && j.project.name, 80) || str(j.project, 80) || path.basename(dir), dir,
      badges: arr(j.project && j.project.badges, 6).map((b) => (b && typeof b === 'object' && !b.k && b.text != null ? { text: txt(b.text, 40), tone: tone(b.tone) } : { text: txt(b, 40) })).filter((b) => b.text) },
    run: { state: RUN.includes(run.state) ? run.state : active ? 'active' : 'idle', count: num(run.count) ?? active, text: txt(run.text, 80) || undefined },
    phases, sessions, activity, tools, agents,
    roster: arr(j.roster, MAX.roster).filter((r) => r && r.name).map((r) => ({ name: str(r.name, 60), description: str(r.description, 300), model: str(r.model, 60) })),
    journal: arr(j.journal, MAX.journal).map(line).filter((l) => l.text),
    inbox: { items: arr(inboxRaw.items, MAX.inbox).map(line).filter((l) => l.text), hint: txt(inboxRaw.hint, 300) || undefined, title: txt(inboxRaw.title, 60) || undefined },
    feed: { title: txt(feedRaw.title, 60) || undefined, items: arr(feedRaw.items, MAX.feed).map((x) => (typeof x === 'object' && x ? { ts: str(x.ts, 40), chip: txt(x.chip, 40), text: txt(x.text, 500) } : { text: str(x, 500) })).filter((x) => x.text) },
    usage,
    workflows: arr(j.workflows, MAX.workflows).filter((w) => w && id(w.id)).map((w) => ({ id: id(w.id), dirLabel: '', parallel: num(w.parallel), model: str(w.model, 60),
      tasks: arr(w.tasks, 50).filter((t) => t && id(t.id)).map((t) => ({ id: id(t.id), agent: str(t.agent, 60), after: arr(t.after, 20).map(id) })),
      done: bool(w.done), resultCount: num(w.resultCount) ?? 0, skipped: num(w.skipped) ?? 0, status: str(w.status, 30), alive: bool(w.alive), mtime: time(w.updated) })),
    tasks,
    alerts: arr(j.alerts, MAX.alerts).filter((a) => a && typeof a === 'object').map((a) => ({ tone: tone(a.tone) || 'info', title: txt(a.title, 60), text: txt(a.text, 500) })),
    hasActivity: activity.length > 0 || Array.isArray(j.activity),
    hints,
    updatedAt: st ? Math.round(st.mtimeMs) : 0,
  };
}

module.exports = {
  id: 'json',
  name: 'JSON (.orchestrator-dashboard.json)',
  resolve(dir) { return dir; },
  detect(dir, entry) { return !!L.stat(fileOf(dir, entry)); },
  projectName(dir, entry) { const j = L.readJson(fileOf(dir, entry)); return (j && (L.plain(j.project && j.project.name) || (typeof j.project === 'string' && j.project))) || path.basename(dir); },
  snapshot,
};
