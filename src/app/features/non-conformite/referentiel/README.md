# Référentiel - Non-Conformité (`features/non-conformite/referentiel/`)

## Rôle du dossier
Ce dossier regroupe les tables de référence, taxonomies et données de classification propres au module **Non-Conformité** (SMQ / Qualité).

## Contenu
- **`origine-nc/`** :
  - `origine-nc.component.ts` : Gestion des sources/origines des non-conformités (ex: Interne, Fournisseur, Audit, Réclamation client).
- **`niveau-nc/`** :
  - `niveau-nc.component.ts` : Gestion des niveaux de gravité/criticité (ex: Mineur, Majeur, Critique) avec couleur et score d'impact.
- *(Optionnel)* **`action-nc/`** :
  - Types d'actions correctives / préventives associées aux non-conformités.

## Fichiers
- `index.ts` : Barrel export pour simplifier l'import depuis `@features/non-conformite/referentiel`.
