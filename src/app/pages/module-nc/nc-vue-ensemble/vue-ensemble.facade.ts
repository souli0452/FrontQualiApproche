import { Injectable } from '@angular/core';
import { ProcNonConformiteService } from '../../../services/non-conformite/proc-non-conformite.service';
import { NonConformiteService } from '../../../services/non-conformite/non-conformite.service';
import { RoleService } from '../../../services/non-conformite/role.service';
import { forkJoin, map } from 'rxjs';
import { EtapeTraitement } from '../../../enums/enums';

import { styleEvolutionDatasets } from '../../../utils/non-conformite/nc-utils';


@Injectable({
  providedIn: 'root'
})
export class NcVueEnsembleFacade {

  constructor(
    private nonConformiteService: NonConformiteService,
  ) {}


  private safeArray(data: any): any[] {
    // Avant : return Array.isArray(data) ? data : [];
    return Array.isArray(data) ? data.filter(item => item != null) : [];
  }

  private extractArray(resPart: any): any[] {
    if (!resPart) return [];
    
    if (Array.isArray(resPart)) return this.safeArray(resPart);

    // Cas HttpResponse (ex: imputationsRes) -> resPart.body.data.content
    if (resPart.body) {
        if (Array.isArray(resPart.body)) return this.safeArray(resPart.body);
        if (resPart.body.data && Array.isArray(resPart.body.data.content)) {
            return this.safeArray(resPart.body.data.content);
        }
    }

    // Cas ApiResponse standard (ex: receptionRes) -> resPart.data.content
    if (resPart.data && Array.isArray(resPart.data.content)) {
        return this.safeArray(resPart.data.content);
    }

    return [];
  }

  private enrichRejectionFlag(ncList: any[]): any[] {
    const STEP_ORDER: Record<string, number> = {
      'SOUMISSION': 1,
      'RECEPTION': 2,
      'VALIDATION_RQ': 3,
      'IMPUTATION': 4,
      'TRAITEMENT': 5,
      'VALIDATION': 6,
      'VALIDATION_RS': 7,
      'SUIVI_RQ': 8,
      'CLOTURE': 9,

      // Support des codes numériques du moteur de workflow
      '1': 1, // SOUMISSION
      '2': 2, // RECEPTION
      '3': 3, // VALIDATION_RQ
      '4': 4, // IMPUTATION
      '5': 5, // TRAITEMENT
      '6': 6, // VALIDATION
      '7': 7, // VALIDATION_RS
      '8': 8, // SUIVI_RQ
      '9': 9  // CLOTURE
    };

    return this.safeArray(ncList).map((nc: any) => {
      if (!nc || nc.status === 'DRAFT' || nc.status === 'Brouillon') return nc;

      const currentOrder = STEP_ORDER[nc.etatDeTraitement || ''] || 0;
      const saisies = nc.workflowState?.saisies || [];
      const docRejetId = nc.docRejet?.id?.toLowerCase();
      const docRejetNom = (nc.docRejet?.nom || nc.docRejet?.nomFichier || '').toLowerCase();

      const rejectionSaisie = saisies.find((s: any) => {
        const val = (s.value || '').toLowerCase();
        const fieldName = (s.fieldName || '').toLowerCase();
        const fieldLabel = (s.fieldLabel || '').toLowerCase();

        return fieldName.includes('rejet') ||
               fieldLabel.includes('rejet') ||
               fieldName === 'docrejet' ||
               (docRejetId && val.includes(docRejetId)) ||
               (docRejetNom && val.includes(docRejetNom));
      });

      let isRejected = false;
      if (rejectionSaisie) {
        const rejectOrder = STEP_ORDER[rejectionSaisie.stepCode || ''] || 0;
        if (rejectOrder > currentOrder) {
          isRejected = true;
        }
      }

      if (!isRejected && nc.etatDeTraitement === 'SOUMISSION' && nc.status !== 'DRAFT') {
        isRejected = true;
      }

      if (isRejected) {
        return { ...nc, rejeter: true };
      }
      return nc;
    });
  }

  private extractNcResponses(res: any) {
    return {
      aTraiter: this.enrichRejectionFlag(this.extractArray(res.aTraiterRes)),
      allUserNcs: this.enrichRejectionFlag(this.extractArray(res.userNcsRes)),
      allNcNonTraiter: this.extractArray(res.ncNonTraiterRes)
    };
  }

  /**
   * Les non-conformités que l'utilisateur a à traiter, et l'état de ses propres plans d'action.
   *
   * <p>Le croisement rôle × étape que composait ce fichier — chef et RQ voient la réception, le RQ
   * seul voit la validation RS et la clôture… — dupliquait en TypeScript les habilitations que le
   * circuit porte déjà. Les deux tables divergeaient sans que rien ne le signale : un utilisateur
   * voyait des dossiers que le moteur lui refusait ensuite, et manquait ceux qu'un circuit remanié
   * lui avait confiés. Le serveur les désigne maintenant, et lui seul.</p>
   */
  private buildUserNcRequests(user: any): any {
    return {
      aTraiterRes: this.nonConformiteService.nonConformiteATraiter(),
      userNcsRes: this.nonConformiteService.nonConformiteParUtilisateurGetPagination(user.userId),
      // Les actions correctives que le circuit ouvre à l'utilisateur, et non celles qu'un
      // croisement « mon courriel × statut NON_TRAITER » lui attribuait : ce dernier ignorait les
      // actions revenues chez le pilote pour vérification ou ré-attribution.
      ncNonTraiterRes: this.nonConformiteService.planActionsATraiter()
    };
  }

  /**
   * Répartit dans les onglets les dossiers que le moteur a désignés, selon l'étape où ils se
   * trouvent.
   *
   * <p>Le regroupement reste sur l'étape de traitement : c'est ce que les onglets affichent. Mais
   * il ne décide plus de rien — un dossier absent de la liste n'apparaît nulle part, quelle que
   * soit son étape.</p>
   */
  private repartirParEtape(aTraiter: any[]) {
    const parEtape = (etape: EtapeTraitement) =>
      this.safeArray(aTraiter).filter((nc: any) => nc?.etatDeTraitement === etape);

    return {
      receptionData: parEtape(EtapeTraitement.RECEPTION),
      rejectByRqData: parEtape(EtapeTraitement.RECEPTION),
      // Validation du responsable qualité : c'est là qu'il valide le signalement et désigne la
      // structure qui le traitera. Sans cet onglet, les dossiers qu'il doit affecter n'apparaissent
      // nulle part et le circuit s'arrête après la réception.
      validationRqAffectationData: parEtape(EtapeTraitement.VALIDATION_RQ),
      affectationData: parEtape(EtapeTraitement.IMPUTATION),
      validationPiloteData: parEtape(EtapeTraitement.VALIDATION),
      validationRqData: parEtape(EtapeTraitement.VALIDATION_RS),
      clotureData: parEtape(EtapeTraitement.SUIVI_RQ),
      nonConformiteClotureeData: parEtape(EtapeTraitement.CLOTURE),
      imputationsData: parEtape(EtapeTraitement.TRAITEMENT),
      soumissionData: parEtape(EtapeTraitement.SOUMISSION)
    };
  }

  private populateData(data: any) {
    return {
      // Les brouillons restent ceux de l'utilisateur : un dossier qu'il n'a pas soumis n'est
      // encore entré dans aucun circuit, le moteur n'a donc rien à en dire.
      brouillonData: this.safeArray(data.allUserNcs).filter((nc: any) => nc?.status === 'DRAFT'),
      nonTraiterData: this.safeArray(data.allNcNonTraiter),
      ...this.repartirParEtape(data.aTraiter)
    };
  }

  private enrichNonTraiterData(data: any, nonTraiterData: any[]) {

  const allNCs = [
    ...this.safeArray(data.aTraiter),
    ...this.safeArray(data.allUserNcs)
  ];

  return nonTraiterData.map((planAction: any) => {
    if (!planAction) return planAction; // Sécurité
    const relatedNC = allNCs.find(
      (nc: any) =>
        (planAction.numeroNc != null && (nc?.numeroDeReference === planAction.numeroNc || nc?.numeroDeReference === planAction.numeroNc)) ||
        (planAction.nonConformeId != null && nc?.id === planAction.nonConformeId)
    );

      if (relatedNC?.niveauNonConformiteLibelle) {
        return {
          ...planAction,
          niveauNonConformiteLibelle: relatedNC.niveauNonConformiteLibelle
        };
      }

      return planAction;
    });
  }


  /**
   * Signature inchangée : les écrans appelants passent encore le rôle et la structure, dont la
   * liste de travail n'a plus besoin — c'est le circuit qui décide. Les retirer aurait obligé à
   * reprendre chaque appelant dans le même changement.
   */
  loadUserNcData(user: any, _roleService?: RoleService, _userStructure?: any) {

    const requests = this.buildUserNcRequests(user);

    return forkJoin(requests).pipe(
      map((res: any) => {
        const raw = this.extractNcResponses(res);
        const processed = this.populateData(raw);
        const enrichedNonTraiter =
          this.enrichNonTraiterData(raw, processed.nonTraiterData);
        return {
          ...processed,
          allUserNcs: raw.allUserNcs,
          nonTraiterData: enrichedNonTraiter
        };
      })
    );
  }

  loadEvolutionStats(annee: number, mois?: number, structureId?: string) {

    return this.nonConformiteService.nonConformiteEvolutionGet(annee, mois, structureId).pipe(
      map((response: any) => {

        const stats = response.body.data;
        const backendChartData = stats.chartData;

        const styledDatasets = styleEvolutionDatasets(
          backendChartData.datasets
        );

        const chartData = {
          labels: backendChartData.labels,
          datasets: styledDatasets
        };

        const critiqueObj = stats.gravites.find((g: any) => g.nom === 'Critique');
        const majeureObj = stats.gravites.find((g: any) => g.nom === 'Majeure');
        const mineureObj = stats.gravites.find((g: any) => g.nom === 'Mineure');

        return {
          chartData,
          evolutionTotal: stats.totalEvolution,
          evolutionPourcentage: stats.pourcentageEvolution,
          countCritique: critiqueObj ? critiqueObj.count : 0,
          countMajeure: majeureObj ? majeureObj.count : 0,
          countMineure: mineureObj ? mineureObj.count : 0
        };
      })
    );
  }



}