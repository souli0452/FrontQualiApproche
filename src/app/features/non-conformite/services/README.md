# Services - Non-Conformité (`features/non-conformite/services/`)

## Rôle du dossier
Ce dossier centralise l'ensemble des services Angular gérant la logique métier, les appels API HTTP et l'état réactif propres au module **Non-Conformité**.

## Services inclus

### 1. Cœur métier & Workflow
- **`non-conformite.service.ts`** : Service central de gestion des fiches de non-conformité :
  - Opérations CRUD et recherche multi-critères avec pagination serveur (`rechercher`).
  - Déclarations, mises à jour, transitions d'étapes de validation.
  - Gestion des flux de notifications et compteurs (`notificationsNC$`).
- **`action-corrective-preventive.service.ts`** : Gestion des actions correctives / préventives rattachées aux non-conformités.
- **`plan-action.service.ts`** : Gestion des plans d'action et téléversement de justificatifs de traitement.
- **`piece-jointe-fichier.service.ts`** : Téléchargement, visualisation et suppression des fichiers / pièces jointes.
- **`proc-non-conformite.service.ts`** : Traitement des étapes et processus de validation.

### 2. Habilitations & Rôles
- **`role.service.ts`** : Détermine dynamiquement le rôle de l'utilisateur dans le cadre du traitement des non-conformités :
  - `isRQ` : Responsable Qualité
  - `isChef` : Pilote / Chef d'action
  - `isAgent` : Agent traitant

### 3. Référentiels NC
- **`type-non-conformite.service.ts`** : CRUD pour les Origines / Sources de non-conformité.
- **`niveau-non-conformite.service.ts`** : CRUD pour les Niveaux de gravité.
- **`action-non-conformite.service.ts`** : CRUD pour les Types d'actions.

## Utilisation
Grâce à l'alias TypeScript défini dans `tsconfig.json`, ces services s'importent directement via :
```typescript
import { NonConformiteService, RoleService } from '@features/non-conformite/services';
```
