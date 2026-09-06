# 🖥️ Layout Global de l'Application (`src/app/core/layout`)

## 🎯 Rôle et Responsabilité
Contient la structure visuelle principale de l'application (le "Shell" applicatif) : barre supérieure, menu latéral rétractable, gestion du thème sombre/clair, bandeau de licence et de réglages obligatoires.

## 📄 Sous-dossiers & Fichiers
- **`component/`** :
  - **`app.layout.ts`** : Le composant conteneur principal intégrant le sidebar, la topbar et la zone `<router-outlet>`.
  - **`app.topbar.ts`** : Barre supérieure (recherche globale, profil, notifications, bascule de thème, déconnexion).
  - **`app.sidebar.ts`** : Barre latérale avec bouton de repliage responsive.
  - **`app.menu.ts`** & **`app.menuitem.ts`** : Navigation dynamique basée sur les habilitations et abonnements de l'utilisateur.
  - **`app.reglages-requis.ts`** : Boîte de dialogue imposée au premier lancement si des réglages obligatoires (ex: contact RQ) manquent.
- **`service/`** :
  - **`layout.service.ts`** : Gestion réactive (Signals & Effects Angular) de l'état du menu, du mode sombre/clair et des thèmes PrimeNG.
- **Note sur les sous-layouts métier** :
  - Les layouts avec sous-onglets métier sont logés directement dans leurs modules respectifs (ex: `src/app/features/non-conformite/layout/`).
  - Seul le shell global (topbar, sidebar, menu) réside dans `core/layout`.

## 📌 Utilisation
```typescript
import { AppLayout } from './app/core/layout/component/app.layout';
```
