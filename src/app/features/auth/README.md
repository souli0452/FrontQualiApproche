# 🔐 Feature Auth (`src/app/features/auth`)

## 🎯 Rôle et Responsabilité
La feature `auth` regroupe l'ensemble des interfaces et formulaires liés à l'identité, la connexion et le compte utilisateur :
- Page de connexion (avec gestion des rôles, redirection post-login et boîte de dialogue OTP).
- Page d'édition de profil utilisateur (informations personnelles, rattachement organisationnel, modification de mot de passe).
- Parcours de réinitialisation de mot de passe.
- Vérification d'adresse courriel.
- Page d'accès refusé (403 / Access Denied).

## 📂 Organisation du dossier
```text
src/app/features/auth/
├── models/
│   ├── auth.model.ts              # LoginRequest, AuthData, UserResponse, UserInfos
│   └── index.ts
├── services/
│   └── index.ts                   # Réexport des services de @core/auth (AuthService, currentUserState)
├── pages/
│   ├── login/                     # Formulaire de connexion & challenge OTP
│   ├── profil/                    # Consultation et mise à jour du profil utilisateur
│   ├── reset-password/            # Réinitialisation du mot de passe
│   ├── email-verification/        # Validation du courriel
│   ├── access-denied/             # Écran d'accès non autorisé
│   └── index.ts
├── auth.routes.ts                 # Déclaration des routes du module auth
├── README.md                      # Documentation du feature
└── index.ts                       # Barrel export principal
```

## 🔗 Liens avec le Core
La logique technique singleton (stockage des jetons JWT, intercepteurs HTTP, garde `AuthGuard`) réside dans `src/app/core/auth/`. 
Le module `features/auth/` s'appuie sur ce socle pour offrir l'interface graphique aux utilisateurs.

## 📌 Utilisation
```typescript
import { 
    LoginComponent, 
    ProfilComponent, 
    ResetPasswordComponent, 
    EmailVerificationComponent 
} from '@features/auth';
```
