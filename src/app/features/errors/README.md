# ⚠️ Feature Errors (`src/app/features/errors`)

## 🎯 Rôle et Responsabilité
La feature `errors` regroupe les écrans d'état et d'erreur HTTP de l'application :
- **`notfound/`** : Page 404 affichée lorsqu'une route demandée n'existe pas ou a été déplacée (interception par la wildcard `**`).
- **`access-denied/`** : Page 403 affichée lorsqu'un utilisateur tente d'accéder à une ressource pour laquelle il n'a pas les permissions requises.

## 📂 Organisation
```text
src/app/features/errors/
├── pages/
│   ├── notfound/
│   │   └── notfound.component.ts   # Page 404
│   ├── access-denied/
│   │   └── access-denied.component.ts # Page 403
│   └── index.ts
├── README.md
└── index.ts
```

## 📌 Utilisation
```typescript
import { NotFoundComponent, Notfound, AccessDeniedComponent } from '@features/errors';
```
