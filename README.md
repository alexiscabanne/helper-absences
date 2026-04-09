# helper-absences

Application web de suivi des présences/absences pour 2026. Permet de suivre les jours de présence de chaque membre de l'équipe sur les jours ouvrés.

## Prérequis

- [Node.js](https://nodejs.org/) v18 ou supérieur

## Installation

```bash
npm install
```

## Initialisation de la base de données

La base `conges.db` **n'est pas incluse dans le dépôt** — elle est créée automatiquement au premier démarrage du serveur.

```bash
node server.js
```

Au démarrage, si `conges.db` n'existe pas, le serveur la crée avec les tables vides (`attendance`, `members`, `roles`). L'application est alors prête à l'emploi avec une équipe et des données vierges.

### Repartir d'une base vierge

Si vous souhaitez réinitialiser complètement les données :

```bash
# Arrêter le serveur, puis :
rm conges.db
node server.js
```

> **Note :** Le bouton "Reset" dans l'interface est désactivé (le code de réinitialisation est commenté dans `server.js`). La seule façon de remettre à zéro est de supprimer `conges.db` et de redémarrer.

## Démarrage

```bash
node server.js
```

Puis ouvrir [http://localhost:3100](http://localhost:3100) dans le navigateur.

Le port peut être surchargé via la variable d'environnement `PORT` :

```bash
PORT=8080 node server.js
```

## Utilisation

- **Ajouter un membre** : menu déroulant "Personne" → "+ Personne"
- **Renommer un membre** : double-cliquer sur son nom dans sa carte
- **Gérer les rôles** (ajout, renommage, couleur, suppression) : "⚙ Rôles" dans le menu déroulant
- **Basculer une présence** : cliquer sur un jour dans la grille d'une carte

## Structure

```
index.html        — Interface (HTML + JS)
styles.css        — Styles CSS
server.js         — Serveur Express + SQLite (sql.js)
conges.db         — Base SQLite locale (ignorée par git, créée au démarrage)
package.json
```

## Plage de dates

Du **16 mars 2026** au **31 décembre 2026**, jours ouvrés uniquement (hors week-ends et jours fériés français).
