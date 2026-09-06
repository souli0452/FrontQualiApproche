# 📁 Core Module (`src/app/core`)

## 🎯 Rôle et Responsabilité
Le dossier `core` regroupe l'infrastructure technique, la sécurité, le socle transversal et les services singletons indispensables au fonctionnement global de la plateforme QualiSira.

## ✅ Ce qu'il DOIT contenir
- **`auth/`** : Services d'authentification, gestion du token JWT Keycloak, état de la session courante (`AuthService`, `currentUserState`).
- **`guards/`** : Protection des routes (`auth.guard.ts`, `permission.guard.ts`).
- **`interceptors/`** : Intercepteurs HTTP (injection de token JWT, gestion des refus 402 de licence, loader global).
- **`enums/`** : Énumérations transversales de la plateforme (`ModuleAbonnement`, `StatusEnum`, `TypeStructure`).
- **`layout/`** : Squelette visuel de navigation de l'application (barre supérieure `app.topbar`, menu `app.menu`, réglages requis).
- **`licence/`** : Gestion système de la licence logicielle (modèles d'état, `LicenceService`, écran d'administration `/licence`).

## ⛔ Ce qu'il NE DOIT PAS contenir
- ❌ **Composants d'interface génériques réutilisables** (boutons, badges, dialogues partagés) ➔ à placer dans `shared/`.
- ❌ **Logique métier spécifique** (gestion des documents, non-conformités, workflow, utilisateurs) ➔ à placer dans leurs modules respectifs sous `features/`.

## ⚠️ Règle d'or
Tout ce qui se trouve dans `core/` est transversal et n'est instancié qu'**une seule fois** (services singletons ou configuration globale).
