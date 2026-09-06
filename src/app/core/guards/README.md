# 🛡️ Guards de Navigation (`src/app/core/guards`)

## 🎯 Rôle et Responsabilité
Protège les routes de l'application Angular avant qu'un composant ne soit instancié.

## 📄 Fichiers contenus
- **`auth.guard.ts`** : Vérifie qu'une session active existe (`getMe()`). Si l'utilisateur n'est pas connecté, il est redirigé vers `/login?returnUrl=...`.
- **`permission.guard.ts`** : Contrôle les permissions déclarées dans les routes (`data.permissions` et `data.module`). Empêche l'accès direct par URL à une page non autorisée.
- **`index.ts`** : Barrel export permettant d'importer directement depuis `@core/guards`.

## 📌 Exemple d'utilisation
```typescript
import { AuthGuard, permissionGuard } from '@core/guards';

{
    path: 'circuits',
    component: CircuitsListeComponent,
    canActivate: [permissionGuard],
    data: { permissions: ['workflow-read', 'workflow-write'] }
}
```
