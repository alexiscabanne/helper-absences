# helper-absences

Application web de suivi des présences/absences d'une équipe, sur une ou plusieurs années, avec un serveur MCP pour que des agents puissent consulter et modifier les congés (aide aux plannings).

## Architecture

Tout tourne sur Cloudflare :

- **Deux Workers, même code** (`src/`) et même base :
  - `helper-absences` (`wrangler.jsonc`) : l'interface (`public/`) et l'API `/api/*` ;
  - `helper-absences-mcp` (`wrangler.mcp.jsonc`) : le serveur MCP `/mcp`.

  Sur une adresse `*.workers.dev`, Cloudflare Access protège tout le Worker : le MCP a donc sa propre adresse, hors Access.
- **D1** (base SQLite de Cloudflare, liaison `DB`) : tables `members`, `roles`, `attendance`, `periods`, plus `attendance_archive` (lignes purgées) et `changes` (journal des modifications). Schéma dans `migrations/`.
- **Sécurité** :
  - l'interface et `/api/*` sont protégées par **Cloudflare Access** (le Worker vérifie aussi le jeton Access) ;
  - le Worker MCP n'est pas derrière Access et est protégé par un **jeton** (`Authorization: Bearer <MCP_TOKEN>`).

## Prérequis

- Node.js v18 ou supérieur
- Un compte Cloudflare

```bash
npm install
```

## Développement local

1. Créer `.dev.vars` (ignoré par git) :

   ```
   MCP_TOKEN=<jeton aléatoire>
   DEV_SKIP_ACCESS=1
   ```

   `DEV_SKIP_ACCESS=1` saute la vérification Cloudflare Access, et uniquement sur `localhost`.

2. Créer la base locale et (optionnel) importer l'ancienne base SQLite :

   ```bash
   npm run db:migrate:local
   node scripts/sqlite-to-d1.mjs conges.db import.sql
   npx wrangler d1 execute helper-absences --local --file import.sql
   ```

3. Lancer :

   ```bash
   npm run dev
   npm run dev:mcp
   ```

   Interface sur http://localhost:8787, MCP sur http://localhost:8788/mcp (même base locale).

## Mise en production

```bash
npx wrangler login
npx wrangler d1 create helper-absences      # reporter le database_id dans wrangler.jsonc
npm run db:migrate:remote
npx wrangler d1 execute helper-absences --remote --file import.sql   # import initial, une seule fois
npx wrangler secret put MCP_TOKEN -c wrangler.mcp.jsonc
npm run deploy                               # déploie les deux Workers
```

Renseigner ensuite `ACCESS_TEAM_DOMAIN` et `ACCESS_AUD` dans `wrangler.jsonc` (section `vars`) et redéployer. Tant qu'ils sont vides, l'API répond 503.

### Cloudflare Access

1. **Workers & Pages → helper-absences → Settings → Domains & Routes** : activer Cloudflare Access sur `workers.dev` (uniquement pour ce Worker, pas pour `helper-absences-mcp`).
2. Dans **Zero Trust → Access → Applications**, régler la policy **Allow** de l'application créée (par exemple *Include → Emails* avec la connexion *One-time PIN*, qui accepte toute adresse).
3. Copier l'**Application Audience (AUD) Tag** dans `ACCESS_AUD`, et `https://<équipe>.cloudflareaccess.com` dans `ACCESS_TEAM_DOMAIN`, puis `npm run deploy`.

## Serveur MCP

Endpoint : `https://helper-absences-mcp.<compte>.workers.dev/mcp` (Streamable HTTP, sans session), en-tête `Authorization: Bearer <MCP_TOKEN>`.

Ajout dans Claude Code :

```bash
claude mcp add --transport http absences https://helper-absences-mcp.<compte>.workers.dev/mcp --header "Authorization: Bearer <MCP_TOKEN>"
```

| Outil | Rôle |
|---|---|
| `get_calendar` | Date du jour, plage de données, années couvertes |
| `list_members` | Équipe et rôles |
| `list_holidays` | Jours fériés d'une année |
| `get_attendance` | Absences, demi-journées et provisoires par personne sur une période |
| `get_stats` | Présents / absents / taux par personne et pour l'équipe |
| `team_availability` | Qui est présent chaque jour (93 jours max) |
| `find_common_availability` | Jours où un groupe de personnes est entièrement présent |
| `list_recent_changes` | Journal des modifications |
| `list_periods` | Périodes de l'équipe (ex. PFA : pas de livraison) sur une plage |
| `set_attendance` | Fixe présent / demi-journée / absent (éventuellement provisoire) sur des dates ou une période |
| `save_period` / `delete_period` | Crée, modifie ou supprime une période |

`team_availability` indique les périodes de chaque jour. `find_common_availability` peut exclure des périodes (`avoid_periods: ["PFA"]`).

Chaque modification (web ou MCP) est enregistrée dans la table `changes`.

## Utilisation de l'interface

- **Ajouter un membre** : menu déroulant "Personnes" → "+ Personne"
- **Modifier un membre** (nom, rôle, suppression) : ✎ à côté de son nom dans le menu "Personnes" ou sur sa carte (ou double-clic sur le nom)
- **Gérer les périodes** (ex. PFA, période de forte activité sans livraison) : "🚩 Périodes" dans le menu "Personnes". Les périodes s'affichent au-dessus des cartes et soulignent les jours concernés dans les calendriers.
- **Gérer les rôles** : "⚙ Rôles" dans le menu déroulant
- **Basculer une présence** : clic sur un jour (Présent → Absent ; tout autre état → Présent)
- **Choisir un état** (demi-journée, absence provisoire…) : clic droit sur un jour
- **Modifier une plage** : MAJ+clic sur le premier jour, MAJ+clic sur le dernier, puis clic droit pour choisir l'état de tous les jours ouvrés sélectionnés (Échap annule la sélection)
- **Créer l'année suivante** : "📅 Années & historique" → "Créer l'année" (tout le monde présent sur les jours ouvrés)
- **Supprimer l'historique** : même fenêtre → date → "Supprimer". Les présences avant cette date passent dans `attendance_archive`.

Les jours fériés français sont calculés pour chaque année (Pâques, Ascension et Pentecôte comprises). La plage affichée est celle des données présentes en base.

## Structure

```
public/                  — Interface (index.html, styles.css)
src/worker.js            — Point d'entrée du Worker (routage, authentification)
src/api.js               — Routes /api/*
src/mcp.js               — Serveur MCP
src/auth.js              — Vérification Cloudflare Access et jeton MCP
src/db.js                — Requêtes D1
src/calendar.js          — Jours fériés et jours ouvrés
migrations/              — Schéma D1
scripts/sqlite-to-d1.mjs — Conversion de l'ancienne base conges.db
wrangler.jsonc           — Worker de l'interface et de l'API
wrangler.mcp.jsonc       — Worker du serveur MCP
```
