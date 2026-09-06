# Non-Conformité - Layout (`features/non-conformite/layout/`)

## Rôle du dossier
Ce dossier contient le composant de **layout secondaire (sous-menu / onglets)** dédié au module **Non-Conformité**.

## Responsabilités
- **Navigation par onglets** : Affiche les onglets principaux du module :
  - *Vue d'ensemble* (`/non-conformite/vue-ensemble`)
  - *Traitement & Suivi* (`/non-conformite/traitement-suivi`) avec badge dynamique de notifications
  - *Mes Non-Conformités publiées* (`/non-conformite/publiees`)
- **Fil d'Ariane (Breadcrumbs)** : Fournit le contexte de navigation hiérarchique.
- **Header contextuel** : En-tête de section pour le module.
- **Outlet** : Contient un `<router-outlet>` pour afficher les pages filles du module.

## Fichiers
- `non-conformite-layout.component.ts` : Contrôleur gérant les abonnements aux notifications, le calcul des badges et les routes actives.
- `non-conformite-layout.component.html` : Structure de présentation (Header, TabMenu / onglets, router-outlet).
- `non-conformite-layout.component.scss` : Styles spécifiques à la barre d'onglets et aux badges.
- `index.ts` : Barrel export pour simplifier les imports.
