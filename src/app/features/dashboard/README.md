# Feature Dashboard (`features/dashboard/`)

## Rôle du dossier
Ce dossier regroupe la logique, les composants et la vue du **tableau de bord principal (Accueil de l'application)**.

Plutôt que d'afficher des graphiques déconnectés du contexte de l'utilisateur, ce tableau de bord est conçu pour répondre directement à la question fondamentale :  
**« Qu'attend-on de moi aujourd'hui ? »**

---

## Responsabilités & Organisation

1. **`pages/`** :
   - `dashboard.component.ts` : Page d'accueil principale. Affiche la salutation personnalisée, la structure de l'utilisateur et coordonne l'état de chargement et le décompte global des dossiers en attente.

2. **`components/`** :
   - `mes-decisions.component.ts` : Liste consolidée et réactive des dossiers attendant une décision immédiate de l'utilisateur (demandes documentaires, non-conformités, plans d'actions). Permet de passer les étapes directement via les actions workflow.
   - `indicateurs.component.ts` : Indicateurs clés (KPIs) calculés et filtrés selon les droits et modules souscrits de l'utilisateur (dossiers en attente, retards de traitement, retards de révision documentaire, volume du fonds documentaire).
   - `actions-rapides.component.ts` : Tuiles d'accès direct aux fonctionnalités fréquentes (déclarer une NC, ajouter un document, etc.), affichées uniquement si l'utilisateur possède les permissions requises.

---

## Intégration
Le tableau de bord est branché à la racine de la zone connectée dans `src/app.routes.ts` :
```typescript
import { DashboardComponent as Dashboard } from '@features/dashboard';

{ path: '', component: Dashboard, title: 'Tableau de bord' }
```
