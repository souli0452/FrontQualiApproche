/**
 * @deprecated Ce fichier sert de pont de compatibilité rétroactive (barrel).
 * Les énumérations ont été dispatchées selon leurs domaines respectifs :
 * - `EtapeTraitement`, `NonConformStatus` -> `@features/non-conformite/models`
 * - `ModuleAbonnement`, `StatusEnum`, `TypeStructure` -> `@core/enums` (ou `@core`)
 */

export { EtapeTraitement, NonConformStatus } from '../features/non-conformite/models';
export { ModuleAbonnement, StatusEnum, TypeStructure } from '../core/enums';
