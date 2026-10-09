# Écarts Front / Back — Module Gestion des Audits

Relevé au cours de la phase d'alignement (Phase 1).
À vérifier et corriger en coordination avec l'équipe back-end.

---

## Écart 1 — URL du référentiel RQAPBF

**Fichier back-end** `AuditUrls.java` déclare :
```
/api/v1/referentiel-rqapbf
```
**Classe contrôleur** utilise :
```
/api/audit/referentiel-rqapbf
```

**Front configuré sur** : `EVALUATION_SERVICE/referentiel-rqapbf`
→ `/evaluation-service/api/v1/referentiel-rqapbf`

**Action** : confirmer l'URL réelle via les logs de démarrage du service.

---

## Écart 2 — Champs `typeAuditId` vs valeur enum TypeAudit

Le front passe encore des valeurs enum (`INTERNE`, `EXTERNE`, …) dans le filtre
`typeAuditId` (Phase 1, temporaire). Le back attend un UUID.

**Action** : Phase 6 — charger les types d'audit depuis `/types-audit` et utiliser les vrais IDs.

---

## Écart 3 — Tableau de bord : détail par statut

L'interface `TableauDeBord` contient `planifies`, `enPreparation`, `enCours`,
`clotures`, `tauxCloture` ajoutés côté front pour rétrocompatibilité avec le
template. Le back-end renvoie `auditsPlanifies`, `auditsRealises`, `tauxRealisation`.

**Action** : vérifier le DTO `TableauDeBordResponse` du back-end et consolider
les noms de champs des deux côtés.

---

## Écart 4 — Plan d'audit : URL non confirmée

Le front appelle `GET /plans-audit?auditId=…` et `POST /plans-audit`.
L'URL exacte n'est pas documentée dans `AuditUrls.java` — à confirmer.

---

## Écart 5 — Signatures : URL non confirmée

Le front appelle `GET /signatures-audit?auditId=…`.
À confirmer que le contrôleur est bien mappé sur `/signatures-audit`.

---

## Couverture endpoints

| Contrôleur           | Méthodes front             | Statut  |
|----------------------|----------------------------|---------|
| AuditController      | CRUD + cycle de vie + rapport | ✅ Phase 1 |
| ConstatController    | CRUD + 3 états + preuves   | ✅ Phase 1 |
| PlanAuditController  | CRUD + partager + fichier  | ✅ Phase 1 |
| SignatureController  | liste + signer + refuser   | ✅ Phase 1 |
| ChecklistAudit       | CRUD                        | ✅ Phase 1 |
| AuditeurController   | CRUD                        | ✅ Phase 1 |
| EvalAuditeur         | CRUD                        | ✅ Phase 1 |
| EvalRQAPBF           | get + notations + publier  | ✅ Phase 1 |
| ReferentielRQAPBF    | get                         | ✅ Phase 1 (URL à confirmer — Écart 1) |
| TypesAudit/Constat   | get                         | ✅ Phase 1 |
| Sites                | get                         | ✅ Phase 1 |
