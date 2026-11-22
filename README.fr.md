# orchestrator-dashboard

*[English](README.md)*

Un tableau de bord web local, en temps réel, pour les **orchestrateurs d'agents IA**. Il montre ce que fait ton orchestrateur en ce moment et, quand il a besoin de toi, te guide **une étape à la fois**.

- **Carte en direct** : sessions → agents → outils, reliés par des liens animés. Chaque échange réel (commande, appel d'outil, lancement d'agent, rapport, refus) part en paquet étiqueté. Elle montre le modèle de chaque agent, marque les agents créés automatiquement, et ses bulles se déplacent.
- **À toi d'agir** : chaque blocage qui attend un humain devient une tâche guidée. Chaque étape dit *où* agir (lien exact, fichier local ouvert à la bonne ligne, ou commande à copier), avec un bouton par action.
- **Sessions, activité en direct, quotas, workflows, journal, consignes en attente, événements.**
- **Plusieurs projets** dans une seule page (sélecteur de projet), interface **en français et en anglais**.
- **N'importe quel orchestrateur** : un fichier JSON à écrire, ou un petit adaptateur. Tous les langages et frameworks conviennent.
- **Sans dépendance** (Node.js 18+), **en lecture seule**, servi uniquement sur `127.0.0.1`.

## Installation (sans git ni compte GitHub)

Les adresses `v1.0.0` ci-dessous ne fonctionnent qu'une fois l'étiquette `v1.0.0` publiée (avant cela, définis `ORCH_DASHBOARD_REF` sur une branche). L'installeur télécharge une version figée en HTTPS (Node.js 18+ requis) et ajoute une commande `orchestrator-dashboard`, qui remplace `node server.cjs` ci-dessous. Ne le fais pas passer dans un shell : télécharge le script, vérifie-le, lis-le, puis exécute-le.

Windows (PowerShell) :

```powershell
irm https://raw.githubusercontent.com/Zeldious-Studio-Company/orchestrator-dashboard/v1.0.0/install.ps1 -OutFile install.ps1
Get-Content install.ps1        # lire le script
.\install.ps1
```

macOS / Linux :

```bash
curl -fsSL -o install.sh https://raw.githubusercontent.com/Zeldious-Studio-Company/orchestrator-dashboard/v1.0.0/install.sh
less install.sh                # lire le script
sh install.sh
```

Si une somme SHA256 est publiée pour la version, passe-la pour vérifier l'archive téléchargée avant toute installation : `ORCH_DASHBOARD_SHA256=<somme>` (PowerShell : `$env:ORCH_DASHBOARD_SHA256 = '<somme>'`). L'installeur s'arrête à la moindre différence.

Options : `ORCH_DASHBOARD_REF` (tag ou branche, par défaut `v1.0.0`), `ORCH_DASHBOARD_DIR` (dossier d'installation). Windows uniquement : le dossier de la commande n'est ajouté au PATH utilisateur que si tu définis `ORCH_DASHBOARD_ADD_PATH=1`. Sous macOS / Linux, l'installeur ne modifie jamais ton profil shell.

L'installeur ne remplace un dossier existant que s'il contient `server.cjs` et un `package.json` nommé `orchestrator-dashboard` ; sinon il s'arrête sans rien modifier. Pour mettre à jour, relance l'installeur avec un `ORCH_DASHBOARD_REF` plus récent.

## Démarrage rapide

```bash
git clone https://github.com/Zeldious-Studio-Company/orchestrator-dashboard.git
cd orchestrator-dashboard
node server.cjs start examples      # projet de démonstration ; affiche l'URL (http://127.0.0.1:4870/?p=…)
node server.cjs stop
```

## Brancher ton orchestrateur

Ton orchestrateur écrit `.orchestrator-dashboard.json` à la racine de son projet, et le réécrit à chaque changement (exemple dans le [README anglais](README.md#plug-in-your-orchestrator)). Ensuite :

```bash
node server.cjs start /chemin/du/projet
```

Le format complet (sessions, agents, activité, phases, quotas, tâches, traductions) et l'écriture d'un adaptateur sont décrits dans **[FORMAT.fr.md](FORMAT.fr.md)**. Pour démarrer, pars de l'exemple complet dans [`examples/`](examples/.orchestrator-dashboard.json).

**Avec Claude Code** : donne le `claudeSessionId` d'une session, et le tableau de bord lit son modèle, ses sous-agents et leurs outils dans les transcripts locaux de Claude Code (en lecture seule).

## Commandes

| Commande | Effet |
| --- | --- |
| `node server.cjs start [dossier] [port]` | inscrit le dossier (s'il est donné) et lance le serveur en arrière-plan |
| `node server.cjs add <dossier> [adaptateur] [fichier]` | inscrit un projet sans rien lancer |
| `node server.cjs remove <dossier>` | retire un projet du sélecteur |
| `node server.cjs list` / `adapters` | projets inscrits / adaptateurs installés |
| `node server.cjs status` / `url [dossier]` / `stop` | état du serveur, adresse de la page, arrêt |
| `node server.cjs snapshot <dossier>` | affiche l'instantané lu (pour vérifier ton fichier) |

**Réglages** : `~/.claude/orchestrator-dashboard/config.json` (`{ "port": 4870, "editorUrl": "vscode://file{path}:{line}" }`), ou les variables `ORCH_DASHBOARD_PORT`, `ORCH_DASHBOARD_EDITOR` et `ORCH_DASHBOARD_HOME`.

## Sécurité

- Le serveur n'écoute que sur `127.0.0.1` et refuse les autres en-têtes `Host` (DNS rebinding) et les origines étrangères.
- Les fichiers des projets ne sont jamais considérés comme sûrs. Chaque champ est vérifié et tronqué, les liens doivent être en `http(s)`, et les chemins locaux doivent exister dans le projet. Tout est rendu en texte.
- La seule action possible depuis la page : montrer dans l'explorateur le fichier ou le dossier d'une étape. Elle passe par une référence, jamais par un chemin, et aucun fichier n'est exécuté.
- Les adaptateurs ne sont chargés que depuis le dossier `adapters/` du tableau de bord.

## Licence

[MIT](LICENSE)
