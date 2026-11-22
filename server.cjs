#!/usr/bin/env node
// Tableau de bord des orchestrateurs : une page web locale (http://127.0.0.1:<port>) qui montre en temps réel ce
// que fait un orchestrateur d'agents dans un projet (carte des sessions, agents et outils, activité, journal, quotas,
// workflows, consignes en attente) et, étape par étape, ce que l'humain doit faire quand l'orchestrateur l'attend.
//
// Un seul serveur pour tous les projets : chaque projet suivi est inscrit dans le registre
// <racine Claude>/orchestrator-dashboard/projects.json (ou $ORCH_DASHBOARD_HOME) et choisi dans la page.
// Chaque orchestrateur est lu par un adaptateur (adapters/*.cjs, chargés uniquement depuis ce dossier) qui rend un
// instantané au format neutre décrit dans FORMAT.md ; l'adaptateur « json » lit n'importe quel orchestrateur qui
// écrit .orchestrator-dashboard.json à la racine de son projet. Un adaptateur peut apporter ses propres textes
// traduits (export « i18n »), servis à la page par /api/i18n.
// Interface en français et en anglais (choix dans la page).
//
// Lecture seule : rien n'est écrit dans les projets ; le registre, l'adresse du serveur et son journal sont dans
// le dossier du tableau de bord. Seule action possible depuis la page : montrer dans l'explorateur un
// dossier ou un fichier d'une étape (POST /api/open, par référence, jamais par chemin). Sans dépendance (Node 18+).
//   node server.cjs start [dossier] [port]   inscrit le projet (s'il est donné), lance le serveur en arrière-plan
//                                            s'il ne tourne pas, affiche l'URL (LANCÉ: … ou DÉJÀ EN COURS: …)
//   node server.cjs serve [port]             serveur au premier plan
//   node server.cjs stop | status
//   node server.cjs url [dossier]            adresse de la page (du projet) si le serveur tourne
//   node server.cjs add <dossier> [adaptateur] [fichier]   inscrit un projet (adaptateur deviné sinon)
//   node server.cjs remove <dossier|id>      retire un projet du registre
//   node server.cjs list | adapters
//   node server.cjs snapshot <dossier> [adaptateur]        instantané neutre en JSON (tests)
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { execFile, spawn } = require('child_process');
const L = require('./lib.cjs');
const { T } = L;

const HERE = __dirname;
const SCHEMA = 1;
const STATE_DIR = L.stateDir();
const REG = path.join(STATE_DIR, 'projects.json');
const INFO = path.join(STATE_DIR, 'server.json');
const LOG = path.join(STATE_DIR, 'server.log');
const APP = 'orchestrator-dashboard';

// ---------- adaptateurs (seulement ceux de ce dossier : jamais de code chargé depuis un projet) ----------
const ADAPTERS = [];
for (const n of L.listDir(path.join(HERE, 'adapters')).filter((x) => /^[\w-]+\.cjs$/.test(x)).sort()) {
  try {
    const a = require(path.join(HERE, 'adapters', n));
    if (a && typeof a.id === 'string' && typeof a.detect === 'function' && typeof a.snapshot === 'function') ADAPTERS.push(a);
  } catch (e) { console.error(`adaptateur ${n} ignoré : ${e.message}`); }
}
// ordre de détection : les adaptateurs propres à un orchestrateur avant le format ouvert
ADAPTERS.sort((a, b) => (a.id === 'json') - (b.id === 'json'));
// textes des adaptateurs ({ fr: { clé: 'texte' }, en: … }) : des chaînes seulement, avec {param} et {n|un|plusieurs}
const I18N = {};
for (const a of ADAPTERS) {
  for (const [lang, d] of Object.entries(a.i18n && typeof a.i18n === 'object' ? a.i18n : {})) {
    if (!/^[a-z]{2}$/.test(lang) || !d || typeof d !== 'object') continue;
    const out = I18N[lang] || (I18N[lang] = {});
    for (const [k, v] of Object.entries(d)) if (typeof v === 'string') out[k] = v;
  }
}
const adapterById = (id) => ADAPTERS.find((a) => a.id === id) || null;
function detect(dir, entry, wanted) {
  if (wanted) { const a = adapterById(wanted); return a && a.detect(dir, entry) ? a : null; }
  return ADAPTERS.find((a) => { try { return a.detect(dir, entry); } catch { return false; } }) || null;
}

// ---------- registre des projets ----------
const projectId = (dir) => crypto.createHash('sha1').update(path.resolve(dir).toLowerCase()).digest('hex').slice(0, 10);
let regCache = { mtimeMs: -1, list: [] };
function registry() {
  const st = L.stat(REG);
  const m = st ? st.mtimeMs : 0;
  if (m === regCache.mtimeMs) return regCache.list;
  const j = L.readJson(REG);
  const list = [];
  for (const p of j && Array.isArray(j.projects) ? j.projects : []) {
    if (!p || typeof p.dir !== 'string') continue;
    const dir = L.toNative(p.dir);
    const id = projectId(dir);
    if (list.some((x) => x.id === id)) continue;
    list.push({ id, dir, adapter: typeof p.adapter === 'string' ? p.adapter : '', file: typeof p.file === 'string' ? p.file : '', added: p.added || '' });
  }
  regCache = { mtimeMs: m, list };
  return list;
}
function saveRegistry(list) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const tmp = `${REG}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ projects: list.map(({ id, ...p }) => p) }, null, 2) + '\n');
  fs.renameSync(tmp, REG);
  regCache.mtimeMs = -1;
}
// register : inscrit le projet (dossier principal donné par l'adaptateur) ; renvoie l'entrée
function register(dirArg, wanted, file) {
  let dir = L.toNative(dirArg);
  const probe = { dir, file: file || '' };
  const a = detect(dir, probe, wanted);
  if (!a) return { error: wanted ? `l'adaptateur « ${wanted} » ne reconnaît pas ${dir}` : `aucun orchestrateur reconnu dans ${dir} (adaptateurs : ${ADAPTERS.map((x) => x.id).join(', ')} ; voir FORMAT.md)` };
  if (typeof a.resolve === 'function') dir = a.resolve(dir) || dir;
  const list = registry().slice();
  const id = projectId(dir);
  const i = list.findIndex((x) => x.id === id);
  const entry = { id, dir, adapter: a.id, file: file || (i >= 0 ? list[i].file : ''), added: i >= 0 ? list[i].added : new Date().toISOString() };
  if (i >= 0) list.splice(i, 1);
  list.unshift(entry); // le dernier projet lancé passe en tête (projet ouvert par défaut)
  saveRegistry(list);
  return { entry, adapter: a };
}

// ---------- instantané d'un projet ----------
function projectName(e, a) {
  try { return (a && typeof a.projectName === 'function' && a.projectName(e.dir, e)) || path.basename(e.dir); } catch { return path.basename(e.dir); }
}
function snapshotOf(e, targets) {
  const base = { schema: SCHEMA, projectId: e.id, generated: new Date().toISOString() };
  if (!L.stat(e.dir)) return { ...base, adapter: e.adapter, project: { name: path.basename(e.dir), dir: e.dir }, error: T('err.missingDir', { dir: e.dir }) };
  const a = detect(e.dir, e, e.adapter) || detect(e.dir, e);
  if (!a) return { ...base, adapter: e.adapter, project: { name: path.basename(e.dir), dir: e.dir }, error: T('err.noAdapter', { dir: e.dir }) };
  try {
    const s = a.snapshot(e.dir, { targets, entry: e });
    return { ...base, adapter: a.id, adapterName: a.name || a.id, ...s };
  } catch (err) {
    return { ...base, adapter: a.id, project: { name: projectName(e, a), dir: e.dir }, error: String(err && err.message || err) };
  }
}
function summaryOf(e, snap) {
  const tasks = snap && Array.isArray(snap.tasks) ? snap.tasks.length : 0;
  return { id: e.id, name: (snap && snap.project && snap.project.name) || projectName(e, adapterById(e.adapter)), adapter: (snap && snap.adapter) || e.adapter,
    orchestrator: (snap && (snap.orchestrator || snap.adapterName)) || e.adapter, dir: e.dir, run: snap && snap.run ? snap.run.state : snap && snap.error ? 'error' : '', tasks };
}

// ---------- ouverture d'un emplacement local (étape « action humaine ») ----------
// Seule écriture possible depuis la page : montrer un dossier ou un fichier dans l'explorateur. La page envoie le
// projet et la référence d'une étape de son dernier instantané, jamais un chemin ; une référence n'est valable que
// dans son projet ; requête refusée hors de la page elle-même (Origin), et un fichier n'est jamais exécuté ni ouvert
// par son application par défaut : il est seulement sélectionné dans l'explorateur.
function openLocal(req, res, allowedHosts, targetsOf) {
  const json = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
  const origin = String(req.headers.origin || '').toLowerCase();
  if (!origin.startsWith('http://') || !allowedHosts.has(origin.slice(7))) return json(403, { error: 'origin' });
  if (!/^application\/json\b/i.test(String(req.headers['content-type'] || ''))) return json(415, { error: 'json' });
  let body = '';
  req.setEncoding('utf8');
  req.on('data', (d) => { body += d; if (body.length > 2048) req.destroy(); });
  req.on('end', () => {
    let ref, project;
    try { const b = JSON.parse(body); ref = String(b.ref || ''); project = String(b.project || ''); } catch { return json(400, { error: 'request' }); }
    const targets = targetsOf(project);
    const t = targets && targets.get(ref);
    if (!t || !L.stat(t.path)) return json(404, { error: 'unknown' });
    let cmd, args, opts = { windowsHide: false };
    if (process.platform === 'win32') {
      cmd = 'explorer.exe';
      const p = t.path.replace(/\//g, '\\');
      args = t.dir ? [`"${p}"`] : [`/select,"${p}"`]; // un chemin Windows ne contient jamais de guillemet
      opts.windowsVerbatimArguments = true;
    } else if (process.platform === 'darwin') { cmd = 'open'; args = t.dir ? [t.path] : ['-R', t.path]; }
    else { cmd = 'xdg-open'; args = [t.dir ? t.path : path.dirname(t.path)]; }
    try {
      const c = execFile(cmd, args, opts, () => {}); // explorer.exe rend 1 même quand tout va bien
      c.on('error', () => {});
    } catch (e) { return json(500, { error: String(e && e.message || e) }); }
    json(200, { ok: true, dir: t.dir });
  });
}

// ---------- serveur ----------
function serve(port) {
  const page = path.join(HERE, 'index.html');
  const live = new Map(); // id de projet -> { clients, last, current, targets }
  const L_ = (id) => { if (!live.has(id)) live.set(id, { clients: new Set(), last: '', current: null, targets: new Map() }); return live.get(id); };
  const summaries = new Map(); // id -> résumé (sélecteur de projet)
  const allClients = new Set();
  let projSig = '';

  function pick(id) {
    const list = registry();
    return list.find((e) => e.id === id) || list[0] || null;
  }
  async function tick(force) {
    if (!allClients.size && !force) return; // personne ne regarde : rien à lire
    await L.refreshProcs();
    for (const e of registry()) {
      const p = live.get(e.id);
      if (!p || !p.clients.size) continue;
      const targets = new Map();
      const snap = snapshotOf(e, targets);
      p.targets = targets;
      const { generated, ...rest } = snap;
      const sig = JSON.stringify(rest);
      p.current = snap;
      summaries.set(e.id, summaryOf(e, snap));
      if (sig !== p.last) {
        p.last = sig;
        const msg = `event: snapshot\ndata: ${JSON.stringify(snap)}\n\n`;
        for (const res of p.clients) res.write(msg);
      }
    }
    sendProjects();
  }
  // résumé des projets que personne ne regarde : toutes les 10 s (tâches en attente dans le sélecteur)
  async function refreshSummaries() {
    if (!allClients.size) return;
    await L.refreshProcs();
    for (const e of registry()) {
      const p = live.get(e.id);
      if (p && p.clients.size) continue;
      summaries.set(e.id, summaryOf(e, snapshotOf(e, new Map())));
    }
    sendProjects();
  }
  function projectsPayload() {
    return registry().map((e) => summaries.get(e.id) || summaryOf(e, null));
  }
  function sendProjects(res) {
    const data = JSON.stringify(projectsPayload());
    if (res) { res.write(`event: projects\ndata: ${data}\n\n`); return; }
    if (data === projSig) return;
    projSig = data;
    for (const c of allClients) c.write(`event: projects\ndata: ${data}\n\n`);
  }

  const allowedHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
  const handleRequest = (req, res) => {
    // protège contre le DNS rebinding : seule l'adresse locale est servie
    if (!allowedHosts.has(String(req.headers.host || '').toLowerCase())) { res.writeHead(403); res.end('Forbidden'); return; }
    let u;
    try { u = new URL(req.url, 'http://x'); } catch { res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }); res.end('Requête invalide.'); return; }
    const url = u.pathname;
    if (req.method === 'POST' && url === '/api/open') { openLocal(req, res, allowedHosts, (id) => (live.get(id) || {}).targets); return; }
    if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
    const sec = { 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' };
    const sendJson = (o) => { res.writeHead(200, { ...sec, 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(o)); };
    if (url === '/' || url === '/index.html') {
      const html = L.readText(page);
      res.writeHead(200, { ...sec, 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'" });
      res.end(html || 'index.html missing');
    } else if (url === '/api/whoami') {
      sendJson({ app: APP, schema: SCHEMA, pid: process.pid });
    } else if (url === '/api/i18n') {
      sendJson(I18N);
    } else if (url === '/api/projects') {
      sendJson(projectsPayload());
    } else if (url === '/api/snapshot') {
      const e = pick(u.searchParams.get('p'));
      if (!e) { sendJson({ schema: SCHEMA, error: T('err.noProject') }); return; }
      const p = L_(e.id);
      if (!p.current) { p.targets = new Map(); p.current = snapshotOf(e, p.targets); }
      sendJson(p.current);
    } else if (url === '/events') {
      res.writeHead(200, { ...sec, 'Content-Type': 'text/event-stream; charset=utf-8', Connection: 'keep-alive' });
      res.write('retry: 2000\n\n');
      allClients.add(res);
      sendProjects(res);
      const e = pick(u.searchParams.get('p'));
      if (!e) { res.write(`event: snapshot\ndata: ${JSON.stringify({ schema: SCHEMA, error: T('err.noProject'), generated: new Date().toISOString() })}\n\n`); }
      else {
        const p = L_(e.id);
        p.clients.add(res);
        tick(true).then(() => { if (p.current) res.write(`event: snapshot\ndata: ${JSON.stringify(p.current)}\n\n`); });
        req.on('close', () => p.clients.delete(res));
      }
      req.on('close', () => allClients.delete(res));
    } else { res.writeHead(404, sec); res.end('Not found'); }
  };
  // filet de sécurité : une erreur imprévue dans un gestionnaire ne doit jamais arrêter le processus (détail seulement dans le journal)
  const srv = http.createServer((req, res) => {
    try { handleRequest(req, res); } catch (e) {
      console.error(`ERREUR requête : ${e && e.stack || e}`);
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end('Erreur interne.');
    }
  });
  srv.on('error', (e) => { console.error(`ERREUR: ${e.code === 'EADDRINUSE' ? `port ${port} déjà utilisé (DASHBOARD_PORT)` : e.message}`); process.exit(1); });
  srv.listen(port, '127.0.0.1', () => {
    console.log(`TABLEAU DE BORD: http://127.0.0.1:${port}/ (${registry().length} projet(s), adaptateurs : ${ADAPTERS.map((a) => a.id).join(', ')})`);
    setInterval(tick, 1000);
    setInterval(refreshSummaries, 10000);
    setInterval(() => { for (const res of allClients) res.write(': ping\n\n'); }, 15000);
  });
  const bye = () => { try { const j = L.readJson(INFO); if (j && j.pid === process.pid) fs.unlinkSync(INFO); } catch {} process.exit(0); };
  process.on('SIGINT', bye); process.on('SIGTERM', bye);
}

// ---------- cycle de vie ----------
// who <port> : identité du serveur qui répond sur ce port ou null
function who(port) {
  return new Promise((resolve) => {
    const r = http.get({ host: '127.0.0.1', port, path: '/api/whoami', headers: { host: `127.0.0.1:${port}` }, timeout: 1500 }, (res) => {
      let b = ''; res.setEncoding('utf8'); res.on('data', (d) => { b += d; });
      res.on('end', () => { try { resolve(res.statusCode === 200 ? JSON.parse(b) : null); } catch { resolve(null); } });
    });
    r.on('error', () => resolve(null)); r.on('timeout', () => { r.destroy(); resolve(null); });
  });
}
// running : le serveur noté dans server.json, seulement si c'est bien lui qui répond sur son port
// (après un redémarrage, le fichier est périmé et son pid peut appartenir à un autre programme)
async function running() {
  const j = L.readJson(INFO);
  if (!j || !j.pid || !j.port) return null;
  const w = await who(j.port);
  return w && w.app === APP && w.pid === j.pid ? j : null;
}
function portFree(port) {
  return new Promise((resolve) => {
    const s = http.createServer();
    s.once('error', () => resolve(false));
    s.listen(port, '127.0.0.1', () => s.close(() => resolve(true)));
  });
}
const pageUrl = (base, e) => (e ? `${base}?p=${e.id}` : base);
const defaultPort = () => L.settings().port;

async function main() {
  const [cmd, a1, a2, a3] = process.argv.slice(2);
  const usage = () => { console.error('usage : server.cjs start [dossier] [port] | serve [port] | stop | status | url [dossier] | add <dossier> [adaptateur] [fichier] | remove <dossier|id> | list | adapters | snapshot <dossier> [adaptateur]'); process.exit(1); };
  if (!cmd) usage();
  const isPort = (v) => /^\d{2,5}$/.test(String(v || ''));

  if (cmd === 'adapters') { for (const a of ADAPTERS) console.log(`${a.id}\t${a.name || ''}`); return; }
  if (cmd === 'list') {
    const list = registry();
    if (!list.length) console.log('(aucun projet inscrit)');
    for (const e of list) console.log(`${e.id}\t${e.adapter || '?'}\t${L.stat(e.dir) ? '' : '(dossier introuvable) '}${e.dir}`);
    return;
  }
  if (cmd === 'snapshot') {
    if (!a1) usage();
    await L.refreshProcs();
    const dir = L.toNative(a1);
    const a = detect(dir, { dir }, a2);
    if (!a) { console.error(`ERREUR: aucun orchestrateur reconnu dans ${dir}`); process.exit(1); }
    const real = (typeof a.resolve === 'function' && a.resolve(dir)) || dir;
    process.stdout.write(JSON.stringify(snapshotOf({ id: projectId(real), dir: real, adapter: a.id, file: '' }, new Map()), null, 2) + '\n');
    return;
  }
  if (cmd === 'add') {
    if (!a1) usage();
    const r = register(a1, a2, a3);
    if (r.error) { console.error(`ERREUR: ${r.error}`); process.exit(1); }
    console.log(`INSCRIT: ${r.entry.dir} (${r.adapter.id}, ${r.entry.id})`);
    return;
  }
  if (cmd === 'remove') {
    if (!a1) usage();
    const list = registry();
    const id = /^[0-9a-f]{10}$/.test(a1) ? a1 : projectId(L.toNative(a1));
    const next = list.filter((e) => e.id !== id);
    if (next.length === list.length) { console.log('ABSENT: projet non inscrit'); return; }
    saveRegistry(next);
    console.log(`RETIRÉ: ${id}`);
    return;
  }
  if (cmd === 'serve') { serve(Number(isPort(a1) ? a1 : defaultPort())); return; }
  if (cmd === 'status') {
    const j = await running();
    if (j) console.log(`EN COURS: ${j.url} (processus ${j.pid}, ${registry().length} projet(s))`); else console.log('ARRÊTÉ');
    return;
  }
  if (cmd === 'url') {
    const j = await running();
    if (!j) return;
    let e = null;
    if (a1) {
      let dir = L.toNative(a1);
      const a = detect(dir, { dir });
      if (a && typeof a.resolve === 'function') dir = a.resolve(dir) || dir;
      e = registry().find((x) => x.id === projectId(dir)) || null;
    }
    console.log(pageUrl(j.url, e));
    return;
  }
  if (cmd === 'stop') {
    const j = await running();
    if (!j) { console.log('ARRÊTÉ (aucun tableau de bord en cours)'); try { fs.unlinkSync(INFO); } catch {} return; }
    try { process.kill(j.pid); } catch {}
    try { fs.unlinkSync(INFO); } catch {}
    console.log(`ARRÊTÉ: processus ${j.pid}`);
    return;
  }
  if (cmd === 'start') {
    const dirArg = isPort(a1) && !a2 ? null : a1;
    let port = Number(isPort(a2) ? a2 : isPort(a1) && !a2 ? a1 : defaultPort());
    let entry = null;
    if (dirArg) {
      const r = register(dirArg);
      if (r.error) { console.error(`ERREUR: ${r.error}`); process.exit(1); }
      entry = r.entry;
    }
    const j = await running();
    if (j) { console.log(`DÉJÀ EN COURS: ${pageUrl(j.url, entry)}`); return; }
    // port déjà pris (autre programme, ancienne version du tableau de bord) : on prend le suivant libre
    let free = null;
    for (let p = port; p < port + 20 && free == null; p++) if (await portFree(p)) free = p;
    if (free == null) { console.error(`ERREUR: aucun port libre entre ${port} et ${port + 19} (DASHBOARD_PORT)`); process.exit(1); }
    port = free;
    fs.mkdirSync(STATE_DIR, { recursive: true });
    const log = fs.openSync(LOG, 'a');
    const child = spawn(process.execPath, [__filename, 'serve', String(port)], { detached: true, stdio: ['ignore', log, log], windowsHide: true });
    child.unref();
    const url = `http://127.0.0.1:${port}/`;
    fs.writeFileSync(INFO, JSON.stringify({ pid: child.pid, port, url, started: new Date().toISOString() }) + '\n');
    for (let i = 0; i < 25; i++) {
      const w = await who(port);
      if (w && w.app === APP && w.pid === child.pid) { console.log(`LANCÉ: ${pageUrl(url, entry)}`); return; }
      await new Promise((r) => setTimeout(r, 200));
    }
    console.error(`ERREUR: le serveur ne répond pas sur ${url} (voir ${LOG})`);
    process.exit(1);
  }
  usage();
}
if (require.main === module) main();
module.exports = { snapshotOf, register, registry, ADAPTERS, projectId };
