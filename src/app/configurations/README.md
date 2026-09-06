# Module Configurations (`src/app/configurations/`)

## Rôle du dossier
Ce dossier constitue le **hub central de configuration globale** de l'application.  
Il fournit le **layout conteneur à onglets** accessible via la route `/configurations` (appelé notamment depuis le menu latéral principal et la barre supérieure) pour regrouper les paramètres organisationnels et la configuration transverse des circuits de workflow.

---

## Responsabilités

1. **Navigation unifiée par onglets (`p-tabs`)** :
   - **Réglages de l'organisation** (`/configurations/config-systeme`) : Coordonnées de l'organisme, logo, courriels de notification système, responsable qualité, etc.
   - **Circuits de validation** (`/configurations/circuits`) : Liste, création, édition et détail des workflows transverses.
   - **Catalogue des Étapes** (`/configurations/etapes-circuit`) : Modèles d'étapes de circuit réutilisables.
   - **Modèles d’e-mail** (`/configurations/modeles-email`) : Gabarits d'e-mails liés aux étapes et transitions de workflow.

2. **Sécurité et contrôle d'accès (`permissionGuard`)** :
   - Protège l'accès à la section en vérifiant que l'utilisateur détient au moins l'une des permissions de configuration (`config-global-read`, `workflow-read`, etc.).
   - Chaque route fille restreint ensuite l'accès selon les droits précis requis.

3. **Conteneur dynamique** :
   - Embarque un `<router-outlet>` qui permet d'afficher les pages filles sans recharger le layout ni perdre le contexte de navigation.
   - Maintient l'onglet actif synchronisé avec l'URL en cours (`NavigationEnd`).

---

## Distinction avec les autres modules

Pour garder une architecture modulaire et découplée :
- **Utilisateurs & Rôles** : Gérés dans `src/app/features/gestion-utilisateurs/`.
- **Organigramme & Structures** (Directions, Services, Catégories de processus) : Gérés dans `src/app/features/organigramme/`.
- **Référentiels métiers** : Les référentiels spécifiques sont logés dans leurs modules respectifs (`@features/non-conformite/referentiel`, `@features/gestion-documentaire/referentiel`).

---

## Fichiers du dossier

- **`configurations.component.ts`** : Contrôleur du composant layout (onglets, écouteur d'URL, fil d'Ariane, et alias de rétrocompatibilité `ParametragesComponent`).
- **`configurations.component.html`** : Gabarit d'affichage avec `app-header-page`, barre d'onglets `p-tabs` et zone `<router-outlet>`.
- **`configurations.component.scss`** : Styles associés au conteneur.
- **`configurations.routes.ts`** : Définition des routes filles sous `/configurations`.
- **`index.ts`** : Barrel export facilitant l'import via `@configurations`.
