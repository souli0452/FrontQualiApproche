# 🔐 Authentification & Session (`src/app/core/auth`)

## 🎯 Rôle et Responsabilité
Ce module gère le cycle de vie de la session utilisateur, l'interaction avec le service d'authentification Keycloak et l'évaluation synchrone des permissions de l'utilisateur connecté.

## 📄 Fichiers contenus
- **`auth.service.ts`** : Service central d'authentification (connexion, déconnexion, rafraîchissement de token, lecture du profil `/me`, gestion des utilisateurs).
- **`auth.state.ts`** : `currentUserState` (`BehaviorSubject`), stocke les données de l'utilisateur et ses habilitations en mémoire vive (RAM).
- **`auth-utils.ts`** : Fonctions utilitaires rapides et synchrones pour vérifier les droits :
  - `hasAnyPermission(...)`
  - `hasAllPermissions(...)`
  - `isUserInRoles(...)`
  - `isModuleSubscribed(...)`
  - `accesAutorise(...)`
- **`index.ts`** : Barrel export permettant d'importer directement depuis `@core/auth`.

## 📌 Exemple d'utilisation
```typescript
import { AuthService, hasAnyPermission } from '@core/auth';
```
