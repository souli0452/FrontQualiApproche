# ⚡ Intercepteurs HTTP (`src/app/core/interceptors`)

## 🎯 Rôle et Responsabilité
Intercepte et traite toutes les requêtes et réponses HTTP sortantes et entrantes de l'application.

## 📄 Fichiers contenus
- **`auth.interceptor.ts`** :
  - Assure l'envoi des cookies sécurisés (`withCredentials: true`).
  - Gère le rafraîchissement automatique du token JWT en cas d'erreur 401 avec file d'attente (mutex `isRefreshing`).
- **`licence.interceptor.ts`** :
  - Intercepte les erreurs HTTP 402 (licence suspendue/expirée).
  - Déclenche une notification d'avertissement et recharge l'état de licence en arrière-plan.
- **`loader.interceptor.ts`** :
  - Déclenche et arrête le loader global pour les requêtes modifiant les données (POST, PUT, DELETE).
  - Ignore les requêtes GET (qui utilisent des skeletons visuels) ou annotées avec l'en-tête `X-Skip-Loader`.
- **`index.ts`** : Barrel export permettant d'importer directement depuis `@core/interceptors`.

## ⚙️ Configuration
Tous les intercepteurs sont déclarés sous forme de `HTTP_INTERCEPTORS` multi-fournisseurs dans `src/app.config.ts`.
