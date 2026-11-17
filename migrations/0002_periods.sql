-- Périodes (ex. PFA : période de forte activité, pas de livraison).
-- Remplace l'ancien membre fictif « PFA », dont les jours d'absence marquaient la période.

CREATE TABLE periods (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  start_date  TEXT NOT NULL,
  end_date    TEXT NOT NULL CHECK (end_date >= start_date),
  color       TEXT NOT NULL DEFAULT '#e5534b',
  description TEXT NOT NULL DEFAULT ''
);
CREATE INDEX periods_dates_idx ON periods (start_date, end_date);

-- Reprise du membre « PFA » s'il existe : une période du premier au dernier jour marqué absent
INSERT INTO periods (name, start_date, end_date, color, description)
SELECT 'PFA', MIN(date), MAX(date),
       COALESCE((SELECT color FROM roles WHERE name = 'PFA'), '#e5534b'),
       'Période de forte activité : pas de livraison'
  FROM attendance WHERE person = 'PFA' AND present < 1
HAVING COUNT(*) > 0;

DELETE FROM members WHERE person = 'PFA';
DELETE FROM roles WHERE name = 'PFA';
