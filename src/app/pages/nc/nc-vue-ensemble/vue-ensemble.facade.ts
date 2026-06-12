import { Injectable } from '@angular/core';
import { ProcNonConformiteService } from '../../../services/non-conformite/proc-non-conformite.service';
import { NonConformiteService } from '../../../services/non-conformite/non-conformite.service';
import { RoleService } from '../../../services/non-conformite/role.service';
import { forkJoin, map } from 'rxjs';
import { EtapeTraitement } from '../../../enums';

import { styleEvolutionDatasets } from '../../../utils/non-conformite/nc-utils';


@Injectable({
  providedIn: 'root'
})
export class NcVueEnsembleFacade {

  constructor(
    private procService: ProcNonConformiteService,
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

  private extractNcResponses(res: any) {

    return {
      allUserNcs: this.extractArray(res.userNcsRes),
      allImputations: this.extractArray(res.imputationsRes),
      allReceptions: this.extractArray(res.receptionRes),
      allValidationRq: this.extractArray(res.validationRqRes),
      allAffectations: this.extractArray(res.affectationRes),
      allValidationPilotes: this.extractArray(res.validationPiloteRes),
      allClotures: this.extractArray(res.clotureRes),
      allNcNonTraiter: this.extractArray(res.ncNonTraiterRes),
      allNcNonConformiteCloturee: this.extractArray(res.nonConformiteClotureeRes)
    };
  }

  private buildUserNcRequests(user: any, roleService: RoleService, userStructure: any): any {

  const requests: any = {
    userNcsRes: this.nonConformiteService.getNCByUserPaged(user.userId),
    imputationsRes: this.procService.findImputedByUserId(user.userId),
    ncNonTraiterRes: this.procService.getPlanActions(user.email, "NON_TRAITER")
  };

  if ((roleService.isChef && userStructure?.id) || roleService.isRQ) {

    requests.receptionRes =
      this.nonConformiteService.nonConformiteParEtape(
        EtapeTraitement.RECEPTION,
        userStructure.id
      );
    console.log("receptionRes : ",requests.receptionRes);

    requests.affectationRes =
      this.procService.getNonConformiteByEtapeAndOrigin(
        EtapeTraitement.IMPUTATION,
        userStructure.id
      );

    requests.validationPiloteRes =
      this.procService.getNonConformiteByEtapeAndOrigin(
        EtapeTraitement.VALIDATION,
        userStructure.id
      );
  }

  if (roleService.isRQ) {
    requests.validationRqRes =
      this.procService.getNonConformiteByEtape(
        EtapeTraitement.VALIDATION_RS
      );

    requests.clotureRes =
      this.procService.getNonConformiteByEtape(
        EtapeTraitement.SUIVI_RQ
      );

    requests.nonConformiteClotureeRes =
      this.procService.getNonConformiteByEtape(
        EtapeTraitement.CLOTURE
      );
  }

  return requests;
}

private populateData(data: any) {

  const userNcs = this.safeArray(data.allUserNcs);
  const imputations = this.safeArray(data.allImputations);

  const receptions = data.allReceptions && data.allReceptions.length > 0 
    ? data.allReceptions 
    : imputations.filter((imp: any) => imp?.etatTraitement === EtapeTraitement.RECEPTION);

  return {
    brouillonData: userNcs.filter((nc: any) => nc?.status === 'DRAFT'),
    imputationsData: imputations.filter((imp: any) => imp?.etatTraitement === EtapeTraitement.TRAITEMENT),
    receptionData: receptions,
    affectationData: this.safeArray(data.allAffectations),
    validationPiloteData: this.safeArray(data.allValidationPilotes),
    validationRqData: this.safeArray(data.allValidationRq),
    clotureData: this.safeArray(data.allClotures),
    nonConformiteClotureeData: this.safeArray(data.allNcNonConformiteCloturee),
    nonTraiterData: this.safeArray(data.allNcNonTraiter)
  };
}

private enrichNonTraiterData(data: any, nonTraiterData: any[]) {

  const allNCs = [
    ...this.safeArray(data.allUserNcs),
    ...this.safeArray(data.allImputations),
    ...this.safeArray(data.allReceptions),
    ...this.safeArray(data.allValidationRq),
    ...this.safeArray(data.allAffectations),
    ...this.safeArray(data.allValidationPilotes),
    ...this.safeArray(data.allClotures)
  ];

  return nonTraiterData.map((planAction: any) => {
    if (!planAction) return planAction; // Sécurité
    const relatedNC = allNCs.find(
      (nc: any) =>
        (planAction.numeroNc != null && nc?.numeroReference === planAction.numeroNc) ||
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


loadUserNcData(user: any, roleService: RoleService, userStructure: any) {

  const requests = this.buildUserNcRequests(user, roleService, userStructure);

  return forkJoin(requests).pipe(
    map((res: any) => {
      
      const raw = this.extractNcResponses(res);
      console.log("################## `RAW` : ", raw);
      
      const processed = this.populateData(raw);
      console.log("################## `processed` : ", processed);
      
      const enrichedNonTraiter =
        this.enrichNonTraiterData(raw, processed.nonTraiterData);

      console.log("DATA VUE ENSEMBLE FACADE : ", enrichedNonTraiter);

      return {
        ...processed,
        nonTraiterData: enrichedNonTraiter
      };
    })
  );
}




loadEvolutionStats(annee: number, mois?: number, structureId?: string) {

  return this.procService.getNcEvolution(annee, mois, structureId).pipe(
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