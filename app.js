'use strict';
// --- langue : dictionnaire FR / EN (textes de la page et textes produits par le serveur sous forme { k, p }) ---
// Une entrée est une chaîne avec des {paramètres}, ou une fonction (p) => chaîne pour les pluriels et les cas.
const s_ = (n) => (n > 1 ? 's' : '');
const DICT = {
  fr: {
    'app': 'Orchestrateur', 'doc.title': '{project} · orchestrateur', 'project': 'Projet', 'lang.switch': 'English',
    'conn.wait': 'connexion…', 'conn.live': 'en direct', 'conn.lost': 'déconnecté — reconnexion…', 'updated': 'dernier changement {ago}',
    'footer.ro': 'Lecture seule (sauf « Ouvrir le dossier » / « Afficher dans l\'explorateur » des étapes, la relance confirmée d\'une session bloquée et l\'envoi confirmé d\'un message à une session) · données de', 'footer.rt': 'rafraîchi en temps réel',
    'proj.todo': (p) => `${p.n} à faire`, 'proj.missing': 'dossier introuvable', 'proj.others': 'Actions humaines en attente dans les autres projets',
    'run.frozen': 'GEL d\'urgence', 'run.paused': 'en pause', 'run.idle': 'au repos', 'run.error': 'erreur', 'run.active': (p) => `actif · ${p.n} session${s_(p.n)}`,
    'err.read': 'Erreur de lecture', 'err.missingDir': 'Dossier du projet introuvable : {dir}', 'err.noAdapter': 'Aucun orchestrateur reconnu dans {dir}.',
    'err.noProject': 'Aucun projet inscrit. Lance « node server.cjs start <dossier du projet> » (voir FORMAT.md).',
    'json.unreadable.t': 'Fichier illisible', 'json.unreadable': 'Le fichier {file} est absent ou n\'est pas du JSON valide.', 'json.task': 'Action',
    'blk.noNode': 'sans nœud', 'blk.here': 'à faire ici', 'blk.unknown': 'rattachée à « {id} », introuvable', 'blk.hidden': 'rattachée à « {id} », non affichée sur la carte',
    'hkind.freeze': 'Gel', 'hkind.pause': 'Pause', 'hkind.blocked': 'Bloquée', 'hkind.item': 'Action humaine', 'hkind.pr': 'À valider', 'hkind.pending': 'À reprendre', 'hkind.action': 'Action',
    'human.opened.dir': 'Dossier ouvert dans l\'explorateur.', 'human.opened.file': 'Fichier sélectionné dans l\'explorateur.', 'human.openFail': 'Impossible d\'ouvrir : {err}',
    'human.unreachable': 'Tableau de bord injoignable : ouverture impossible.', 'human.copied': 'Copié : {cmd} — colle-le à l\'endroit indiqué ci-dessus.', 'human.copyFail': 'Copie impossible : sélectionne « {cmd} » à la main.',
    'where.title': 'Où faire cette étape', 'where.folder': '📁 Dossier sur ton ordinateur', 'where.file': '📄 Fichier sur ton ordinateur', 'where.line': ' (ligne {n})',
    'where.editor': 'Ouvrir dans l\'éditeur', 'where.editorLine': 'Ouvrir dans l\'éditeur à la ligne {n}', 'where.cmd': '⌨ Où taper la commande', 'where.where': '📍 Où',
    'where.missing': '⚠ Emplacement', 'where.missingText': 'introuvable ou hors du projet : {p}',
    'where.claudeCode': 'Claude Code : zone de message d\'une session ouverte sur le projet', 'where.terminal': 'Terminal (Git Bash sous Windows), dans le dossier du projet : {dir}',
    'where.journalBelow': 'Tableau de bord : section « Journal » plus bas sur cette page',
    'act.open': 'Ouvrir {tool}', 'act.openFolder': 'Ouvrir le dossier', 'act.reveal': 'Afficher dans l\'explorateur', 'act.copy': 'copier', 'act.copyTitle': 'Copier la commande', 'link': 'lien',
    'step.openLink': 'Ouvre ce lien.', 'step.openPlace': 'Ouvre {place}.', 'step.runCmd': 'Lance cette commande.',
    'human.nothing': 'Plus rien à faire pour l\'instant. Une nouvelle action apparaîtra ici dès que l\'orchestrateur aura besoin de toi.',
    'human.taskOf': 'Tâche {i} / {n} · ', 'human.stepOf': 'étape {i} / {n}', 'human.step': 'Étape {i}', 'human.prev': '← Étape précédente', 'human.done': 'Terminé ✓', 'human.next': 'Terminé ✓ · étape suivante →',
    'human.finished': '✓ « {title} » terminée.', 'human.then': 'Ensuite :', 'human.doneHere': 'Faites ici :', 'human.doNow': 'Traiter cette tâche maintenant', 'human.review': 'Revoir ses étapes',
    'status.running': 'en cours', 'status.starting': 'démarrage', 'status.waiting': 'en attente', 'status.blocked': 'bloquée', 'status.paused': 'en pause', 'status.done': 'terminée',
    'status.handed-off': 'passée à la suite', 'status.idle': 'inactive', 'status.failed': 'échec', 'status.unknown': 'inconnu',
    'kind.phase': 'phase', 'kind.item': 'work item', 'kind.annex': 'annexe', 'kind.workflow': 'workflow', 'kind.other': 'session', 'kind.human': 'session humaine',
    'sess.phase': 'phase ', 'sess.waits': 'attend : ',
    'q.title': 'Quotas', 'q.now': 'relevé à l\'instant', 'q.ago': 'relevé il y a {n} min', 'q.old': ' (ancien)', 'q.reset': ' · remise à zéro {d}', 'q.empty': 'Aucun relevé de quotas.',
    'usage.fiveHour': 'Fenêtre de 5 h', 'usage.sevenDay': 'Semaine (tous modèles)', 'usage.model': 'Semaine {m}', 'usage.tip.band': 'Relevé du mod usage-band de Claude Code (mis à jour toutes les 1 à 3 min tant qu\'une session est ouverte)',
    'j.title': 'Journal', 'j.count': '{n} dernières lignes', 'j.empty': 'Journal vide.',
    'inbox.empty': 'Aucune consigne en attente.',
    'feed.title': 'Événements', 'feed.empty': 'Rien pour l\'instant.',
    'ago.at': 'à {t}', 'ago.s': 'il y a {n} s', 'ago.m': 'il y a {n} min', 'ago.h': 'il y a {h} h {m}', 'short.s': '{n} s', 'short.m': '{n} min', 'short.h': '{h} h {m}',
    'msg.btn': 'Écrire à la session', 'msg.tip': 'Envoie un message à cette session avec « claude --resume », après ta confirmation.', 'msg.label': 'Ton message (texte seul, 4000 caractères au plus ; 8 Ko au maximum)',
    'msg.check': 'Vérifier le message', 'msg.title': 'Envoyer ce message à la session ?', 'msg.send': 'Envoyer le message', 'msg.cancel': 'Annuler', 'msg.len': 'Longueur : {n} caractères',
    'msg.byAgent': 'Le message sera précédé de : « Pour l\'agent {a} : ».', 'msg.byWorkflow': 'Le message sera précédé de : « Pour le workflow {w} : ».',
    'msg.note': 'Le texte part par l\'entrée standard, sans shell, et n\'est pas journalisé. Les demandes d\'approbation sont refusées. Les hooks et serveurs MCP du projet s\'exécutent (pas de --bare). Rien n\'est envoyé sans cette confirmation.',
    'msg.sent': 'Message envoyé à la session. Sa réponse n\'est pas affichée ici.', 'msg.empty': 'Écris un message avant de le vérifier.', 'msg.tooLong': 'Message trop long : 4000 caractères au plus, et 8 Ko au maximum en octets (environ 2700 caractères chinois, japonais ou emoji).',
    'msg.err': 'Envoi refusé (erreur {code}).', 'msg.reason.alive': 'Session encore ouverte : on n\'écrit pas dans une session ouverte.',
    'relaunch.btn': 'Relancer la session', 'relaunch.tip': 'Reprend cette session avec « claude --resume », après ta confirmation.', 'relaunch.title': 'Relancer cette session ?',
    'relaunch.confirm': 'Confirmer la relance', 'relaunch.cancel': 'Annuler', 'relaunch.project': 'Projet', 'relaunch.session': 'Session', 'relaunch.dir': 'Dossier', 'relaunch.cmd': 'Commande',
    'relaunch.note': 'Le message de reprise est fixe et passe par l\'entrée standard. Les demandes d\'approbation sont refusées. Rien n\'est lancé sans cette confirmation.',
    'relaunch.started': 'Relance demandée : son état s\'affiche ci-dessous.', 'relaunch.err': 'Relance refusée (erreur {code}).',
    'relaunch.state.running': 'Lancé, en cours', 'relaunch.state.done': 'Terminé (code 0)', 'relaunch.state.failed': 'Échec : {why}',
    'relaunch.why.exit': 'code {code}', 'relaunch.why.signal': 'interrompu', 'relaunch.why.timeout': 'délai de 10 min dépassé', 'relaunch.why.spawn': 'lancement impossible',
    'relaunch.reason.noSession': 'Aucun identifiant de session Claude Code connu pour ce nœud.', 'relaunch.reason.alive': 'Session encore ouverte : rien n\'est lancé dessus.',
    'relaunch.reason.humanOwner': 'Sous-agent ouvert par toi : aucune session Claude Code rattachée.', 'relaunch.reason.ambiguous': 'Ce type d\'agent tourne dans plusieurs sessions : passe par le nœud de la session.',
    'relaunch.reason.unknownOwner': 'Session propriétaire introuvable.', 'relaunch.reason.tool': 'Un outil n\'est pas une session Claude Code.', 'relaunch.reason.you': '« Toi » n\'est pas une session Claude Code.',
    'relaunch.reason.events': '« Événements » n\'est pas une session Claude Code.', 'relaunch.reason.quota': 'Les quotas ne sont pas une session Claude Code.', 'relaunch.reason.unknown': 'Nœud inconnu : aucune session Claude Code.',
    'relaunch.reason.recent': 'Transcrit modifié il y a moins d\'une minute : la session est peut-être utilisée ailleurs.', 'relaunch.reason.running': 'Une exécution est déjà en cours pour cette session.',
    'relaunch.reason.cmd': 'claude est un script .cmd, refusé (aucun shell). Indique le fichier .exe avec claudePath dans config.json.', 'relaunch.reason.missing': 'Binaire claude introuvable. Réglage : claudePath dans config.json, ou ORCH_DASHBOARD_CLAUDE.',
    'map.title': 'Carte en direct', 'map.reset': 'Disposition automatique', 'map.resetTip': 'Remet chaque bulle à sa place d\'origine', 'map.aria': 'Carte en direct de l\'orchestrateur',
    'map.count': (p) => `${p.s} session${s_(p.s)} active${s_(p.s)} · ${p.a} sous-agent${s_(p.a)} en cours${p.l ? ` · ${p.l} lien${s_(p.l)} actif${s_(p.l)}` : ''}`,
    'lg.run': 'travaille', 'lg.wait': 'en attente / en pause', 'lg.silent': 'silencieux (rien depuis 15 min)', 'lg.bad': 'bloqué, échec ou outil refusé', 'lg.idle': 'au repos',
    'lg.packet': 'paquet = un échange réel qui part de l\'émetteur vers le destinataire (commande, appel d\'outil, lancement d\'agent, rapport rendu… ; rouge = refusé)',
    'lg.rest': '· tirets qui avancent = sens du flux en cours · texte coloré dans la bulle = modèle · auto = agent ou session créé automatiquement · clic sur une bulle = détail · glisser une bulle (ou flèches du clavier) = la déplacer, sa place est retenue',
    'col.in': 'Entrées', 'col.sess': 'Sessions', 'col.agents': 'Agents', 'col.tools': 'Outils', 'map.drag': '(glisser pour déplacer)',
    'm.blocked': 'bloquée', 'm.refused': 'outil refusé', 'm.waiting': 'en attente', 'm.paused': 'en pause', 'm.starting': 'démarrage', 'm.running': 'en cours', 'm.done': 'terminée', 'm.passed': 'passée', 'm.stopped': 'arrêtée',
    'm.nRunning': '{n} en cours', 'm.failed': 'échec', 'm.silent': 'silencieux', 'm.finished': 'fini {ago}', 'm.idle': 'au repos', 'm.inherited': 'hérité',
    'm.instances': '{n} instances', 'm.launches': (p) => `${p.n} lancement${s_(p.n)} en 6 h`, 'm.installed': 'agent installé', 'm.auto': ' (créé automatiquement)', 'm.model': 'modèle : ',
    'm.moreS': 'Autres sessions', 'm.sessions': 'sessions', 'm.moreA': 'Autres agents', 'm.agents': 'agents', 'm.nInst': ' · {n} instance(s)',
    'm.nRefused': (p) => `${p.n} refusé${s_(p.n)}`, 'm.perMin': '{n}/min', 'm.in10': 'en 10 min', 'm.calm': 'calme',
    'm.toolTip': (p) => `${p.n} action${s_(p.n)} en 10 min${p.r ? ` · ${p.r} dans la dernière minute` : ''}`,
    'm.you': 'Toi', 'm.youSub': 'consignes, validations', 'm.nActions': (p) => `${p.n} action${s_(p.n)}`, 'm.nInbox': (p) => `${p.n} consigne${s_(p.n)}`, 'm.todo': 'à faire', 'm.inbox': 'consignes', 'm.nothing': 'rien à faire',
    'm.youTip': 'Consignes non lues : {i}\nActions à faire : {t}',
    'm.quota': 'Quotas', 'm.quotaSub': 'fenêtre la plus utilisée', 'm.agoMin': 'il y a {n} min', 'm.noQuota': 'pas de relevé',
    'm.feedSub': 'événements', 'm.launch': 'lance {x}', 'm.start': 'démarre {x}', 'm.report': 'rapport', 'm.quotas': 'quotas',
    'd.close': 'Fermer ✕', 'd.dialog': 'Détail de {n}', 'd.installed': 'agent installé', 'd.auto': 'créé automatiquement', 'd.fixed': 'modèle fixé : {m}', 'd.inherit': 'modèle hérité de la session qui le lance',
    'd.state': 'État', 'd.model': 'Modèle', 'd.task': 'Tâche', 'd.by': 'Lancé par', 'd.lastTool': 'Dernier outil', 'd.activity': 'Activité', 'd.unknown': 'inconnu', 'd.asked': 'demandé : {a}',
    'd.refused': '⛔ outil refusé : ', 'd.refusedShort': ' ⛔ refusé', 'd.noInst': 'Aucune instance dans les 30 dernières minutes ({n} en 6 h).', 'd.notRun': 'Pas lancé ces 6 dernières heures.',
    'd.phase': 'Phase {p}', 'd.mode': 'mode {m}', 'd.inprog': 'en cours : {x}', 'd.waits': 'attend : {x}', 'd.blocked': 'bloquée : {x}', 'd.subs': '{n} sous-agent(s) en 6 h',
    'd.time': 'Heure', 'd.who': 'Qui', 'd.tool': 'Outil', 'd.call': 'Appel', 'd.theSession': 'la session', 'd.noTools': 'Aucun outil noté pour cette session.',
    'd.nActions': (p) => `${p.n} action${s_(p.n)} en 10 min`, 'd.nothing10': 'Rien dans les 10 dernières minutes.', 'd.tasks': 'Actions à faire :',
    'st.running': 'en cours', 'st.done': 'fini', 'st.failed': 'échec', 'st.silent': 'silencieux', 'session.human': 'Session ouverte par toi', 'session.humanIn': 'Session ouverte par toi · {dir}',
    'tool.git': 'Git', 'tool.git.d': 'commits, push', 'tool.files': 'Fichiers', 'tool.files.d': 'lecture, écriture', 'tool.build': 'Build et tests', 'tool.build.d': 'dotnet, npm, pytest…',
    'tool.web': 'Web', 'tool.web.d': 'recherche, navigateur', 'tool.shell': 'Autres outils', 'tool.shell.d': 'shell, MCP…',
  },
  en: {
    'app': 'Orchestrator', 'doc.title': '{project} · orchestrator', 'project': 'Project', 'lang.switch': 'Français',
    'conn.wait': 'connecting…', 'conn.live': 'live', 'conn.lost': 'disconnected — reconnecting…', 'updated': 'last change {ago}',
    'footer.ro': 'Read-only (except the steps\' "Open folder" / "Show in file explorer", the confirmed relaunch of a blocked session, and the confirmed message sent to a session) · data from', 'footer.rt': 'updated in real time',
    'proj.todo': (p) => `${p.n} to do`, 'proj.missing': 'folder not found', 'proj.others': 'Human actions waiting in the other projects',
    'run.frozen': 'EMERGENCY FREEZE', 'run.paused': 'paused', 'run.idle': 'idle', 'run.error': 'error', 'run.active': (p) => `active · ${p.n} session${s_(p.n)}`,
    'err.read': 'Read error', 'err.missingDir': 'Project folder not found: {dir}', 'err.noAdapter': 'No known orchestrator in {dir}.',
    'err.noProject': 'No project registered. Run "node server.cjs start <project folder>" (see FORMAT.md).',
    'json.unreadable.t': 'Unreadable file', 'json.unreadable': 'The file {file} is missing or is not valid JSON.', 'json.task': 'Action',
    'blk.noNode': 'no node', 'blk.here': 'to do here', 'blk.unknown': 'attached to "{id}", not found', 'blk.hidden': 'attached to "{id}", not shown on the map',
    'hkind.freeze': 'Freeze', 'hkind.pause': 'Pause', 'hkind.blocked': 'Blocked', 'hkind.item': 'Human action', 'hkind.pr': 'To review', 'hkind.pending': 'To resume', 'hkind.action': 'Action',
    'human.opened.dir': 'Folder opened in the file explorer.', 'human.opened.file': 'File selected in the file explorer.', 'human.openFail': 'Could not open: {err}',
    'human.unreachable': 'Dashboard unreachable: cannot open.', 'human.copied': 'Copied: {cmd} — paste it where shown above.', 'human.copyFail': 'Could not copy: select "{cmd}" by hand.',
    'where.title': 'Where to do this step', 'where.folder': '📁 Folder on your computer', 'where.file': '📄 File on your computer', 'where.line': ' (line {n})',
    'where.editor': 'Open in the editor', 'where.editorLine': 'Open in the editor at line {n}', 'where.cmd': '⌨ Where to type the command', 'where.where': '📍 Where',
    'where.missing': '⚠ Location', 'where.missingText': 'not found or outside the project: {p}',
    'where.claudeCode': 'Claude Code: message box of a session open on the project', 'where.terminal': 'Terminal (Git Bash on Windows), in the project folder: {dir}',
    'where.journalBelow': 'Dashboard: "Log" section further down this page',
    'act.open': 'Open {tool}', 'act.openFolder': 'Open folder', 'act.reveal': 'Show in file explorer', 'act.copy': 'copy', 'act.copyTitle': 'Copy the command', 'link': 'link',
    'step.openLink': 'Open this link.', 'step.openPlace': 'Open {place}.', 'step.runCmd': 'Run this command.',
    'human.nothing': 'Nothing left to do for now. A new action will show up here as soon as the orchestrator needs you.',
    'human.taskOf': 'Task {i} / {n} · ', 'human.stepOf': 'step {i} / {n}', 'human.step': 'Step {i}', 'human.prev': '← Previous step', 'human.done': 'Done ✓', 'human.next': 'Done ✓ · next step →',
    'human.finished': '✓ "{title}" done.', 'human.then': 'Next:', 'human.doneHere': 'Done here:', 'human.doNow': 'Handle this task now', 'human.review': 'Review its steps',
    'status.running': 'running', 'status.starting': 'starting', 'status.waiting': 'waiting', 'status.blocked': 'blocked', 'status.paused': 'paused', 'status.done': 'done',
    'status.handed-off': 'handed off', 'status.idle': 'idle', 'status.failed': 'failed', 'status.unknown': 'unknown',
    'kind.phase': 'phase', 'kind.item': 'work item', 'kind.annex': 'side task', 'kind.workflow': 'workflow', 'kind.other': 'session', 'kind.human': 'your session',
    'sess.phase': 'phase ', 'sess.waits': 'waiting for: ',
    'q.title': 'Usage', 'q.now': 'read just now', 'q.ago': 'read {n} min ago', 'q.old': ' (old)', 'q.reset': ' · resets {d}', 'q.empty': 'No usage reading.',
    'usage.fiveHour': '5-hour window', 'usage.sevenDay': 'Week (all models)', 'usage.model': 'Week {m}', 'usage.tip.band': 'Reading from the Claude Code usage-band mod (refreshed every 1 to 3 min while a session is open)',
    'j.title': 'Log', 'j.count': 'last {n} lines', 'j.empty': 'Empty log.',
    'inbox.empty': 'No pending instructions.',
    'feed.title': 'Events', 'feed.empty': 'Nothing yet.',
    'ago.at': 'at {t}', 'ago.s': '{n} s ago', 'ago.m': '{n} min ago', 'ago.h': '{h} h {m} ago', 'short.s': '{n} s', 'short.m': '{n} min', 'short.h': '{h} h {m}',
    'msg.btn': 'Write to the session', 'msg.tip': 'Sends a message to this session with "claude --resume", after your confirmation.', 'msg.label': 'Your message (plain text, 4000 characters at most; 8 KB at most)',
    'msg.check': 'Review the message', 'msg.title': 'Send this message to the session?', 'msg.send': 'Send the message', 'msg.cancel': 'Cancel', 'msg.len': 'Length: {n} characters',
    'msg.byAgent': 'The message will be prefixed with: "For the agent {a}: ".', 'msg.byWorkflow': 'The message will be prefixed with: "For the workflow {w}: ".',
    'msg.note': 'The text goes through standard input, without a shell, and is not logged. Approval requests are refused. The project\'s hooks and MCP servers run (no --bare). Nothing is sent without this confirmation.',
    'msg.sent': 'Message sent to the session. Its reply is not shown here.', 'msg.empty': 'Write a message before reviewing it.', 'msg.tooLong': 'Message too long: 4000 characters at most, and 8 KB at most in bytes (about 2700 CJK characters or emoji).',
    'msg.err': 'Sending refused (error {code}).', 'msg.reason.alive': 'Session still open: you cannot write to an open session.',
    'relaunch.btn': 'Relaunch the session', 'relaunch.tip': 'Resumes this session with "claude --resume", after your confirmation.', 'relaunch.title': 'Relaunch this session?',
    'relaunch.confirm': 'Confirm relaunch', 'relaunch.cancel': 'Cancel', 'relaunch.project': 'Project', 'relaunch.session': 'Session', 'relaunch.dir': 'Folder', 'relaunch.cmd': 'Command',
    'relaunch.note': 'The resume message is fixed and goes through standard input. Approval requests are refused. Nothing starts without this confirmation.',
    'relaunch.started': 'Relaunch requested: its status shows below.', 'relaunch.err': 'Relaunch refused (error {code}).',
    'relaunch.state.running': 'Started, running', 'relaunch.state.done': 'Finished (exit code 0)', 'relaunch.state.failed': 'Failed: {why}',
    'relaunch.why.exit': 'exit code {code}', 'relaunch.why.signal': 'interrupted', 'relaunch.why.timeout': 'timed out after 10 min', 'relaunch.why.spawn': 'could not start',
    'relaunch.reason.noSession': 'No known Claude Code session id for this node.', 'relaunch.reason.alive': 'Session still open: nothing is run on it.',
    'relaunch.reason.humanOwner': 'Sub-agent opened by you: no Claude Code session attached.', 'relaunch.reason.ambiguous': 'This agent type runs in several sessions: use the session node.',
    'relaunch.reason.unknownOwner': 'Owning session not found.', 'relaunch.reason.tool': 'A tool is not a Claude Code session.', 'relaunch.reason.you': '"You" is not a Claude Code session.',
    'relaunch.reason.events': '"Events" is not a Claude Code session.', 'relaunch.reason.quota': 'Quotas are not a Claude Code session.', 'relaunch.reason.unknown': 'Unknown node: no Claude Code session.',
    'relaunch.reason.recent': 'Transcript changed less than a minute ago: the session may be in use elsewhere.', 'relaunch.reason.running': 'A run is already in progress for this session.',
    'relaunch.reason.cmd': 'claude is a .cmd script, refused (no shell). Give the .exe file with claudePath in config.json.', 'relaunch.reason.missing': 'claude binary not found. Setting: claudePath in config.json, or ORCH_DASHBOARD_CLAUDE.',
    'map.title': 'Live map', 'map.reset': 'Auto layout', 'map.resetTip': 'Put every bubble back in its original place', 'map.aria': 'Live map of the orchestrator',
    'map.count': (p) => `${p.s} active session${s_(p.s)} · ${p.a} sub-agent${s_(p.a)} running${p.l ? ` · ${p.l} active link${s_(p.l)}` : ''}`,
    'lg.run': 'working', 'lg.wait': 'waiting / paused', 'lg.silent': 'silent (nothing for 15 min)', 'lg.bad': 'blocked, failed or tool refused', 'lg.idle': 'idle',
    'lg.packet': 'packet = a real exchange going from sender to receiver (command, tool call, agent start, report… ; red = refused)',
    'lg.rest': '· moving dashes = direction of the current flow · coloured text in a bubble = model · auto = agent or session created automatically · click a bubble = details · drag a bubble (or arrow keys) = move it, its place is remembered',
    'col.in': 'Inputs', 'col.sess': 'Sessions', 'col.agents': 'Agents', 'col.tools': 'Tools', 'map.drag': '(drag to move)',
    'm.blocked': 'blocked', 'm.refused': 'tool refused', 'm.waiting': 'waiting', 'm.paused': 'paused', 'm.starting': 'starting', 'm.running': 'running', 'm.done': 'done', 'm.passed': 'handed off', 'm.stopped': 'stopped',
    'm.nRunning': '{n} running', 'm.failed': 'failed', 'm.silent': 'silent', 'm.finished': 'done {ago} ago', 'm.idle': 'idle', 'm.inherited': 'inherited',
    'm.instances': '{n} instances', 'm.launches': (p) => `${p.n} run${s_(p.n)} in 6 h`, 'm.installed': 'installed agent', 'm.auto': ' (created automatically)', 'm.model': 'model: ',
    'm.moreS': 'Other sessions', 'm.sessions': 'sessions', 'm.moreA': 'Other agents', 'm.agents': 'agents', 'm.nInst': ' · {n} instance(s)',
    'm.nRefused': (p) => `${p.n} refused`, 'm.perMin': '{n}/min', 'm.in10': 'in 10 min', 'm.calm': 'quiet',
    'm.toolTip': (p) => `${p.n} action${s_(p.n)} in 10 min${p.r ? ` · ${p.r} in the last minute` : ''}`,
    'm.you': 'You', 'm.youSub': 'instructions, approvals', 'm.nActions': (p) => `${p.n} action${s_(p.n)}`, 'm.nInbox': (p) => `${p.n} instruction${s_(p.n)}`, 'm.todo': 'to do', 'm.inbox': 'instructions', 'm.nothing': 'nothing to do',
    'm.youTip': 'Unread instructions: {i}\nActions to do: {t}',
    'm.quota': 'Usage', 'm.quotaSub': 'most used window', 'm.agoMin': '{n} min ago', 'm.noQuota': 'no reading',
    'm.feedSub': 'events', 'm.launch': 'starts {x}', 'm.start': 'starting {x}', 'm.report': 'report', 'm.quotas': 'usage',
    'd.close': 'Close ✕', 'd.dialog': 'Details of {n}', 'd.installed': 'installed agent', 'd.auto': 'created automatically', 'd.fixed': 'fixed model: {m}', 'd.inherit': 'model inherited from the session that starts it',
    'd.state': 'State', 'd.model': 'Model', 'd.task': 'Task', 'd.by': 'Started by', 'd.lastTool': 'Last tool', 'd.activity': 'Activity', 'd.unknown': 'unknown', 'd.asked': 'requested: {a}',
    'd.refused': '⛔ tool refused: ', 'd.refusedShort': ' ⛔ refused', 'd.noInst': 'No instance in the last 30 minutes ({n} in 6 h).', 'd.notRun': 'Not run in the last 6 hours.',
    'd.phase': 'Phase {p}', 'd.mode': 'mode {m}', 'd.inprog': 'in progress: {x}', 'd.waits': 'waiting for: {x}', 'd.blocked': 'blocked: {x}', 'd.subs': '{n} sub-agent(s) in 6 h',
    'd.time': 'Time', 'd.who': 'Who', 'd.tool': 'Tool', 'd.call': 'Call', 'd.theSession': 'the session', 'd.noTools': 'No tool recorded for this session.',
    'd.nActions': (p) => `${p.n} action${s_(p.n)} in 10 min`, 'd.nothing10': 'Nothing in the last 10 minutes.', 'd.tasks': 'Actions to do:',
    'st.running': 'running', 'st.done': 'done', 'st.failed': 'failed', 'st.silent': 'silent', 'session.human': 'Session you opened', 'session.humanIn': 'Session you opened · {dir}',
    'tool.git': 'Git', 'tool.git.d': 'commits, push', 'tool.files': 'Files', 'tool.files.d': 'read, write', 'tool.build': 'Build & tests', 'tool.build.d': 'dotnet, npm, pytest…',
    'tool.web': 'Web', 'tool.web.d': 'search, browser', 'tool.shell': 'Other tools', 'tool.shell.d': 'shell, MCP…',
  },
};
const LANGS = Object.keys(DICT);
const LOCALE = { fr: 'fr-FR', en: 'en-GB' };
let lang = (() => {
  try { const l = localStorage.getItem('orch-lang'); if (LANGS.includes(l)) return l; } catch {}
  const n = String(navigator.language || 'en').slice(0, 2).toLowerCase();
  return LANGS.includes(n) ? n : 'en';
})();
const loc = () => LOCALE[lang] || undefined;
// t(clé, paramètres) : texte de la page ; tr(texte) : texte du serveur (chaîne, { k, p } ou { fr, en, … })
function t(k, p) {
  const own = (d) => (Object.hasOwn(d, k) ? d[k] : undefined); // clé venue d'un fichier : jamais __proto__ & co
  const e = own(DICT[lang]) ?? own(DICT.en) ?? own(DICT.fr);
  if (e == null) return k;
  const q = {};
  for (const [n, v] of Object.entries(p || {})) q[n] = v != null && typeof v === 'object' ? tr(v) : v;
  if (typeof e === 'function') return e(q);
  // {n|un|plusieurs} : pluriel selon n, puis {param}
  return String(e).replace(/\{(\w+)\|([^|{}]*)\|([^{}]*)\}/g, (m, n, a, b) => (Number(q[n]) > 1 ? b : a))
    .replace(/\{(\w+)\}/g, (m, n) => (q[n] != null ? String(q[n]) : m));
}
function tr(x) {
  if (x == null) return '';
  if (typeof x !== 'object') return String(x);
  if (typeof x.k === 'string') return t(x.k, x.p);
  if (typeof x[lang] === 'string') return x[lang];
  for (const l of [...LANGS, ...Object.keys(x)]) if (typeof x[l] === 'string') return x[l];
  return '';
}

// Rendu uniquement par textContent / createElement : les textes viennent des sessions et des orchestrateurs.
const $ = (id) => document.getElementById(id);
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
const fill = (el, ...kids) => { el.replaceChildren(...kids.flat().filter((k) => k != null && k !== false)); };

const STATUS_TONE = { running: 'ok', starting: 'accent', waiting: 'warn', blocked: 'bad', paused: 'warn', done: 'muted', 'handed-off': 'muted', idle: 'muted', failed: 'bad' };
const statusTxt = (st) => (Object.hasOwn(STATUS_TONE, st || '') ? t(`status.${st}`) : st || t('status.unknown'));
const statusBadge = (st) => h('span', { class: `badge ${STATUS_TONE[st] || 'muted'}` }, statusTxt(st));
const kindTxt = (s) => (s.kindLabel ? tr(s.kindLabel) : Object.hasOwn(DICT.en, `kind.${s.kind}`) ? t(`kind.${s.kind}`) : s.kind || t('kind.other'));
function parseTs(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?!.*(Z|[+-]\d{2}:?\d{2})$)/);
  if (m) return new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  const d = new Date(s); return isNaN(d) ? null : d;
}
function ago(d, short) {
  if (!d) return '';
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  const p = short ? 'short' : 'ago';
  if (s < 0) return t('ago.at', { t: d.toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit' }) });
  if (s < 60) return t(`${p}.s`, { n: s });
  if (s < 3600) return t(`${p}.m`, { n: Math.floor(s / 60) });
  if (s < 86400) return t(`${p}.h`, { h: Math.floor(s / 3600), m: String(Math.floor(s % 3600 / 60)).padStart(2, '0') });
  return d.toLocaleString(loc(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
const hhmmss = (s) => { const m = String(s).match(/(\d{2}:\d{2}:\d{2})/); return m ? m[1] : s; };
const sessName = (id) => { const s = (snap.sessions || []).find((x) => x.id === id); return s ? tr(s.name) : id || ''; };

// état de la vue (remis à zéro à chaque changement de projet)
let snap = null;
let projects = [], projectId = new URLSearchParams(location.search).get('p') || '';
let lastTasks = [];

function render() {
  if (!snap) return;
  document.documentElement.lang = lang;
  // erreur de lecture : erreur de l'instantané, ou fichier illisible (run.state « error » et alertes « bad » de l'adaptateur)
  if (snap.error || (snap.run && snap.run.state === 'error')) {
    const name = snap.project ? tr(snap.project.name) : '';
    $('title').textContent = name ? `${t('app')} · ${name}` : t('app');
    const errs = snap.error ? [tr(snap.error)] : (snap.alerts || []).filter((a) => a && a.tone === 'bad').map((a) => [tr(a.title), tr(a.text)].filter(Boolean).join(' · '));
    fill($('alerts'), errs.map((e) => h('div', { class: 'alert bad' }, h('b', null, t('err.read')), e)));
    $('run').className = 'badge bad'; fill($('run'), h('span', { class: 'dot' }), t('run.error'));
    return;
  }
  const name = tr(snap.project.name);
  document.title = t('doc.title', { project: name });
  $('title').textContent = `${t('app')} · ${name}`;
  fill($('badges'), [...(snap.orchestrator || snap.adapterName ? [{ text: snap.orchestrator || snap.adapterName, tone: 'accent', title: true }] : []), ...(snap.project.badges || [])]
    .map((b) => h('span', { class: `badge ${b.tone || ''}`, title: b.title ? t('app') : null }, tr(b.text))));
  $('mainDir').textContent = snap.project.dir || '';
  // le bandeau d'alertes ne sert qu'aux erreurs de lecture (branche ci-dessus)
  fill($('alerts'));
  renderRun(); renderDiagrams(); renderQuotas(); renderJournal();
}
// textes fixes de la page (au chargement et au changement de langue)
function renderStatic() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  for (const el of document.querySelectorAll('[data-tt]')) el.title = t(el.dataset.tt);
  $('langBtn').textContent = t('lang.switch');
  renderProjects();
  if (bubbleMap) bubbleMap.svg.setAttribute('aria-label', t('map.aria'));
}

function renderProjects() {
  const sel = $('projSel');
  const cur = snap && snap.projectId ? snap.projectId : projectId;
  $('projBox').hidden = projects.length < 2 && !(projects.length === 1 && projects[0].id !== cur);
  fill(sel, projects.map((p) => h('option', { value: p.id, selected: p.id === cur ? 'selected' : null, title: p.dir },
    `${p.tasks ? '● ' : ''}${tr(p.name)} · ${tr(p.orchestrator)}${p.tasks ? ` · ${t('proj.todo', { n: p.tasks })}` : ''}${p.run === 'error' ? ` · ${t('run.error')}` : ''}`)));
  const others = projects.filter((p) => p.id !== cur && p.tasks).reduce((n, p) => n + p.tasks, 0);
  $('projOthers').hidden = !others;
  $('projOthers').textContent = others ? t('proj.todo', { n: others }) : '';
  $('projOthers').title = others ? t('proj.others') : '';
}

function renderRun() {
  const r = snap.run || {};
  const el = $('run');
  const txt = r.text ? tr(r.text) : '';
  if (r.state === 'frozen') { fill(el, h('span', { class: 'dot' }), txt || t('run.frozen')); el.className = 'badge bad'; }
  else if (r.state === 'paused') { fill(el, h('span', { class: 'dot' }), txt || t('run.paused')); el.className = 'badge warn'; }
  else if (r.state === 'error') { fill(el, h('span', { class: 'dot' }), txt || t('run.error')); el.className = 'badge bad'; }
  else if (r.state === 'active') { fill(el, h('span', { class: 'dot live' }), txt || t('run.active', { n: r.count || 0 })); el.className = 'badge ok'; }
  else { fill(el, h('span', { class: 'dot' }), txt || t('run.idle')); el.className = 'badge'; }
}

// --- blocages : chaque tâche est rattachée à son nœud ; le détail du nœud la montre en étapes, une par une ---
// L'étape courante de chaque tâche est gardée hors du DOM (les instantanés reconstruisent la page) et dans
// localStorage, par projet ; elle repart de la première étape si les étapes de la tâche changent.
const STEP_KEY = 'orch-human-steps';
let stepState = (() => { try { return JSON.parse(localStorage.getItem(STEP_KEY) || '{}') || {}; } catch { return {}; } })();
const saveSteps = () => { try { localStorage.setItem(STEP_KEY, JSON.stringify(stepState)); } catch {} };
const stepNotes = new Map(); // id de tâche -> { text, cls } (retour d'une ouverture ou d'une copie)
const HTONE = { freeze: 'bad', pause: 'warn', blocked: 'bad', item: 'warn', pr: 'info', pending: 'warn' };
const pkey = (id) => `${snap.projectId}|${id}`;
function tsig(x) { const s = JSON.stringify(x.steps.map((y) => [y.text, y.url || '', y.open ? y.open.label : '', y.cmd || ''])); let n = 0; for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) | 0; return String(n); }
function progressOf(x) {
  const sig = tsig(x);
  let p = stepState[pkey(x.id)];
  if (!p || p.sig !== sig) p = { sig, idx: 0, done: false };
  p.idx = Math.max(0, Math.min(p.idx, x.steps.length - 1));
  return p;
}
function setProgress(x, p) { stepState[pkey(x.id)] = p; saveSteps(); renderMapDetail(true); }
const safeHref = (u) => (typeof u === 'string' && /^[a-z][a-z0-9+.-]*:/i.test(u) && !/^\s*(javascript|data|vbscript|file|blob):/i.test(u) ? u : null);
// texte d'étape : liens web et #id rendus cliquables (createElement uniquement)
function richText(text, refs) {
  text = tr(text);
  const out = [];
  const re = /(https?:\/\/[^\s<>"')\]]+)|(#(\d{1,7})\b)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    const url = m[1] ? m[1].replace(/[.,;:!?]+$/, '') : refs && refs[m[3]];
    if (!url || (m[2] && m.index > 0 && /[\w&/]/.test(text[m.index - 1]))) continue;
    out.push(text.slice(last, m.index));
    const shown = m[1] ? url : m[2];
    out.push(h('a', { href: safeHref(url), target: '_blank', rel: 'noopener noreferrer' }, shown));
    last = m.index + shown.length;
  }
  out.push(text.slice(last));
  return out;
}
function hostOf(u) { try { return new URL(u).host; } catch { return t('link'); } }
async function openLocal(x, ref) {
  try {
    const r = await fetch('/api/open', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project: snap.projectId, ref }) });
    const j = await r.json().catch(() => ({}));
    stepNotes.set(x.id, r.ok ? { text: t(j.dir ? 'human.opened.dir' : 'human.opened.file'), cls: 'ok' } : { text: t('human.openFail', { err: j.error || r.status }), cls: 'bad' });
  } catch (e) { stepNotes.set(x.id, { text: t('human.unreachable'), cls: 'bad' }); }
  renderMapDetail(true);
}
async function copyCmd(x, cmd) {
  let ok = false;
  try { await navigator.clipboard.writeText(cmd); ok = true; } catch {
    try { const ta = h('textarea', null, cmd); document.body.append(ta); ta.select(); ok = document.execCommand('copy'); ta.remove(); } catch {}
  }
  stepNotes.set(x.id, ok ? { text: t('human.copied', { cmd }), cls: 'ok' } : { text: t('human.copyFail', { cmd }), cls: 'bad' });
  renderMapDetail(true);
}
function toolName(u) {
  const host = hostOf(u);
  if (host === 'dev.azure.com' || /visualstudio\.com$/.test(host)) return 'Azure DevOps';
  if (/(^|\.)github\.com$/.test(host)) return 'GitHub';
  if (/(^|\.)gitlab\.com$/.test(host)) return 'GitLab';
  if (/atlassian\.net$/.test(host)) return 'Jira';
  return host.replace(/^www\./, '');
}
// « Où faire cette étape » : l'adresse de l'outil en ligne, le chemin local ou l'outil où taper la commande
function stepWhere(x, s) {
  const rows = [];
  if (s.url) rows.push(h('div', { class: 'wrow' }, h('span', { class: 'wk' }, `🌐 ${s.urlLabel || toolName(s.url)}`),
    h('a', { class: 'wv mono', href: safeHref(s.url), target: '_blank', rel: 'noopener noreferrer' }, s.url)));
  if (s.open) {
    const full = s.open.full || s.open.label;
    const shown = `${full}${s.open.line ? t('where.line', { n: s.open.line }) : ''}`;
    const etip = s.open.line ? t('where.editorLine', { n: s.open.line }) : t('where.editor');
    rows.push(h('div', { class: 'wrow' }, h('span', { class: 'wk' }, t(s.open.dir ? 'where.folder' : 'where.file')),
      s.open.editor && safeHref(s.open.editor)
        ? h('a', { class: 'wv mono', href: safeHref(s.open.editor), title: etip }, shown)
        : h('a', { class: 'wv mono', href: '#', onclick: (e) => { e.preventDefault(); openLocal(x, s.open.ref); } }, shown)));
  }
  if (s.where) rows.push(h('div', { class: 'wrow' }, h('span', { class: 'wk' }, t(s.cmd ? 'where.cmd' : 'where.where')), h('span', { class: 'wv' }, tr(s.where))));
  if (s.missing) rows.push(h('div', { class: 'wrow' }, h('span', { class: 'wk' }, t('where.missing')), h('span', { class: 'wv c-bad' }, t('where.missingText', { p: s.missing }))));
  return rows.length ? h('div', { class: 'where' }, h('div', { class: 'wt' }, t('where.title')), rows) : null;
}
function stepActions(x, s) {
  const a = [];
  if (s.url) a.push(h('a', { class: 'hbtn primary', href: safeHref(s.url), target: '_blank', rel: 'noopener noreferrer', title: s.url },
    h('span', { class: 'lbl' }, t('act.open', { tool: s.urlLabel || toolName(s.url) })), ' ↗'));
  if (s.open) {
    if (s.open.editor && safeHref(s.open.editor)) a.push(h('a', { class: `hbtn${s.url ? '' : ' primary'}`, href: safeHref(s.open.editor), title: s.open.line ? t('where.editorLine', { n: s.open.line }) : t('where.editor') },
      h('span', { class: 'lbl' }, t('act.open', { tool: s.open.label })), ' ✎'));
    a.push(h('button', { class: `hbtn${s.url || s.open.editor ? '' : ' primary'}`, title: s.open.full || s.open.label, onclick: () => openLocal(x, s.open.ref) },
      h('span', { class: 'lbl' }, t(s.open.dir ? 'act.openFolder' : 'act.reveal')), ' 📂'));
  }
  if (s.cmd) a.push(h('button', { class: `hbtn${s.url || s.open ? '' : ' primary'}`, title: t('act.copyTitle'), onclick: () => copyCmd(x, s.cmd) }, h('code', null, s.cmd), ` ⧉ ${t('act.copy')}`));
  return a;
}
// Une seule étape affichée à la fois par nœud : la tâche choisie (sinon la première pas encore faite) et son étape
// courante ; « Terminé » passe à l'étape suivante, puis à la tâche suivante du même nœud. La tâche affichée est gardée
// en mémoire de la page (curByNode), pas dans localStorage.
const WHY = new WeakMap(); // tâche -> { reason, ref } : rattachement décidé par buildMap
let mapBlocks = new Map(); // id de nœud (ou « in:human ») -> tâches rattachées, faites ou non
const curByNode = new Map(); // id de nœud -> id de la tâche affichée
let lastDone = null, lastDoneNode = null; // { title, text } : tâche que l'humain vient de terminer, sur ce nœud
let blkCache = { sig: '', el: null }; // le bloc d'étapes n'est reconstruit que si son contenu change (garde du clic)
function blocksPanel(node, list) {
  const todo = list.filter((x) => !progressOf(x).done);
  const done = list.filter((x) => progressOf(x).done);
  const cur = todo.find((x) => x.id === curByNode.get(node)) || todo[0] || null;
  if (cur) curByNode.set(node, cur.id); else curByNode.delete(node);
  const out = [];
  if (lastDone && lastDoneNode === node) out.push(h('div', { class: 'hnote ok hdone' }, t('human.finished', { title: lastDone.title }), lastDone.text ? ` ${lastDone.text}` : ''));
  // blocages sans nœud affiché ou identifiant introuvable : la raison est dite, la tâche reste visible
  for (const x of todo) {
    const w = WHY.get(x);
    if (w && (w.reason === 'unknown' || w.reason === 'hidden')) out.push(h('div', { class: 'hnote warn' }, `${tr(x.title)} — `, t(w.reason === 'unknown' ? 'blk.unknown' : 'blk.hidden', { id: w.ref })));
  }
  if (!cur) {
    out.push(h('div', { class: 'htask' }, h('div', { class: 'hstep' }, h('div', { class: 'num ok' }, '✓'), h('div', { class: 'txt' }, t('human.nothing')))));
  } else {
    const x = cur, p = progressOf(x), s = x.steps[p.idx];
    const kl = x.kindLabel ? tr(x.kindLabel) : Object.hasOwn(DICT.en, `hkind.${x.kind}`) ? t(`hkind.${x.kind}`) : t('hkind.action');
    const kc = x.tone || HTONE[x.kind] || 'warn';
    const last = p.idx === x.steps.length - 1;
    const note = stepNotes.get(x.id);
    const finish = () => {
      stepNotes.delete(x.id);
      if (!last) { lastDone = null; setProgress(x, { ...p, idx: p.idx + 1 }); return; }
      lastDone = { title: tr(x.title), text: tr(x.doneText) }; lastDoneNode = node;
      stepState[pkey(x.id)] = { ...p, done: true };
      const next = todo.find((y) => y !== x);
      if (next) curByNode.set(node, next.id); else curByNode.delete(node);
      saveSteps(); renderMapDetail(true);
    };
    out.push(h('div', { class: 'htask' },
      h('div', { class: 'hh' }, h('span', { class: `badge ${kc}` }, kl),
        h('span', { class: 't' }, `${todo.length > 1 ? t('human.taskOf', { i: todo.indexOf(x) + 1, n: todo.length }) : ''}${tr(x.title)}`), h('span', { class: 'sp' }),
        h('span', { class: 'muted', style: 'font-size:12px' }, t('human.stepOf', { i: p.idx + 1, n: x.steps.length }))),
      x.summary && (x.kind !== 'blocked' || x.explicit) ? h('div', { class: 'sum' }, richText(x.summary, x.refs)) : null,
      h('div', { class: 'hbar', role: 'progressbar', 'aria-valuemin': '1', 'aria-valuemax': String(x.steps.length), 'aria-valuenow': String(p.idx + 1) },
        x.steps.map((y, i) => h('span', { class: i < p.idx ? 'done' : i === p.idx ? 'cur' : '', title: t('human.step', { i: i + 1 }) }))),
      h('div', { class: 'hstep' }, h('div', { class: 'num' }, String(p.idx + 1)), h('div', { class: 'txt' }, richText(s.text, x.refs)),
        stepWhere(x, s), stepActions(x, s).length ? h('div', { class: 'acts' }, stepActions(x, s)) : null),
      h('div', { class: 'hnav' },
        h('button', { class: 'hbtn', disabled: p.idx === 0 ? 'disabled' : null, onclick: () => { stepNotes.delete(x.id); setProgress(x, { ...p, idx: p.idx - 1 }); } }, t('human.prev')),
        note ? h('span', { class: `hnote ${note.cls}` }, note.text) : null,
        h('span', { class: 'sp' }),
        h('button', { class: 'hbtn ok big', onclick: finish }, t(last ? 'human.done' : 'human.next')))));
  }
  // les autres tâches du nœud : leur titre seulement ; clic = la traiter maintenant
  const select = (x) => { curByNode.set(node, x.id); lastDone = null; renderMapDetail(true); };
  const others = todo.filter((x) => x !== cur);
  if (others.length) out.push(h('div', { class: 'hnext' }, h('span', { class: 'muted' }, t('human.then')),
    others.map((x) => h('button', { class: 'chipbtn', title: t('human.doNow'), onclick: () => select(x) }, tr(x.title)))));
  if (done.length) out.push(h('div', { class: 'hnext' }, h('span', { class: 'muted' }, t('human.doneHere')),
    done.map((x) => h('button', { class: 'chipbtn done', title: t('human.review'), onclick: () => { stepState[pkey(x.id)] = { sig: tsig(x), idx: 0, done: false }; select(x); } }, `✓ ${tr(x.title)}`))));
  return h('div', { class: 'hblocks' }, out);
}
// bloc d'étapes d'un nœud, réutilisé tant que rien n'a changé (un instantané arrive chaque seconde : un clic ne doit pas se perdre)
function blocksBox(node, list, force) {
  const sig = JSON.stringify([lang, snap.projectId, node, list.map((x) => [x, WHY.get(x) || null]), list.map((x) => progressOf(x)), curByNode.get(node) || null, [...stepNotes], lastDone, lastDoneNode]);
  if (!force && sig === blkCache.sig && blkCache.el) return blkCache.el;
  blkCache = { sig, el: blocksPanel(node, list) };
  return blkCache.el;
}

function renderQuotas() {
  const u = snap.usage;
  if (!u || !u.windows || !u.windows.length) { $('qAge').textContent = ''; fill($('quotas'), h('div', { class: 'muted' }, tr((snap.hints || {}).usage) || t('q.empty'))); return; }
  const stale = u.ageMin != null && u.maxAge != null && u.ageMin > u.maxAge;
  $('qAge').textContent = u.ageMin != null ? (u.ageMin < 1 ? t('q.now') : t('q.ago', { n: u.ageMin }) + (stale ? t('q.old') : '')) : '';
  $('qAge').title = tr(u.tip);
  fill($('quotas'), u.windows.map((w) => {
    const p = Math.max(0, Math.min(100, Math.round(w.percent)));
    const r = w.resetsAt ? new Date(w.resetsAt) : null;
    return h('div', { class: 'q' },
      h('div', { class: 'lab' }, h('span', null, tr(w.label)), h('span', { class: 'muted' }, `${p} %`, r && !isNaN(r) ? t('q.reset', { d: r.toLocaleString(loc(), { weekday: 'short', hour: '2-digit', minute: '2-digit' }) }) : '')),
      h('div', { class: 'bar' }, h('i', { class: p >= 95 ? 'bad' : p >= 80 ? 'warn' : '', style: `width:${p}%` })));
  }));
}

function renderJournal() {
  const j = snap.journal || [];
  $('jCount').textContent = j.length ? t('j.count', { n: j.length }) : '';
  fill($('journal'), j.length ? j.map((l) => h('div', { class: 'row' }, l.dirLabel ? h('span', { class: 'chip' }, l.dirLabel) : null, l.dirLabel ? ' ' : null, l.ts && !String(tr(l.text)).replace(/(\d)T(\d)/g, '$1 $2').includes(l.ts) ? h('span', { class: 'ts' }, l.ts) : null, tr(l.text))) : h('div', { class: 'empty' }, t('j.empty')));
}
// --- carte en direct : bulles (entrées, sessions, agents, outils) reliées par des liens animés.
//     Bulles et liens gardés d'une mise à jour à l'autre (clé = id) pour que les animations ne redémarrent pas ---
const NS = 'http://www.w3.org/2000/svg';
function sv(tag, attrs, text) {
  const el = document.createElementNS(NS, tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  if (text != null) el.textContent = text;
  return el;
}
const fit = (t, n) => { t = String(t || ''); return t.length > n ? t.slice(0, Math.max(1, n - 1)) + '…' : t; };
const setText = (el, t) => { if (el.textContent !== t) el.textContent = t; };
const setAttr = (el, k, v) => { v = String(v); if (el.getAttribute(k) !== v) el.setAttribute(k, v); };
const setVar = (el, k, v) => { if (v) { if (el.style.getPropertyValue(k) !== v) el.style.setProperty(k, v); } else el.style.removeProperty(k); };

// pictogrammes 24×24 (traits)
const ICONS = {
  session: 'M15 12a3 3 0 1 1-6 0a3 3 0 1 1 6 0M12 3v6M12 15v6M3 12h6M15 12h6',
  workflow: 'M4 5h6v5H4zM14 14h6v5h-6zM7 10v3a2 2 0 0 0 2 2h5',
  annexe: 'M4 6h9v7H4zM11 11h9v7h-9z',
  human: 'M16 8a4 4 0 1 1-8 0a4 4 0 1 1 8 0M4 21c1-4 4-6 8-6s7 2 8 6',
  agent: 'M6 8h12v10H6zM12 4v4M9.5 12.5h.01M14.5 12.5h.01M10 15.5h4M4 12v3M20 12v3',
  board: 'M4 5h4v14H4zM10 5h4v9h-4zM16 5h4v6h-4z',
  git: 'M8 6a2 2 0 1 1-4 0a2 2 0 1 1 4 0M8 18a2 2 0 1 1-4 0a2 2 0 1 1 4 0M20 8a2 2 0 1 1-4 0a2 2 0 1 1 4 0M6 8v8M18 10c0 4-6 3-11 6.5',
  files: 'M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5',
  build: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M8 15h8',
  web: 'M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  gear: 'M15.5 12a3.5 3.5 0 1 1-7 0a3.5 3.5 0 1 1 7 0M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1l2.1-2.1M17 7l2.1-2.1',
  shell: 'M3 5h18v14H3zM7 10l3 2-3 2M12 15h5',
  inbox: 'M16 8a4 4 0 1 1-8 0a4 4 0 1 1 8 0M4 21c1-4 4-6 8-6s7 2 8 6',
  watch: 'M2 12c3-5 6.5-7 10-7s7 2 10 7c-3 5-6.5 7-10 7S5 17 2 12zM15 12a3 3 0 1 1-6 0a3 3 0 1 1 6 0',
  quota: 'M4 17a8 8 0 1 1 16 0M12 17l4-5',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
};

// modèle Claude : « claude-opus-5-5 » -> Opus 5.5 ; couleur par famille
function shortModel(m) {
  if (!m) return '';
  const s = String(m).replace(/^claude-/, '').replace(/-\d{8}$/, '').replace(/\[.*\]$/, '');
  const mm = s.match(/^([a-z]+)-(\d+)(?:-(\d+))?/);
  if (mm) return `${mm[1][0].toUpperCase()}${mm[1].slice(1)} ${mm[2]}${mm[3] ? '.' + mm[3] : ''}`;
  return s.length > 14 ? s.slice(0, 13) + '…' : s.charAt(0).toUpperCase() + s.slice(1);
}
function modelColor(m) {
  const f = String(m || '').toLowerCase();
  for (const k of ['opus', 'fable', 'sonnet', 'haiku']) if (f.includes(k)) return `var(--m-${k})`;
  return 'var(--m-other)';
}
// plusieurs modèles : le plus fréquent, suivi de « +n »
function modelsLabel(counts) {
  const e = Object.entries(counts).filter(([m]) => m).sort((a, b) => b[1] - a[1]);
  if (!e.length) return { text: '', color: '' };
  return { text: shortModel(e[0][0]) + (e.length > 1 ? ` +${e.length - 1}` : ''), color: modelColor(e[0][0]), all: e.map(([m]) => m) };
}

const LIVE_EDGE = 30000, RECENT = 10 * 60000, REFUSAL_MS = 60000;
const STATE_COLOR = { run: 'var(--ok)', wait: 'var(--warn)', silent: 'var(--warn)', bad: 'var(--bad)', refused: 'var(--bad)', done: 'var(--muted)', idle: 'var(--muted)' };

// tracé d'un lien entre deux bulles : sortie et entrée horizontales (ou verticales si les bulles sont l'une
// au-dessus de l'autre), du bord d'une bulle au bord de l'autre
function linkPath(A, B) {
  const dx = B.x - A.x, dy = B.y - A.y;
  if (Math.abs(dx) < 4) { // même colonne : arc par la gauche
    const x1 = A.x - A.r, x2 = B.x - B.r, c = 34 + Math.abs(dy) * 0.12;
    return `M${x1} ${A.y} C${x1 - c} ${A.y}, ${x2 - c} ${B.y}, ${x2} ${B.y}`;
  }
  if (Math.abs(dx) >= Math.abs(dy) * 0.5) {
    const s = dx > 0 ? 1 : -1, x1 = A.x + s * A.r, x2 = B.x - s * B.r, c = Math.max(24, Math.abs(x2 - x1) / 2);
    return `M${x1} ${A.y} C${x1 + s * c} ${A.y}, ${x2 - s * c} ${B.y}, ${x2} ${B.y}`;
  }
  const s = dy > 0 ? 1 : -1, y1 = A.y + s * A.r, y2 = B.y - s * B.r, c = Math.max(24, Math.abs(y2 - y1) / 2);
  return `M${A.x} ${y1} C${A.x} ${y1 + s * c}, ${B.x} ${y2 - s * c}, ${B.x} ${y2}`;
}
const REDUCED = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

class BubbleMap {
  constructor(host, minWidth) {
    this.svg = sv('svg', { role: 'img', 'aria-label': t('map.aria') });
    this.svg.style.minWidth = `${minWidth}px`;
    this.gHead = sv('g'); this.gE = sv('g'); this.gN = sv('g'); this.gP = sv('g', { class: 'pkts' });
    this.svg.append(this.gHead, this.gE, this.gN, this.gP);
    host.replaceChildren(this.svg);
    this.nodes = new Map(); this.edges = new Map(); this.hk = ''; this.fid = 0;
    this.onPick = null; this.onMoved = null; this.onMoveNode = null;
    this.pos = new Map(); this.storeKey = null; this.drag = null; this.dragEnd = 0; this.live = 0;
  }
  // positions choisies à la main : gardées dans le navigateur, par projet
  usePositions(key) {
    if (key === this.storeKey) return;
    this.storeKey = key; this.pos = new Map();
    try { for (const [id, p] of Object.entries(JSON.parse(localStorage.getItem(key) || '{}') || {})) if (p && isFinite(p.x) && isFinite(p.y)) this.pos.set(id, { x: +p.x, y: +p.y }); } catch {}
  }
  savePositions() {
    if (!this.storeKey) return;
    try { if (this.pos.size) localStorage.setItem(this.storeKey, JSON.stringify(Object.fromEntries(this.pos))); else localStorage.removeItem(this.storeKey); } catch {}
    this.onMoved && this.onMoved();
  }
  resetPositions() { this.pos.clear(); this.savePositions(); }
  pt(ev) {
    const m = this.svg.getScreenCTM();
    return m ? new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse()) : { x: 0, y: 0 };
  }
  moveTo(id, x, y) {
    const r = this.nodes.get(id); if (!r) return;
    const vb = this.svg.viewBox.baseVal, R = r.n.r;
    x = Math.max(R + 4, Math.min((vb.width || 2000) + 400, x)); y = Math.max(R + 22, Math.min((vb.height || 2000) + 400, y));
    r.n.x = Math.round(x); r.n.y = Math.round(y);
    r.g.style.transform = `translate(${r.n.x}px, ${r.n.y}px)`;
    this.pos.set(id, { x: r.n.x, y: r.n.y });
    this.redrawEdges(id);
    this.onMoveNode && this.onMoveNode(id);
  }
  down(ev, id) {
    if (ev.button !== 0 && ev.pointerType === 'mouse') return;
    const r = this.nodes.get(id); if (!r) return;
    const p = this.pt(ev);
    this.drag = { id, r, sx: p.x, sy: p.y, ox: r.n.x, oy: r.n.y, moved: false };
    try { r.g.setPointerCapture(ev.pointerId); } catch {}
  }
  move(ev) {
    const d = this.drag; if (!d) return;
    const p = this.pt(ev), dx = p.x - d.sx, dy = p.y - d.sy;
    if (!d.moved) { if (Math.hypot(dx, dy) < 5) return; d.moved = true; d.r.g.classList.add('dragging'); this.gN.append(d.r.g); }
    ev.preventDefault();
    this.moveTo(d.id, d.ox + dx, d.oy + dy);
  }
  up() {
    const d = this.drag; if (!d) return;
    this.drag = null;
    if (d.moved) { d.r.g.classList.remove('dragging'); this.dragEnd = Date.now(); this.savePositions(); }
  }
  redrawEdges(id) {
    for (const [, e] of this.edges) {
      if (e.from !== id && e.to !== id) continue;
      const a = this.nodes.get(e.from), b = this.nodes.get(e.to); if (!a || !b) continue;
      const d = linkPath(a.n, b.n); setAttr(e.base, 'd', d); setAttr(e.flow, 'd', d);
    }
  }
  update({ width, height, heads, nodes, edges, selected }) {
    // place retenue (ou en cours de déplacement) ; le cadre grandit pour garder les bulles déplacées visibles
    for (const n of nodes) {
      const p = this.drag && this.drag.id === n.id && this.drag.moved ? this.drag.r.n : this.pos.get(n.id);
      if (p) { n.x = p.x; n.y = p.y; }
      width = Math.max(width, n.x + n.r + 90); height = Math.max(height, n.y + n.r + 44);
    }
    setAttr(this.svg, 'viewBox', `0 0 ${Math.ceil(width)} ${Math.ceil(height)}`);
    const hk = JSON.stringify(heads);
    if (hk !== this.hk) {
      this.hk = hk;
      this.gHead.replaceChildren(...heads.map((c) => sv('text', { x: c.x, y: 16, class: 'colh', 'text-anchor': 'middle' }, c.text.toUpperCase())));
    }
    const seen = new Set();
    for (const n of nodes) {
      seen.add(n.id);
      let r = this.nodes.get(n.id);
      if (!r) {
        r = { g: sv('g', { tabindex: 0, role: 'button' }), tip: sv('title'), halo: sv('circle', { class: 'halo' }), bg: sv('circle', { class: 'bg' }),
          track: sv('circle', { class: 'gtrack' }), ring: sv('circle', { class: 'ring' }), gauge: sv('path', { class: 'gauge' }),
          ic: sv('path', { class: 'ic' }), v: sv('text', { class: 'v' }), sb: sv('text', { class: 'sb' }),
          lb: sv('text', { class: 'lb' }), lb2: sv('text', { class: 'lb2' }),
          cnt: sv('g', { class: 'cnt' }), cntC: sv('circle', { r: 10 }), cntT: sv('text', { y: 3.6 }),
          blk: sv('g', { class: 'blk' }), blkC: sv('circle', { r: 10 }), blkT: sv('text', { y: 3.6 }),
          tag: sv('g', { class: 'tag' }), tagR: sv('rect', { width: 30, height: 13, rx: 6.5, x: -15, y: -9 }), tagT: sv('text', { y: 1 }, 'AUTO') };
        r.cnt.append(r.cntC, r.cntT); r.blk.append(r.blkC, r.blkT); r.tag.append(r.tagR, r.tagT);
        r.g.append(r.tip, r.halo, r.bg, r.track, r.ring, r.gauge, r.ic, r.v, r.sb, r.lb, r.lb2, r.cnt, r.blk, r.tag);
        r.g.style.transform = `translate(${n.x}px,${n.y}px)`;
        const id = n.id;
        r.g.addEventListener('pointerdown', (ev) => this.down(ev, id));
        r.g.addEventListener('pointermove', (ev) => this.move(ev));
        r.g.addEventListener('pointerup', () => this.up());
        r.g.addEventListener('pointercancel', () => this.up());
        // un glisser ne compte pas comme un clic
        r.g.addEventListener('click', () => { if (Date.now() - this.dragEnd < 350) return; this.onPick && this.onPick(id); });
        r.g.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); this.onPick && this.onPick(id); return; }
          const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
          if (!k) return;
          ev.preventDefault();
          const st = ev.shiftKey ? 40 : 10, cur = this.nodes.get(id).n;
          this.moveTo(id, cur.x + k[0] * st, cur.y + k[1] * st); this.savePositions();
        });
        this.gN.append(r.g);
        this.nodes.set(n.id, r);
      }
      r.n = n;
      const R = n.r;
      setAttr(r.g, 'class', `bub ${n.state || ''}${selected === n.id ? ' sel' : ''}${this.drag && this.drag.id === n.id && this.drag.moved ? ' dragging' : ''}`);
      const tr = `translate(${n.x}px, ${n.y}px)`;
      if (r.g.style.transform !== tr) r.g.style.transform = tr;
      setVar(r.g, '--rc', n.ring || STATE_COLOR[n.state] || '');
      setVar(r.g, '--ic', n.iconColor || '');
      setVar(r.g, '--vc', n.valueColor || '');
      setVar(r.g, '--sc', n.subColor || '');
      for (const c of [r.halo, r.bg, r.ring, r.track]) setAttr(c, 'r', R);
      setAttr(r.halo, 'r', R + 4);
      // jauge (quotas) : arc proportionnel à la place du cercle plein
      if (n.gauge != null) {
        const p = Math.max(0.001, Math.min(0.999, n.gauge)), a0 = -Math.PI / 2, a1 = a0 + p * 2 * Math.PI;
        setAttr(r.gauge, 'd', `M${R * Math.cos(a0)} ${R * Math.sin(a0)} A${R} ${R} 0 ${p > 0.5 ? 1 : 0} 1 ${(R * Math.cos(a1)).toFixed(2)} ${(R * Math.sin(a1)).toFixed(2)}`);
        r.gauge.style.display = ''; r.track.style.display = ''; r.ring.style.display = 'none';
      } else { r.gauge.style.display = 'none'; r.track.style.display = 'none'; r.ring.style.display = ''; }
      const is = R * 0.5, ix = -is / 2, iy = -R * 0.68;
      setAttr(r.ic, 'd', ICONS[n.icon] || ICONS.agent);
      setAttr(r.ic, 'transform', `translate(${ix.toFixed(1)} ${iy.toFixed(1)}) scale(${(is / 24).toFixed(3)})`);
      setAttr(r.v, 'y', R * 0.16); setAttr(r.sb, 'y', R * 0.52);
      setText(r.v, fit(n.value, Math.floor(R / 3.4)));
      setText(r.sb, fit(n.sub, Math.floor(R / 2.9)));
      setAttr(r.lb, 'y', R + 16); setAttr(r.lb2, 'y', R + 29);
      setText(r.lb, fit(n.label, 24)); setText(r.lb2, fit(n.label2 || '', 26));
      if (n.count > 1) { r.cnt.style.display = ''; setAttr(r.cnt, 'transform', `translate(${(R * 0.72).toFixed(1)} ${(-R * 0.72).toFixed(1)})`); setText(r.cntT, `${n.count}`); }
      else r.cnt.style.display = 'none';
      if (n.blocks) { r.blk.style.display = ''; setAttr(r.blk, 'transform', `translate(${(R * 0.72).toFixed(1)} ${(R * 0.72).toFixed(1)})`); setVar(r.blk, '--bc', n.blocks.color); setText(r.blkT, `${n.blocks.n}`); }
      else r.blk.style.display = 'none';
      if (n.auto) { r.tag.style.display = ''; setAttr(r.tag, 'transform', `translate(${(-R * 0.72).toFixed(1)} ${(-R * 0.72).toFixed(1)})`); }
      else r.tag.style.display = 'none';
      setText(r.tip, (n.tip || [n.label, n.value, n.sub].filter(Boolean).join('\n')) + '\n' + t('map.drag'));
      setAttr(r.g, 'aria-label', `${n.label} : ${[n.value, n.sub, n.blocks ? `${t('m.nActions', { n: n.blocks.n })} ${t('blk.here')}` : ''].filter(Boolean).join(', ')}`);
    }
    for (const [id, r] of this.nodes) if (!seen.has(id)) { r.g.remove(); this.nodes.delete(id); }
    const eseen = new Set();
    for (const e of edges) {
      const a = this.nodes.get(e.from), b = this.nodes.get(e.to);
      if (!a || !b) continue;
      eseen.add(e.id);
      let r = this.edges.get(e.id);
      if (!r) {
        r = { g: sv('g'), base: sv('path', { class: 'base', id: `lk${++this.fid}` }), flow: sv('path', { class: 'flow' }), dots: [], pk: '' };
        r.g.append(r.base, r.flow);
        this.gE.append(r.g);
        this.edges.set(e.id, r);
      }
      r.from = e.from; r.to = e.to;
      const d = linkPath(a.n, b.n);
      setAttr(r.base, 'd', d); setAttr(r.flow, 'd', d);
      setAttr(r.g, 'class', `lnk${e.on ? ' on' : ' off'}`);
      setVar(r.g, '--ec', e.color || 'var(--accent)');
      // billes qui suivent le lien : leur nombre dit le rythme des échanges
      const dur = e.rate >= 10 ? 1.6 : e.rate >= 3 ? 2.2 : 3;
      const want = e.on ? (e.rate >= 10 ? 3 : e.rate >= 3 ? 2 : 1) : 0;
      const pk = `${want}|${dur}`;
      if (pk !== r.pk) {
        r.pk = pk;
        for (const dot of r.dots) dot.remove();
        r.dots = [];
        for (let i = 0; i < want; i++) {
          const dot = sv('circle', { r: 3.2 });
          const am = sv('animateMotion', { dur: `${dur}s`, repeatCount: 'indefinite', begin: `${(-i * dur / want).toFixed(2)}s` });
          const mp = sv('mpath'); mp.setAttribute('href', `#${r.base.id}`);
          am.append(mp); dot.append(am); r.g.append(dot); r.dots.push(dot);
        }
      }
    }
    for (const [id, r] of this.edges) if (!eseen.has(id)) { r.g.remove(); this.edges.delete(id); }
  }
  // un échange : un paquet étiqueté suit le lien de l'émetteur au destinataire, puis une onde marque l'arrivée.
  // Le paquet relit le tracé à chaque image : il suit une bulle qu'on déplace pendant son trajet.
  packet(edgeId, { label, color, refused, reverse }) {
    const e = this.edges.get(edgeId);
    if (!e) return false;
    const target = reverse ? e.from : e.to;
    const pc = refused ? 'var(--bad)' : color || 'var(--accent)';
    if (REDUCED() || this.live > 30 || document.hidden) { this.ripple(target, pc); return true; }
    const g = sv('g', { class: 'pkt' });
    g.style.setProperty('--pc', pc);
    g.append(sv('circle', { r: 5.5 }), sv('text', { y: -10 }, (refused ? '⛔ ' : '') + fit(label, 26)));
    const p0 = e.base.getPointAtLength(reverse ? e.base.getTotalLength() : 0);
    g.setAttribute('transform', `translate(${p0.x.toFixed(1)} ${p0.y.toFixed(1)})`);
    this.gP.append(g); this.live++;
    const start = performance.now(), dur = 1700;
    const step = (now) => {
      if (!g.isConnected || this.edges.get(edgeId) !== e) { g.remove(); this.live--; return; }
      const k = Math.min(1, (now - start) / dur), ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const L = e.base.getTotalLength(), p = e.base.getPointAtLength((reverse ? 1 - ease : ease) * L);
      g.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
      if (k < 1) requestAnimationFrame(step);
      else { g.remove(); this.live--; this.ripple(target, pc); }
    };
    requestAnimationFrame(step);
    return true;
  }
  ripple(id, color) {
    const r = this.nodes.get(id); if (!r) return;
    const c = sv('circle', { class: 'rip', r: r.n.r });
    c.style.setProperty('--pc', color);
    r.g.append(c);
    setTimeout(() => c.remove(), 950);
  }
}

// étiquette courte d'un appel d'outil : « git push », « npm test », « Edit pay.ts », « WebSearch »
function packetLabel(tool, what) {
  const base = (s) => String(s || '').replace(/^["']|["']$/g, '').replace(/^.*[\/\\]/, '');
  if (tool === 'Bash' || tool === 'PowerShell') {
    const part = String(what || '').split(/&&|\|\||;|\|/).map((s) => s.trim())
      .find((s) => s && !/^(cd|export|set|source|\.)\s/.test(s)) || String(what || '');
    const w = part.split(/\s+/).filter((x) => x && !/^[A-Za-z_][A-Za-z0-9_]*=/.test(x) && !/^(env|timeout|\d+)$/.test(x));
    let i = 0;
    if (/^(bash|sh|node|python3?|py|npx|pwsh|powershell)$/.test(base(w[0])) && w[1] && !w[1].startsWith('-')) i = 1;
    const sub = w[i + 1] && !w[i + 1].startsWith('-') ? ' ' + base(w[i + 1]) : '';
    return fit(base(w[i]) + sub, 26);
  }
  if (/^(Edit|Write|MultiEdit|NotebookEdit|Read)$/.test(tool)) return fit(`${tool} ${base(what)}`, 26);
  if (tool === 'Agent' || tool === 'Task') return fit(t('m.launch', { x: (String(what || '').split(' : ')[0] || 'agent').trim() }), 26);
  return fit(String(tool).replace(/^mcp__[^_]+(?:_[^_]+)*__/, ''), 26);
}

// --- construction de la carte à partir de l'instantané ---
let bubbleMap = null, mapSel = null, mapInfo = new Map();
// groupes d'outils de l'orchestrateur (bulles « Outils ») ; catégorie d'un appel -> groupe
const toolsOf = () => (Array.isArray(snap.tools) && snap.tools.length ? snap.tools : [
  { id: 'git', label: { k: 'tool.git' }, desc: { k: 'tool.git.d' }, color: 'var(--warn)' }, { id: 'files', label: { k: 'tool.files' }, desc: { k: 'tool.files.d' }, color: 'var(--ok)' },
  { id: 'build', label: { k: 'tool.build' }, desc: { k: 'tool.build.d' }, color: 'var(--accent)' }, { id: 'web', label: { k: 'tool.web' }, desc: { k: 'tool.web.d' }, color: 'var(--m-fable)' },
  { id: 'shell', label: { k: 'tool.shell' }, desc: { k: 'tool.shell.d' }, color: 'var(--muted)' }]);
function groupOf(cat, ids) {
  if (ids.has(cat)) return cat;
  if (cat === 'read') return ids.has('files') ? 'files' : null;
  if (cat === 'agent' || cat === 'workflow' || cat === 'session') return null;
  return ids.has('shell') ? 'shell' : null;
}
function sessState(s, refusedAt, now) {
  const st = s.status || '';
  if (st === 'blocked') return ['bad', t('m.blocked')];
  if (refusedAt && now - refusedAt < REFUSAL_MS && s.alive) return ['refused', t('m.refused')];
  if (s.alive) {
    if (st === 'waiting') return ['wait', t('m.waiting')];
    if (st === 'paused') return ['wait', t('m.paused')];
    return ['run', st === 'starting' || s.attached === false ? t('m.starting') : t('m.running')];
  }
  if (st === 'done') return ['done', t('m.done')];
  if (st === 'handed-off') return ['done', t('m.passed')];
  if (st === 'failed') return ['bad', t('m.failed')];
  return ['wait', t('m.stopped')];
}
const shortPhase = (p) => { const m = String(p || '').match(/^(\d+)/); return m ? m[1] : fit(p, 12); };

function buildMap() {
  const now = Date.now();
  const nodes = [], edges = [];
  if (Array.isArray(snap.tasks)) lastTasks = snap.tasks; // tâches absentes (lecture en échec) : les dernières connues
  mapBlocks = new Map();
  const info = new Map(); // id -> données du panneau de détail
  const TOOLS = toolsOf();
  const TIDS = new Set(TOOLS.map((x) => x.id));
  const toolColor = (k) => (TOOLS.find((x) => x.id === k) || {}).color || 'var(--accent)';
  const agentsBySess = new Map((snap.agents || []).map((a) => [a.session || 'human', a]));
  const ev = (snap.activity || []).filter((e) => e.t && now - e.t < RECENT).map((e) => ({ ...e, owner: `s:${e.session || 'human'}`, age: now - e.t, group: groupOf(e.cat, TIDS) }));
  const allSess = snap.sessions || [];

  // ---- sessions (l'orchestrateur et ses sessions créées automatiquement) ----
  const recentOwners = new Set(ev.map((e) => e.owner));
  const sess = [];
  const visible = (s) => s.alive || recentOwners.has(`s:${s.id}`) || s.status === 'blocked' || (s.pending && !['done', 'handed-off'].includes(s.status))
    || (agentsBySess.get(s.id) || {}).alive;
  const order = (a, b) => (b.alive - a.alive) || String(b.started).localeCompare(String(a.started));
  for (const s of allSess.filter((x) => x.human && visible(x))) sess.push(s);
  const shown = allSess.filter((s) => !s.human && visible(s));
  // parent puis ses enfants, pour que les liens restent courts
  const keys = new Set(shown.map((s) => s.id));
  const walk = (s, d) => { sess.push(s); if (d < 4) for (const c of shown.filter((x) => x.parent === s.id).sort(order)) walk(c, d + 1); };
  for (const r of shown.filter((s) => !s.parent || !keys.has(s.parent)).sort(order)) walk(r, 0);
  if (!sess.length) for (const s of allSess.filter((x) => !x.human).sort(order).slice(0, 2)) sess.push(s); // rien de vivant : un repère
  const MAXS = 6, sessShown = sess.slice(0, MAXS), sessHidden = sess.length - sessShown.length;
  const sessNodes = sessShown.map((s) => {
    const id = `s:${s.id}`;
    const a = agentsBySess.get(s.id);
    const refusals = ev.filter((e) => e.owner === id && e.blocked && !e.agent);
    const [state, txt] = sessState(s, refusals.length ? refusals[0].t : 0, now);
    const model = (a && a.model) || s.model || '';
    const name = tr(s.name);
    info.set(id, { type: 'session', s, a, refusals });
    return { id, r: 44, icon: s.human ? 'human' : s.kind === 'workflow' ? 'workflow' : s.kind === 'annex' || (s.auto && s.parent) ? 'annexe' : 'session',
      value: model ? shortModel(model) : '—', valueColor: model ? modelColor(model) : '', sub: txt, subColor: STATE_COLOR[state] !== 'var(--muted)' ? STATE_COLOR[state] : '',
      label: name, label2: [kindTxt(s), s.phase ? `${t('sess.phase')}${shortPhase(s.phase)}` : ''].filter(Boolean).join(' · '),
      state, auto: !!s.auto, iconColor: 'var(--accent)',
      tip: `${name}${!s.human && s.id !== name ? ' (' + s.id + ')' : ''}\n${kindTxt(s)} · ${txt}${model ? '\n' + t('m.model') + model : ''}${s.waitingFor ? '\n' + t('sess.waits') + s.waitingFor : ''}${s.blockedReason ? '\n' + t('d.blocked', { x: s.blockedReason }) : ''}` };
  });
  if (sessHidden > 0) {
    info.set('s:+', { type: 'more', label: t('m.moreS'), items: sess.slice(MAXS).map((s) => tr(s.name)) });
    sessNodes.push({ id: 's:+', r: 34, icon: 'more', value: `+${sessHidden}`, sub: t('m.sessions'), label: t('m.moreS'), state: 'idle', tip: sess.slice(MAXS).map((s) => tr(s.name)).join('\n') });
  }
  const sessIds = new Set(sessNodes.map((n) => n.id));
  for (const s of sessShown) if (s.parent && sessIds.has(`s:${s.parent}`)) {
    edges.push({ id: `${s.parent}>${s.id}`, from: `s:${s.parent}`, to: `s:${s.id}`, on: s.alive, rate: 1, color: s.kind === 'workflow' ? 'var(--warn)' : 'var(--accent)' });
  }

  // ---- agents : ceux installés (toujours visibles) et ceux créés automatiquement ----
  const roster = new Map((snap.roster || []).map((r) => [r.name, r]));
  const types = new Map(); // type -> { inst: [], models6h: {}, total6h, last }
  const T_ = (x) => { if (!types.has(x)) types.set(x, { inst: [], models6h: {}, total6h: 0, last: 0 }); return types.get(x); };
  for (const r of roster.keys()) T_(r);
  for (const a of snap.agents || []) {
    for (const [ty, x] of Object.entries(a.agentTypes || {})) {
      const y = T_(ty); y.total6h += x.total; y.last = Math.max(y.last, x.last);
      for (const [m, c] of Object.entries(x.models || {})) y.models6h[m] = (y.models6h[m] || 0) + c;
    }
    const ownerName = a.session === 'human' ? t('session.human') : a.name ? tr(a.name) : sessName(a.session);
    for (const x of a.agents || []) T_(x.type).inst.push({ ...x, owner: `s:${a.session || 'human'}`, ownerName });
  }
  // types créés automatiquement sans activité récente : pas de bulle
  const typeList = [...types].filter(([ty, y]) => roster.has(ty) || y.inst.length || now - y.last < 3 * 3600 * 1000)
    .sort((a, b) => (roster.has(b[0]) - roster.has(a[0]))
      || (!roster.has(a[0]) && (b[1].inst.some((x) => x.status === 'running') - a[1].inst.some((x) => x.status === 'running')))
      || a[0].localeCompare(b[0]));
  const MAXA = 24, agentList = typeList.slice(0, MAXA), agentHidden = typeList.length - agentList.length;
  const agentNodes = [];
  const modelLive = {};
  for (const [ty, y] of agentList) {
    const id = `a:${ty}`;
    const def = roster.get(ty);
    const run = y.inst.filter((x) => x.status === 'running');
    const refused = y.inst.filter((x) => x.lastRefusal && now - x.lastRefusal.t < REFUSAL_MS && x.status === 'running');
    const failed = y.inst.filter((x) => x.status === 'failed' && now - x.mtime < 30 * 60000);
    const silent = y.inst.filter((x) => x.status === 'silent');
    const done = y.inst.filter((x) => x.status === 'done');
    let state, sub, subColor = '';
    if (refused.length) { state = 'refused'; sub = t('m.refused'); subColor = 'var(--bad)'; }
    else if (run.length) { state = 'run'; sub = t('m.nRunning', { n: run.length }); subColor = 'var(--ok)'; }
    else if (failed.length) { state = 'bad'; sub = t('m.failed'); subColor = 'var(--bad)'; }
    else if (silent.length) { state = 'silent'; sub = t('m.silent'); subColor = 'var(--warn)'; }
    else if (done.length) { state = 'done'; sub = t('m.finished', { ago: ago(new Date(Math.max(...done.map((x) => x.mtime))), true) }); }
    else { state = 'idle dim'; sub = t('m.idle'); }
    const pool = run.length ? run : y.inst;
    const counts = {};
    for (const x of pool) if (x.model) counts[x.model] = (counts[x.model] || 0) + 1;
    for (const x of run) if (x.model) modelLive[x.model] = (modelLive[x.model] || 0) + 1;
    let ml = modelsLabel(Object.keys(counts).length ? counts : y.models6h);
    if (!ml.text) ml = def && def.model && def.model !== 'inherit' ? { text: shortModel(def.model) || def.model, color: modelColor(def.model) } : { text: t('m.inherited'), color: '' };
    info.set(id, { type: 'agent', name: ty, def, y });
    agentNodes.push({ id, r: 40, icon: 'agent', iconColor: def ? 'var(--info)' : 'var(--m-fable)', value: ml.text, valueColor: ml.color, sub, subColor,
      label: ty, label2: run.length > 1 ? t('m.instances', { n: run.length }) : y.total6h ? t('m.launches', { n: y.total6h }) : def ? t('m.installed') : '',
      state, auto: !def, count: run.length,
      tip: `${ty}${def ? '' : t('m.auto')}\n${def && def.description ? fit(def.description, 160) + '\n' : ''}${t('m.model')}${ml.all ? ml.all.join(', ') : ml.text}\n${sub}` });
    // liens session -> agent (couleur du modèle) et agent -> outils
    const owners = new Map();
    for (const x of y.inst) {
      if (x.status !== 'running' && now - x.mtime > RECENT) continue;
      const o = owners.get(x.owner) || { on: false, n: 0, model: x.model };
      if (x.status === 'running') { o.on = true; o.n++; o.model = x.model || o.model; }
      owners.set(x.owner, o);
    }
    for (const [owner, o] of owners) if (sessIds.has(owner)) edges.push({ id: `${owner}>${id}`, from: owner, to: id, on: o.on, rate: o.n, color: modelColor(o.model) });
    const tl = new Map();
    for (const x of y.inst) for (const u of x.tools || []) {
      const k = groupOf(u.cat, TIDS); if (!k) continue;
      const age = now - u.t; if (age > RECENT) continue;
      const l = tl.get(k) || { age: Infinity, rate: 0 }; l.age = Math.min(l.age, age); if (age < 60000) l.rate++; tl.set(k, l);
    }
    for (const [k, l] of tl) edges.push({ id: `${id}>t:${k}`, from: id, to: `t:${k}`, on: l.age < LIVE_EDGE, rate: l.rate, color: toolColor(k) });
  }
  if (agentHidden > 0) {
    info.set('a:+', { type: 'more', label: t('m.moreA'), items: typeList.slice(MAXA).map(([ty, y]) => `${ty}${y.inst.length ? t('m.nInst', { n: y.inst.length }) : ''}`) });
    agentNodes.push({ id: 'a:+', r: 34, icon: 'more', value: `+${agentHidden}`, sub: t('m.agents'), label: t('m.moreA'), state: 'idle', tip: typeList.slice(MAXA).map(([ty]) => ty).join('\n') });
  }

  // ---- outils : où vont les actions des sessions et des sous-agents ----
  const tstat = new Map(TOOLS.map((x) => [x.id, { n: 0, rate: 0, last: Infinity, refused: 0, events: [] }]));
  const links = new Map();
  for (const e of ev) {
    const k = e.group; if (!k) continue;
    const S = tstat.get(k); S.n++; if (e.age < 60000) S.rate++; S.last = Math.min(S.last, e.age); if (e.blocked && e.age < REFUSAL_MS) S.refused++;
    S.events.push({ t: e.t, who: e.agent || (e.session === 'human' ? t('session.human') : sessName(e.session)), tool: e.tool, what: e.what, blocked: e.blocked });
    // outil d'un sous-agent : lien agent -> outil (s'il n'est pas déjà tiré de son transcript)
    const owner = e.agent && types.has(e.agent) ? (edges.some((x) => x.id === `a:${e.agent}>t:${k}`) ? null : `a:${e.agent}`) : sessIds.has(e.owner) ? e.owner : null;
    if (!owner) continue;
    const id = `${owner}>t:${k}`;
    const l = links.get(id) || { owner, k, age: Infinity, rate: 0 };
    l.age = Math.min(l.age, e.age); if (e.age < 60000) l.rate++;
    links.set(id, l);
  }
  // outils des sous-agents absents du fil d'activité : comptés aussi
  for (const [, y] of agentList) for (const x of y.inst) for (const u of x.tools || []) {
    const k = groupOf(u.cat, TIDS); if (!k || now - u.t > RECENT) continue;
    const S = tstat.get(k);
    if (!S.events.some((e) => e.who === x.type && Math.abs(e.t - u.t) < 20000 && e.tool === u.tool)) {
      S.n++; if (now - u.t < 60000) S.rate++; S.last = Math.min(S.last, now - u.t); if (u.refused && now - u.t < REFUSAL_MS) S.refused++;
      S.events.push({ t: u.t, who: x.type, tool: u.tool, what: u.what, blocked: u.refused });
    }
  }
  const toolNodes = TOOLS.map((x) => {
    const k = x.id, label = tr(x.label), desc = tr(x.desc), color = x.color || 'var(--accent)';
    const S = tstat.get(k);
    S.events.sort((a, b) => b.t - a.t);
    info.set(`t:${k}`, { type: 'tool', label, S });
    const state = S.refused ? 'refused' : S.last < LIVE_EDGE ? 'run' : S.n ? 'done' : 'idle dim';
    return { id: `t:${k}`, r: 36, icon: Object.hasOwn(ICONS, x.icon || '') ? x.icon : Object.hasOwn(ICONS, k) ? k : 'shell', iconColor: color, ring: state === 'run' ? color : '', value: S.n ? `${S.n}` : '—', valueColor: S.n ? color : '',
      sub: S.refused ? t('m.nRefused', { n: S.refused }) : S.rate ? t('m.perMin', { n: S.rate }) : S.n ? t('m.in10') : t('m.calm'), subColor: S.refused ? 'var(--bad)' : '',
      label, label2: desc, state, tip: `${label} — ${desc}\n${t('m.toolTip', { n: S.n, r: S.rate })}` };
  });
  for (const [id, l] of links) edges.push({ id, from: l.owner, to: `t:${l.k}`, on: l.age < LIVE_EDGE, rate: l.rate, color: toolColor(l.k) });

  // ---- entrées : toi (consignes, actions à faire), quotas, événements ----
  // ---- blocages (tâches) : rattachés à leur nœud par le serveur (x.attach) ; sans nœud affiché, ils restent sur « Toi » ----
  const drawn = new Set([...sessNodes, ...agentNodes].map((n) => n.id).filter((k) => k !== 's:+' && k !== 'a:+'));
  const freeTasks = [];
  for (const x of lastTasks) {
    const at = x.attach || {}, ref = at.ref || '';
    const reason = at.node && drawn.has(at.node) ? 'node' : at.node ? 'hidden' : at.reason || 'none';
    WHY.set(x, { reason, ref });
    if (reason === 'node') mapBlocks.set(at.node, [...(mapBlocks.get(at.node) || []), x]);
    else freeTasks.push(x);
  }
  // badge du nœud : nombre de blocages à faire, couleur du plus grave (bad > warn > info)
  const RANK = { bad: 3, warn: 2, info: 1 }, toneOf = (x) => x.tone || HTONE[x.kind] || 'warn';
  for (const n of [...sessNodes, ...agentNodes]) {
    const list = (mapBlocks.get(n.id) || []).filter((x) => !progressOf(x).done);
    if (!list.length) continue;
    const top = list.reduce((a, x) => ((RANK[toneOf(x)] || 0) > (RANK[toneOf(a)] || 0) ? x : a));
    n.blocks = { n: list.length, color: `var(--${RANK[toneOf(top)] ? toneOf(top) : 'warn'})` };
    n.tip = `${n.tip}
${t('m.nActions', { n: list.length })} · ${t('blk.here')}`;
  }
  mapBlocks.set('in:human', freeTasks);
  const inbox = ((snap.inbox || {}).items || []).length, freeTodo = freeTasks.filter((x) => !progressOf(x).done).length;
  info.set('in:human', { type: 'human' });
  const inNodes = [{ id: 'in:human', r: 36, icon: 'inbox', iconColor: 'var(--accent)', value: freeTodo ? t('m.nActions', { n: freeTodo }) : inbox ? t('m.nInbox', { n: inbox }) : '—',
    sub: freeTodo ? t('blk.noNode') : inbox ? t('m.inbox') : t('m.nothing'), subColor: freeTodo ? 'var(--warn)' : '', label: t('m.you'), label2: t('m.youSub'),
    state: inbox || freeTodo ? 'wait' : 'idle', ring: inbox ? 'var(--accent)' : '', tip: t('m.youTip', { i: inbox, t: freeTodo }) }];
  const u = snap.usage;
  const q = u && u.windows && u.windows.length ? Math.max(...u.windows.map((w) => w.percent)) : null;
  info.set('in:quota', { type: 'quota' });
  inNodes.push({ id: 'in:quota', r: 36, icon: 'quota', iconColor: 'var(--warn)', value: q != null ? `${Math.round(q)} %` : '—', sub: q != null ? (u.ageMin != null ? t('m.agoMin', { n: u.ageMin }) : '') : t('m.noQuota'),
    label: t('m.quota'), label2: q != null ? t('m.quotaSub') : '', gauge: q != null ? q / 100 : null,
    ring: q == null ? '' : q >= 95 ? 'var(--bad)' : q >= 80 ? 'var(--warn)' : 'var(--ok)', state: q == null ? 'idle dim' : q >= 95 ? 'bad' : '',
    tip: u && u.windows ? u.windows.map((w) => `${tr(w.label)} : ${Math.round(w.percent)} %`).join('\n') : t('q.empty') });
  const feed = (snap.feed || {}).items || [];
  const launches = feed.filter((x) => x.launch);
  const f0 = feed.find((x) => !x.launch) || feed[0];
  info.set('in:watch', { type: 'watch' });
  inNodes.push({ id: 'in:watch', r: 36, icon: 'watch', iconColor: 'var(--info)', value: feed.length ? `${launches.length || feed.length}` : '—', sub: feed.length ? t('m.feedSub') : '',
    label: tr((snap.feed || {}).title) || t('feed.title'), label2: f0 ? fit(tr(f0.text), 26) : '', state: feed.length ? '' : 'idle dim',
    tip: feed.slice(0, 10).map((l) => [l.ts, tr(l.chip), tr(l.text)].filter(Boolean).join('  ')).join('\n') || t('feed.empty') });
  for (const n of sessNodes) {
    if (n.id === 's:+') continue;
    const s = info.get(n.id).s;
    if (s.human) edges.push({ id: `in:human>${n.id}`, from: 'in:human', to: n.id, on: ev.some((e) => e.owner === n.id && e.age < LIVE_EDGE), rate: 0, color: 'var(--accent)' });
    else if (!s.parent || !sessIds.has(`s:${s.parent}`)) edges.push({ id: `in:human>${n.id}`, from: 'in:human', to: n.id, on: inbox > 0, rate: 0, color: 'var(--accent)' });
    const qe = ev.filter((e) => e.owner === n.id && e.quota);
    if (qe.length) edges.push({ id: `in:quota>${n.id}`, from: 'in:quota', to: n.id, on: qe[0].age < LIVE_EDGE, rate: 0, color: 'var(--warn)' });
    const st = parseTs(s.started);
    if (s.launched && st && now - st.getTime() < RECENT) edges.push({ id: `in:watch>${n.id}`, from: 'in:watch', to: n.id, on: now - st.getTime() < 60000, rate: 0, color: 'var(--info)' });
  }

  // ---- disposition : entrées | sessions | grille d'agents | outils, chaque colonne centrée ----
  const avail = $('map').clientWidth || 1200;
  const COLS_A = avail >= 1150 ? 4 : avail >= 960 ? 3 : 2, CELL = 128, TOP = 34;
  const xIn = 70, xS = 245, xA0 = 440, xA = (i) => xA0 + (i % COLS_A) * 150, xT = xA0 + (COLS_A - 1) * 150 + 220, W = xT + 90;
  const aRows = Math.ceil(agentNodes.length / COLS_A);
  const rows = Math.max(3, sessNodes.length, aRows, toolNodes.length * 0.86);
  const H = TOP + rows * CELL + 8;
  const place = (lst, x, step) => {
    const off = TOP + (rows * CELL - lst.length * step) / 2;
    lst.forEach((n, i) => { n.x = x; n.y = off + i * step + step / 2 - 12; nodes.push(n); });
  };
  place(inNodes, xIn, CELL); place(sessNodes, xS, CELL); place(toolNodes, xT, CELL * 0.86);
  const aOff = TOP + (rows - aRows) * CELL / 2;
  agentNodes.forEach((n, i) => { n.x = xA(i); n.y = aOff + Math.floor(i / COLS_A) * CELL + CELL / 2 - 12; nodes.push(n); });
  const heads = [{ x: xIn, text: t('col.in') }, { x: xS, text: t('col.sess') }, { x: xA0 + (COLS_A - 1) * 75, text: t('col.agents') }, { x: xT, text: t('col.tools') }];
  // ---- échanges à animer (un paquet chacun, s'il est nouveau) ----
  const events = [];
  for (const e of ev) {
    if (e.agent && types.has(e.agent) && (snap.agents || []).some((a) => (a.agents || []).some((x) => x.type === e.agent && (x.tools || []).length))) continue; // pris dans le transcript du sous-agent
    const key = `A|${e.ts}|${e.sid}|${e.tool}|${e.what}`;
    if (e.cat === 'agent') {
      const type = (String(e.what || '').split(' : ')[0] || '').trim();
      if (type) events.push({ key, t: e.t, edge: `${e.owner}>a:${type}`, label: t('m.launch', { x: type }), color: 'var(--info)', refused: e.blocked });
      continue;
    }
    const k = e.group;
    if (k) events.push({ key, t: e.t, edge: e.agent && types.has(e.agent) ? `a:${e.agent}>t:${k}` : `${e.owner}>t:${k}`, label: packetLabel(e.tool, e.what), color: toolColor(k), refused: e.blocked });
    if (e.quota) events.push({ key: key + '|q', t: e.t, edge: `in:quota>${e.owner}`, label: t('m.quotas'), color: 'var(--warn)', reverse: false });
  }
  for (const [ty, y] of agentList) for (const x of y.inst) {
    for (const uu of x.tools || []) {
      const k = groupOf(uu.cat, TIDS);
      if (k) events.push({ key: `T|${x.id}|${uu.t}|${uu.tool}|${uu.what}`, t: uu.t, edge: `a:${ty}>t:${k}`, label: packetLabel(uu.tool, uu.what), color: toolColor(k), refused: uu.refused });
    }
    // sous-agent qui démarre (y compris les tâches de workflow) et rapport rendu à la session qui l'a lancé
    if (x.status === 'running') events.push({ key: `S|${x.id}`, t: now, edge: `${x.owner}>a:${ty}`, label: t('m.start', { x: ty }), color: modelColor(x.model) });
    if (x.status === 'done' || x.status === 'failed') events.push({ key: `D|${x.id}`, t: x.mtime, edge: `${x.owner}>a:${ty}`, label: x.status === 'failed' ? t('m.failed') : t('m.report'), color: modelColor(x.model), refused: x.status === 'failed', reverse: true });
  }
  mapInfo = info;
  return { width: W, height: H, heads, nodes, edges, modelLive, events, running: agentNodes.reduce((sum, n) => sum + (n.count || 0), 0), live: sessNodes.filter((n) => n.state === 'run').length };
}

// paquets : seuls les échanges apparus depuis l'ouverture de la page partent (pas de rejeu de l'historique),
// dans l'ordre où ils ont eu lieu, un peu décalés pour rester lisibles
let pktSeen = new Set();
let pktReady = false;
function playPackets(events) {
  const fresh = [];
  for (const e of events) {
    if (pktSeen.has(e.key)) continue;
    pktSeen.add(e.key);
    if (pktReady && Date.now() - e.t < 30000) fresh.push(e);
  }
  if (pktSeen.size > 6000) { pktSeen.clear(); for (const e of events) pktSeen.add(e.key); }
  pktReady = true;
  fresh.sort((a, b) => a.t - b.t).slice(-16).forEach((e, i) => setTimeout(() => bubbleMap.packet(e.edge, e), i * 220));
}

function renderMap(withDetail = true) {
  if (!bubbleMap) {
    bubbleMap = new BubbleMap($('map'), 720);
    bubbleMap.onPick = (id) => { mapSel = mapSel === id ? null : id; renderMap(); };
    bubbleMap.onMoved = () => { $('mapReset').hidden = !bubbleMap.pos.size; };
    $('mapReset').addEventListener('click', () => { bubbleMap.resetPositions(); renderMap(false); });
    // la fenêtre de détail suit le nœud : glisser, défilement horizontal de la carte, redimensionnement
    bubbleMap.onMoveNode = () => placeMapDetail();
    $('map').addEventListener('scroll', () => placeMapDetail(), { passive: true });
    window.addEventListener('resize', () => placeMapDetail());
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && mapSel && !$('mapDetail').hidden) closeMapDetail(true); });
  }
  bubbleMap.usePositions(`orch-map-pos:${snap.project.dir || snap.projectId}`);
  $('mapReset').hidden = !bubbleMap.pos.size;
  const m = buildMap();
  if (mapSel && !m.nodes.some((n) => n.id === mapSel)) mapSel = null;
  bubbleMap.update({ ...m, selected: mapSel });
  playPackets(m.events);
  const on = m.edges.filter((e) => e.on).length;
  $('mapCount').textContent = t('map.count', { s: m.live, a: m.running, l: on });
  // résumé par modèle (sessions vivantes + sous-agents en cours)
  const tally = { ...m.modelLive };
  for (const a of snap.agents || []) if (a.alive && a.model) tally[a.model] = (tally[a.model] || 0) + 1;
  const chips = Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([mm, n]) => h('span', { class: 'badge', style: `color:${modelColor(mm)}`, title: mm }, h('span', { class: 'dot live' }), `${shortModel(mm)} · ${n}`));
  const ck = chips.map((c) => c.textContent).join('|');
  if (ck !== $('mapModels').dataset.k) { $('mapModels').dataset.k = ck; fill($('mapModels'), chips); }
  if (withDetail) renderMapDetail();
  placeMapDetail();
}
// fenêtre de détail flottante (issue #22) : posée sur la carte à côté du nœud sélectionné, reliée à lui par un trait.
// Elle suit le nœud (glisser, défilement, redimensionnement, instantané) par simple repositionnement, sans être reconstruite.
let popFor = null; // nœud dont la fenêtre a déjà pris le focus à l'ouverture (pas à chaque rafraîchissement)
function placeMapDetail() {
  const el = $('mapDetail'), link = $('mapLink'), wrap = $('mapWrap');
  const r = bubbleMap && mapSel ? bubbleMap.nodes.get(mapSel) : null;
  if (!r) { el.hidden = true; link.toggleAttribute('hidden', true); wrap.style.minHeight = ''; popFor = null; return; }
  if (el.hidden) { link.toggleAttribute('hidden', true); wrap.style.minHeight = ''; return; }
  const m = bubbleMap.svg.getScreenCTM();
  if (!m) return;
  // hauteur de la carte (SVG) : la fenêtre se dimensionne sur elle, sans boucle avec la hauteur du cadre
  const mapH = $('map').getBoundingClientRect().height;
  const narrow = window.innerWidth < 640, g = 8;
  const box0 = wrap.getBoundingClientRect(), W = box0.width;
  const c = new DOMPoint(r.n.x, r.n.y).matrixTransform(m);
  const cx = c.x - box0.left, cy = c.y - box0.top, R = r.n.r * m.a, gap = R + 22;
  const PW = narrow ? Math.max(200, W - 2 * g) : Math.min(420, Math.max(240, W - 2 * g));
  el.style.width = `${PW}px`;
  el.style.maxHeight = `${Math.max(120, Math.min(520, Math.round(Math.max(mapH, 440) * 0.7)))}px`;
  const PH = el.offsetHeight;
  // le cadre grandit si la fenêtre n'a pas la place à côté du nœud : elle reste entière, sans défilement de la page
  wrap.style.minHeight = `${Math.ceil(Math.max(mapH, PH + 2 * g))}px`;
  let H = wrap.getBoundingClientRect().height;
  let x, y;
  if (!narrow && cx + gap + PW <= W - g) { x = cx + gap; y = cy - PH / 2; } // à droite
  else if (!narrow && cx - gap - PW >= g) { x = cx - gap - PW; y = cy - PH / 2; } // à gauche
  else { x = narrow ? g : cx - PW / 2; y = cy + gap; } // sous le nœud (écran étroit : pleine largeur, flèche vers le haut)
  if (y + PH + g > H) { wrap.style.minHeight = `${Math.ceil(y + PH + g)}px`; H = wrap.getBoundingClientRect().height; }
  x = Math.max(g, Math.min(W - PW - g, x));
  y = Math.max(g, Math.min(H - PH - g, y));
  el.style.left = `${x}px`; el.style.top = `${y}px`;
  // trait : du bord de la fenêtre le plus proche du nœud jusqu'au bord du nœud, avec une pointe sur le nœud
  const ax = Math.max(x, Math.min(x + PW, cx)), ay = Math.max(y, Math.min(y + PH, cy));
  const d0 = Math.hypot(cx - ax, cy - ay);
  if (d0 <= R + 4) link.toggleAttribute('hidden', true); // le nœud est sous la fenêtre : pas de trait
  else {
    const tx = cx - ((cx - ax) / d0) * (R + 1), ty = cy - ((cy - ay) / d0) * (R + 1);
    const L = Math.hypot(tx - ax, ty - ay), ux = (tx - ax) / L, uy = (ty - ay) / L;
    const bx = tx - ux * 10, by = ty - uy * 10;
    link.toggleAttribute('hidden', false);
    setAttr(link, 'viewBox', `0 0 ${Math.round(W)} ${Math.round(H)}`);
    setAttr($('mapLinkL'), 'x1', ax.toFixed(1)); setAttr($('mapLinkL'), 'y1', ay.toFixed(1));
    setAttr($('mapLinkL'), 'x2', bx.toFixed(1)); setAttr($('mapLinkL'), 'y2', by.toFixed(1));
    setAttr($('mapLinkA'), 'points', `${tx.toFixed(1)},${ty.toFixed(1)} ${(bx - uy * 5).toFixed(1)},${(by + ux * 5).toFixed(1)} ${(bx + uy * 5).toFixed(1)},${(by - ux * 5).toFixed(1)}`);
  }
  if (popFor !== mapSel) { popFor = mapSel; el.focus({ preventScroll: true }); }
}
// ferme la fenêtre ; avec back, le focus revient au nœud (Échap, bouton Fermer)
function closeMapDetail(back) {
  const id = mapSel;
  mapSel = null; popFor = null; renderMap();
  const r = back && id && bubbleMap ? bubbleMap.nodes.get(id) : null;
  if (r) r.g.focus({ preventScroll: true });
}

// --- relance d'une session bloquée (issue #24) : bouton, confirmation, état. Rien n'est lancé sans la confirmation ;
//     la page n'envoie que le projet, le nœud et la confirmation : le serveur résout la session et la commande ---
let relaunchConfirm = null; // id du nœud dont la confirmation est ouverte
const relaunchNote = new Map(); // id de nœud -> { text, cls } (retour du serveur)
const relaunchPlanOf = (node) => ((snap && snap.relaunch && snap.relaunch.nodes) || {})[node] || null;
// raison affichée pour un nœud non relançable ; '' si la relance est possible
function relaunchWhy(node) {
  const p = relaunchPlanOf(node);
  if (p) return p.ok ? '' : t(`relaunch.reason.${p.reason}`);
  const k = /^t:/.test(node) ? 'tool' : node === 'in:human' ? 'you' : node === 'in:watch' ? 'events' : node === 'in:quota' ? 'quota' : 'unknown';
  return t(`relaunch.reason.${k}`);
}
function runLine(run) {
  if (run.state === 'running') return h('span', { class: 'hnote info' }, t('relaunch.state.running'));
  if (run.state === 'done') return h('span', { class: 'hnote ok' }, t('relaunch.state.done'));
  return h('span', { class: 'hnote bad' }, t('relaunch.state.failed', { why: t(`relaunch.why.${run.reason || 'exit'}`, { code: run.code == null ? '' : run.code }) }));
}
// boîte de confirmation : projet, session, dossier et commande exacte (aucun secret)
function relaunchConfirmBox(node, sess) {
  const mode = (snap.relaunch && snap.relaunch.mode) || '';
  const cmd = ['claude', '-p', '--resume', sess.claudeSessionId, '--output-format', 'json', ...(mode ? ['--permission-mode', mode] : [])].join(' ');
  const row = (k, v) => h('div', { class: 'wrow' }, h('span', { class: 'wk' }, t(k)), h('span', { class: 'wv' }, v));
  return h('div', { class: 'where rlconfirm' }, h('div', { class: 'wt' }, t('relaunch.title')),
    row('relaunch.project', tr(snap.project.name)), row('relaunch.session', tr(sess.name)), row('relaunch.dir', snap.project.dir || ''),
    row('relaunch.cmd', h('code', { class: 'mono' }, cmd)),
    h('div', { class: 'muted' }, t('relaunch.note')),
    h('div', { class: 'acts' },
      h('button', { class: 'hbtn ok', onclick: () => relaunchSend(node) }, t('relaunch.confirm')),
      h('button', { class: 'hbtn', onclick: () => { relaunchConfirm = null; renderMapDetail(true); } }, t('relaunch.cancel'))));
}
// bloc de relance d'un nœud : bouton (désactivé avec sa raison), état du dernier lancement, confirmation
function relaunchBlock(node) {
  const p = relaunchPlanOf(node), ok = !!(p && p.ok);
  const why = relaunchWhy(node);
  const sess = ok ? (snap.sessions || []).find((x) => x.id === p.session) : null;
  const run = p && p.session ? (snap.runs || {})[p.session] : null;
  const note = relaunchNote.get(node);
  return h('div', { class: 'relaunch' },
    h('div', { class: 'hnext' },
      h('button', { class: 'hbtn primary', disabled: ok ? null : 'disabled', title: ok ? t('relaunch.tip') : why,
        onclick: () => { relaunchConfirm = node; renderMapDetail(true); } }, t('relaunch.btn')),
      !ok ? h('span', { class: 'muted' }, why) : null,
      run ? runLine(run) : null,
      note ? h('span', { class: `hnote ${note.cls}` }, note.text) : null),
    ok && sess && relaunchConfirm === node ? relaunchConfirmBox(node, sess) : null);
}
async function relaunchSend(node) {
  let r = null, j = {};
  try {
    r = await fetch('/api/relaunch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project: snap.projectId, target: node, confirm: true }) });
    j = await r.json().catch(() => ({}));
    relaunchNote.set(node, r.ok ? { text: t('relaunch.started'), cls: 'ok' }
      : { text: j.reason && Object.hasOwn(DICT.en, `relaunch.reason.${j.reason}`) ? t(`relaunch.reason.${j.reason}`) : t('relaunch.err', { code: r.status }), cls: 'bad' });
  } catch (e) { relaunchNote.set(node, { text: t('human.unreachable'), cls: 'bad' }); }
  relaunchConfirm = null;
  renderMapDetail(true);
}

// --- écrire un message à une session (issue #25) : champ, confirmation, état. Même plan et mêmes refus que la relance
//     (relaunchPlanOf) ; la page n'envoie que le projet, le nœud, la confirmation et le texte : le serveur résout le reste ---
let msgOpen = null; // id du nœud dont le champ est ouvert
let msgConfirm = null; // { node, text } : message dont la confirmation est ouverte (texte figé à la vérification)
const msgDraft = new Map(); // id de nœud -> texte saisi (gardé quand le panneau se reconstruit)
const msgNote = new Map(); // id de nœud -> { text, cls } (retour du serveur)
const MSG_MAX = 4000; // doit correspondre à MESSAGE_MAX_CHARS (lib.cjs)
// raison affichée pour un nœud qui ne reçoit pas de message ; '' si l'envoi est possible
function msgWhy(node) {
  const p = relaunchPlanOf(node);
  return p && p.reason === 'alive' ? t('msg.reason.alive') : relaunchWhy(node);
}
// message d'erreur du serveur : raison connue, texte trop long ou vide, sinon code HTTP
function msgErr(j, status) {
  if (j.reason && Object.hasOwn(DICT.en, `relaunch.reason.${j.reason}`)) return j.reason === 'alive' ? t('msg.reason.alive') : t(`relaunch.reason.${j.reason}`);
  if (j.error === 'large') return t('msg.tooLong');
  if (j.error === 'text') return t('msg.empty');
  return t('msg.err', { code: status });
}
// boîte de confirmation : projet, session, dossier, commande exacte, mention ajoutée, texte (affiché comme texte)
function msgConfirmBox(node, sess) {
  const text = msgConfirm.text;
  const mode = (snap.relaunch && snap.relaunch.mode) || '';
  const cmd = ['claude', '-p', '--resume', sess.claudeSessionId, '--output-format', 'json', ...(mode ? ['--permission-mode', mode] : [])].join(' ');
  const row = (k, v) => h('div', { class: 'wrow' }, h('span', { class: 'wk' }, t(k)), h('span', { class: 'wv' }, v));
  const by = node.startsWith('a:') ? t('msg.byAgent', { a: node.slice(2) }) : sess.kind === 'workflow' ? t('msg.byWorkflow', { w: tr(sess.name) || sess.id }) : '';
  return h('div', { class: 'where rlconfirm' }, h('div', { class: 'wt' }, t('msg.title')),
    row('relaunch.project', tr(snap.project.name)), row('relaunch.session', tr(sess.name)), row('relaunch.dir', snap.project.dir || ''),
    row('relaunch.cmd', h('code', { class: 'mono' }, cmd)),
    h('div', { class: 'muted' }, t('msg.len', { n: [...text].length })),
    by ? h('div', { class: 'muted' }, by) : null,
    h('pre', { class: 'msgpreview' }, text),
    h('div', { class: 'muted' }, t('msg.note')),
    h('div', { class: 'acts' },
      h('button', { class: 'hbtn ok', onclick: () => msgSend(node) }, t('msg.send')),
      h('button', { class: 'hbtn', onclick: () => { msgConfirm = null; renderMapDetail(true); } }, t('msg.cancel'))));
}
// champ de saisie : vérifier le message ouvre la confirmation (le texte est figé à cet instant)
function msgForm(node, sess) {
  const area = h('textarea', { class: 'msgtext', rows: '4', maxlength: String(MSG_MAX), 'aria-label': t('msg.label'),
    oninput: (e) => { msgDraft.set(node, e.target.value); } }, msgDraft.get(node) || '');
  const check = h('button', { class: 'hbtn ok', onclick: () => {
    const text = msgDraft.get(node) || '';
    if (!text.trim()) msgNote.set(node, { text: t('msg.empty'), cls: 'bad' });
    else msgConfirm = { node, text };
    renderMapDetail(true);
  } }, t('msg.check'));
  return h('div', { class: 'msgform' }, h('label', null, t('msg.label'), area), check,
    msgConfirm && msgConfirm.node === node ? msgConfirmBox(node, sess) : null);
}
// bloc d'écriture d'un nœud : bouton (désactivé avec sa raison), état du dernier lancement, champ, confirmation
function msgBlock(node) {
  const p = relaunchPlanOf(node), ok = !!(p && p.ok);
  const sess = ok ? (snap.sessions || []).find((x) => x.id === p.session) : null;
  const run = p && p.session ? (snap.runs || {})[p.session] : null;
  const note = msgNote.get(node);
  return h('div', { class: 'relaunch msgblock' },
    h('div', { class: 'hnext' },
      h('button', { class: 'hbtn primary', disabled: ok ? null : 'disabled', title: ok ? t('msg.tip') : msgWhy(node),
        onclick: () => { msgOpen = msgOpen === node ? null : node; msgConfirm = null; renderMapDetail(true); } }, t('msg.btn')),
      !ok ? h('span', { class: 'muted' }, msgWhy(node)) : null,
      run ? runLine(run) : null,
      note ? h('span', { class: `hnote ${note.cls}` }, note.text) : null),
    ok && sess && msgOpen === node ? msgForm(node, sess) : null);
}
async function msgSend(node) {
  const text = msgConfirm && msgConfirm.node === node ? msgConfirm.text : '';
  let r = null, j = {};
  try {
    r = await fetch('/api/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project: snap.projectId, target: node, confirm: true, text }) });
    j = await r.json().catch(() => ({}));
    if (r.ok) { msgDraft.delete(node); msgOpen = null; msgNote.set(node, { text: t('msg.sent'), cls: 'ok' }); }
    else msgNote.set(node, { text: msgErr(j, r.status), cls: 'bad' });
  } catch (e) { msgNote.set(node, { text: t('human.unreachable'), cls: 'bad' }); }
  msgConfirm = null;
  renderMapDetail(true);
}

function renderMapDetail(force) {
  const el = $('mapDetail');
  const d = mapSel && mapInfo.get(mapSel);
  if (!d) { el.hidden = true; el.replaceChildren(); placeMapDetail(); return; }
  el.hidden = false;
  const nd = bubbleMap && bubbleMap.nodes.get(mapSel);
  el.setAttribute('aria-label', t('d.dialog', { n: (nd && nd.n.label) || d.name || d.label || '' }));
  // champ « Écrire » : sa saisie et sa sélection survivent à la reconstruction du panneau (le texte est dans msgDraft)
  const act = document.activeElement, draftSel = act && el.contains(act) && act.classList.contains('msgtext') ? [act.selectionStart, act.selectionEnd] : null;
  const list = mapBlocks.get(mapSel) || [];
  const box = list.length ? blocksBox(mapSel, list, force) : null;
  // le bloc d'étapes garde son élément (focus et sélection préservés) : seul le reste du panneau est reconstruit
  const put = (...kids) => {
    for (const c of [...el.childNodes]) if (c !== box) c.remove();
    el.prepend(...kids.flat().filter((k) => k != null && k !== false));
    if (box && box.parentNode !== el) el.append(box);
  };
  const close = h('button', { class: 'f', onclick: () => closeMapDetail(true) }, t('d.close'));
  const table = (head, rows) => h('div', { class: 'scroll' }, h('table', null, h('tr', null, head.map((x) => h('th', null, x))), rows));
  const toolCell = (u) => u ? h('span', null, h('span', { class: `tool ${u.tool}` }, u.tool), ' ', h('span', { class: 'mono' }, fit(u.what, 90)), u.refused || u.blocked ? h('span', { class: 'c-bad' }, t('d.refusedShort')) : null) : h('span', { class: 'muted' }, '—');
  const stTxt = { running: ['st.running', 'c-ok'], done: ['st.done', 'c-muted'], failed: ['st.failed', 'c-bad'], silent: ['st.silent', 'c-warn'] };
  if (d.type === 'agent') {
    const inst = d.y.inst.slice().sort((a, b) => ((b.status === 'running') - (a.status === 'running')) || b.mtime - a.mtime);
    put(
      h('div', { class: 'dh' }, h('b', null, d.name), d.def ? h('span', { class: 'badge info' }, t('d.installed')) : h('span', { class: 'badge warn' }, t('d.auto')),
        d.def && d.def.model ? h('span', { class: 'badge' }, t('d.fixed', { m: d.def.model })) : d.def ? h('span', { class: 'badge' }, t('d.inherit')) : null,
        h('span', { class: 'sp' }), close),
      d.def && d.def.description ? h('div', { class: 'desc' }, d.def.description) : null,
      inst.some((x) => x.status === 'failed' || x.status === 'silent') ? relaunchBlock(mapSel) : null,
      msgBlock(mapSel),
      inst.length ? table([t('d.state'), t('d.model'), t('d.task'), t('d.by'), t('d.lastTool'), t('d.activity')], inst.map((x) => {
        const [l, c] = stTxt[x.status] ? [t(stTxt[x.status][0]), stTxt[x.status][1]] : [x.status, 'c-muted'];
        const lr = x.lastRefusal && Date.now() - x.lastRefusal.t < REFUSAL_MS;
        return h('tr', null,
          h('td', null, h('span', { class: c }, '● ', l), lr ? h('div', { class: 'c-bad' }, t('d.refused'), fit(x.lastRefusal.reason || x.lastRefusal.what, 120)) : null),
          h('td', null, h('b', { style: `color:${modelColor(x.model)}` }, shortModel(x.model) || t('d.unknown')), x.alias ? h('div', { class: 'muted' }, t('d.asked', { a: x.alias })) : null),
          h('td', null, x.description || '—', x.workflow ? h('div', { class: 'muted mono' }, x.workflow) : null),
          h('td', null, x.ownerName),
          h('td', null, toolCell((x.tools || [])[(x.tools || []).length - 1])),
          h('td', { class: 'muted' }, ago(new Date(x.mtime))));
      })) : h('div', { class: 'muted' }, d.y.total6h ? t('d.noInst', { n: d.y.total6h }) : t('d.notRun')));
  } else if (d.type === 'session') {
    const s = d.s, a = d.a;
    const evs = (snap.activity || []).filter((e) => e.session === s.id).slice(0, 12);
    const model = (a && a.model) || s.model || '';
    put(
      h('div', { class: 'dh' }, h('b', null, tr(s.name)), h('span', { class: 'kind' }, kindTxt(s)), !s.human ? h('span', { class: 'chip' }, s.id) : null,
        s.status ? statusBadge(s.status) : null, model ? h('span', { class: 'badge', style: `color:${modelColor(model)}` }, shortModel(model)) : null, h('span', { class: 'sp' }), close),
      h('div', { class: 'desc' }, [s.phase ? t('d.phase', { p: s.phase }) : '', s.mode ? t('d.mode', { m: s.mode }) : '', (s.inProgress || []).length ? t('d.inprog', { x: s.inProgress.join(', ') }) : '',
        s.waitingFor ? t('d.waits', { x: s.waitingFor }) : '', s.blockedReason ? t('d.blocked', { x: s.blockedReason }) : '', a ? t('d.subs', { n: a.agentCount || 0 }) : ''].filter(Boolean).join(' · ') || '—'),
      s.status === 'blocked' ? relaunchBlock(mapSel) : null,
      msgBlock(mapSel),
      evs.length ? table([t('d.time'), t('d.who'), t('d.tool')], evs.map((e) => h('tr', null, h('td', { class: 'mono muted' }, hhmmss(e.ts)), h('td', null, e.agent || t('d.theSession')), h('td', null, toolCell(e)))))
        : h('div', { class: 'muted' }, t('d.noTools')));
  } else if (d.type === 'tool') {
    const S = d.S;
    put( h('div', { class: 'dh' }, h('b', null, d.label), h('span', { class: 'badge' }, t('d.nActions', { n: S.n })), h('span', { class: 'sp' }), close),
      relaunchBlock(mapSel),
      msgBlock(mapSel),
      S.events.length ? table([t('d.time'), t('d.who'), t('d.call')], S.events.slice(0, 15).map((e) => h('tr', null, h('td', { class: 'mono muted' }, new Date(e.t).toLocaleTimeString(loc())), h('td', null, e.who), h('td', null, toolCell(e)))))
        : h('div', { class: 'muted' }, t('d.nothing10')));
  } else if (d.type === 'human') {
    const items = (snap.inbox || {}).items || [];
    const freeList = (mapBlocks.get('in:human') || []).filter((x) => !progressOf(x).done); // tâches sans rattachement à faire (même compte que le badge du nœud)
    put( h('div', { class: 'dh' }, h('b', null, t('m.you')), h('span', { class: 'sp' }), close),
      relaunchBlock(mapSel),
      msgBlock(mapSel),
      freeList.length ? h('div', null, t('d.tasks'), ' ', freeList.map((x) => tr(x.title)).join(' · ')) : null,
      items.length ? items.map((l) => h('div', { class: 'row' }, tr(l.text))) : h('div', { class: 'muted' }, tr((snap.inbox || {}).hint) || t('inbox.empty')));
  } else if (d.type === 'quota') {
    const u = snap.usage;
    put( h('div', { class: 'dh' }, h('b', null, t('m.quota')), h('span', { class: 'sp' }), close),
      relaunchBlock(mapSel),
      u && u.windows && u.windows.length ? u.windows.map((w) => h('div', null, `${tr(w.label)} : ${Math.round(w.percent)} %`)) : h('div', { class: 'muted' }, tr((snap.hints || {}).usage) || t('q.empty')));
  } else if (d.type === 'more') {
    put( h('div', { class: 'dh' }, h('b', null, d.label), h('span', { class: 'sp' }), close), d.items.map((x) => h('div', { class: 'row' }, x)));
  } else if (d.type === 'watch') {
    const f = snap.feed || { items: [] };
    put( h('div', { class: 'dh' }, h('b', null, tr(f.title) || t('feed.title')), h('span', { class: 'sp' }), close),
      relaunchBlock(mapSel),
      f.items.slice(0, 16).map((l) => h('div', { class: 'row mono' }, [l.ts, tr(l.chip), tr(l.text), l.note].filter(Boolean).join('  '))));
  }
  if (draftSel) { const ta = el.querySelector('.msgtext'); if (ta) { ta.focus({ preventScroll: true }); try { ta.setSelectionRange(draftSel[0], draftSel[1]); } catch {} } }
  placeMapDetail();
}

// --- connexion temps réel (Server-Sent Events, reconnexion automatique), un flux par projet ---
let lastMsg = 0, es = null;
function resetView() {
  snap = null; mapSel = null; lastDone = null; lastDoneNode = null; lastTasks = []; mapBlocks = new Map(); curByNode.clear(); blkCache = { sig: '', el: null };
  pktSeen = new Set(); pktReady = false; stepNotes.clear(); relaunchNote.clear(); relaunchConfirm = null; msgDraft.clear(); msgNote.clear(); msgOpen = null; msgConfirm = null; lastMsg = 0;
  if (bubbleMap) { bubbleMap.storeKey = null; for (const [, r] of bubbleMap.nodes) r.g.remove(); bubbleMap.nodes.clear(); for (const [, r] of bubbleMap.edges) r.g.remove(); bubbleMap.edges.clear(); bubbleMap.gP.replaceChildren(); }
  for (const id of ['journal', 'alerts', 'quotas', 'mapDetail']) fill($(id));
  $('mapDetail').hidden = true;
  $('mapLink').toggleAttribute('hidden', true); $('mapWrap').style.minHeight = ''; popFor = null;
}
function connect() {
  if (es) es.close();
  es = new EventSource(`/events${projectId ? `?p=${encodeURIComponent(projectId)}` : ''}`);
  es.addEventListener('snapshot', (ev) => {
    lastMsg = Date.now();
    const s = JSON.parse(ev.data);
    if (s.projectId && projectId && s.projectId !== projectId && snap) return; // ancien flux
    snap = s;
    if (s.projectId && s.projectId !== projectId) { projectId = s.projectId; history.replaceState(null, '', `?p=${projectId}`); }
    setConn(true); render(); renderProjects();
  });
  es.addEventListener('projects', (ev) => { try { projects = JSON.parse(ev.data) || []; } catch { projects = []; } renderProjects(); });
  es.onopen = () => setConn(true);
  es.onerror = () => setConn(false);
}
function switchProject(id) {
  if (!id || id === projectId) return;
  projectId = id;
  history.replaceState(null, '', `?p=${id}`);
  resetView(); setConn(false, true); connect();
}
function setConn(ok, waiting) {
  const c = $('conn');
  if (ok) { c.className = 'badge ok'; fill(c, h('span', { class: 'dot live' }), t('conn.live')); }
  else if (waiting) { c.className = 'badge warn'; fill(c, h('span', { class: 'dot' }), t('conn.wait')); }
  else { c.className = 'badge bad'; fill(c, h('span', { class: 'dot' }), t('conn.lost')); }
}
const renderUpdated = () => { if (snap) $('updated').textContent = lastMsg ? t('updated', { ago: ago(new Date(lastMsg)) }) : ''; };
setInterval(renderUpdated, 5000);
// les liens s'éteignent 30 s après le dernier échange, même sans nouvel instantané ;
// le panneau de détail n'est reconstruit qu'à un nouvel instantané ou à un clic (sa position de défilement reste)
function renderDiagrams(withDetail = true) {
  if (!snap || snap.error) return;
  try { renderMap(withDetail); } catch (e) { console.error(e); }
}
setInterval(() => renderDiagrams(false), 1000);
$('projSel').addEventListener('change', (e) => switchProject(e.target.value));
$('langBtn').addEventListener('click', () => {
  lang = LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length];
  try { localStorage.setItem('orch-lang', lang); } catch {}
  renderStatic(); if (bubbleMap) bubbleMap.hk = '';
  if (snap) { setConn(true); render(); renderUpdated(); }
});
// textes des adaptateurs installés (chaînes seulement), ajoutés au dictionnaire sans remplacer ceux de la page
async function loadAdapterTexts() {
  try {
    const r = await fetch('/api/i18n');
    const j = r.ok ? await r.json() : {};
    for (const [l, d] of Object.entries(j || {})) {
      if (!Object.hasOwn(DICT, l) || !d || typeof d !== 'object') continue;
      for (const [k, v] of Object.entries(d)) if (typeof v === 'string' && !Object.hasOwn(DICT[l], k)) DICT[l][k] = v;
    }
  } catch {}
}
renderStatic(); setConn(false, true);
loadAdapterTexts().then(connect);
