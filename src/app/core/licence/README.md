# 📜 Module Licence (`src/app/core/licence`)

## 🎯 Rôle et Responsabilité
Le sous-module `licence` est responsable de la gestion du cycle de vie de la licence de l'installation QualiSira. 
Il contrôle la validité des abonnements, l'ouverture/fermeture des modules fonctionnels et fournit l'interface d'administration permettant de visualiser les droits et d'installer une nouvelle clé de licence.

## 📂 Organisation du dossier
```text
src/app/core/licence/
├── models/
│   ├── etat-licence.model.ts    # Interface EtatLicence (statut, modules ouverts, échéance, jours restants)
│   └── index.ts                 # Barrel export des modèles
├── services/
│   ├── licence.service.ts       # Service singleton de lecture et installation de la licence
│   ├── licence.service.spec.ts  # Tests unitaires
│   └── index.ts                 # Barrel export des services
├── pages/
│   ├── licence.component.ts     # Page d'administration de la licence (route '/licence')
│   └── index.ts                 # Barrel export des pages
├── README.md                    # Cette documentation
└── index.ts                     # Barrel export global de @core/licence
```

## ⚙️ Composants satellites liés à la Licence
Pour assurer un contrôle fluide dans toute l'application :
- **Intercepteur HTTP** (`src/app/core/interceptors/licence.interceptor.ts`) : Intercepte les erreurs HTTP `402 Payment Required` émises par la passerelle backend lors d'actions tentées avec une licence expirée, et affiche un toast explicite.
- **Directive partagée** (`src/app/shared/licence/licence-ouverte.directive.ts`) : Directive `*siLicenceOuverte` permettant de désactiver dynamiquement des boutons d'actions si la licence est expirée ou restreinte.
- **Modal de renouvellement** (`src/app/shared/licence/licence-dialog.component.ts`) : Dialogue d'activation / installation de licence déclenchable globalement (ex: à la connexion ou via la topbar).

## 📌 Utilisation
Tous les éléments peuvent être importés via le barrel `@core` ou `@core/licence` :
```typescript
import { LicenceService, EtatLicence, LicenceComponent } from '@core/licence';
```
