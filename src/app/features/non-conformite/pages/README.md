# Pages - Non-Conformité (`features/non-conformite/pages/`)

## Rôle du dossier
Ce dossier contient les composants d'écrans principaux (pages routables) du module **Non-Conformité**.

## Pages incluses

### 1. `vue-ensemble/`
- **Route** : `/non-conformite/vue-ensemble`
- **Composant** : `NcVueEnsembleComponent`
- **Rôle** : Tableau de bord central du module. Affiche les KPIs globaux, graphiques d'évolution mensuelle/annuelle, badges dynamiques et tableau des dossiers selon les filtres.
- **Fichiers** : `vue-ensemble.component.ts`, `vue-ensemble.component.html`, `vue-ensemble.component.scss`, `vue-ensemble.facade.ts`.

### 2. `traitement-suivi/`
- **Route** : `/non-conformite/traitement-suivi`
- **Composant** : `NCTraitementSuiviComponent`
- **Rôle** : Écran opérationnel du moteur de workflow. Permet aux pilotes, agents et responsables qualité de traiter les étapes actives (réception, analyse, imputation, validation, clôture).
- **Fichiers** : `traitement-suivi.component.ts`, `traitement-suivi.component.html`, `traitement-suivi.component.scss`.

### 3. `nc-publiees/`
- **Route** : `/non-conformite/publiees`
- **Composant** : `NcPublieesComponent`
- **Rôle** : Espace personnel de consultation des fiches de non-conformités déclarées et publiées par l'agent connecté.
- **Fichiers** : `nc-publiees.component.ts`, `nc-publiees.component.html`.

### 4. `declaration/`
- **Routes** : `/non-conformite/create` (création) et `/non-conformite/edit/:id` (modification) — alias `/declaration` conservé pour rétrocompatibilité.
- **Composant** : `NcComposeComponent`
- **Rôle** : Formulaire de déclaration initiale d'une non-conformité avec rattachement de processus, criticité, pièces jointes et choix de soumission directe au pilote ou d'enregistrement en brouillon.
- **Fichiers** : `declaration.component.ts`, `declaration.component.html`, `declaration.component.scss`.

## Utilisation
Les pages sont exposées via `index.ts` et peuvent être importées proprement :
```typescript
import { 
    NcVueEnsembleComponent, 
    NCTraitementSuiviComponent, 
    NcPublieesComponent, 
    NcComposeComponent 
} from '@features/non-conformite/pages';
```
