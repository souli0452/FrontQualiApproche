import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { QualiUrlConfig } from './quali-url-configs';
import {
  EmailTemplateDto,
  ResourceType,
  ValidationHistoryDto,
  WorkflowDto,
  WorkflowInstanceDto,
  WorkflowStateDto,
  WorkflowValidationRequestDto
} from '../models/workflow.model';

/**
 * Erreur métier renvoyée par workflow-service, telle qu'un écran peut la présenter.
 *
 * Le service répond en 4xx explicites avec un message rédigé pour l'utilisateur (« Ce dossier a
 * changé d'étape entre-temps », « Champ(s) obligatoire(s) non renseigné(s) : … »). Les remonter
 * tels quels vaut mieux que le « Une erreur est survenue » générique qui les masquait.
 */
export interface WorkflowError {
  status: number;
  message: string;
  /** Le dossier a bougé sous les pieds de l'utilisateur : l'écran doit se recharger. */
  estPerime: boolean;
  /** L'utilisateur n'a pas l'habilitation : inutile de lui reproposer l'action. */
  estInterdit: boolean;
}

/**
 * Point d'accès unique à workflow-service.
 *
 * Deux services concurrents coexistaient — `services/workflow.service` et
 * `services/module-gestion-documentaire/workflow.service` — visant la même API avec des dépliages
 * de réponse différents, l'un attendant une enveloppe `ApiResponse` que ce service n'applique pas
 * à ses succès. Tout est regroupé ici.
 */
@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private readonly http = inject(HttpClient);

  private readonly workflowsUrl = QualiUrlConfig.WORKFLOW_ROOT_URL;
  private readonly emailTemplatesUrl = QualiUrlConfig.EMAIL_TEMPLATE_URL;

  /** Le serveur refuse au-delà : la consultation groupée est bornée dès l'appelant. */
  static readonly TAILLE_LOT_MAX = 200;

  // -------------------------------------------------------------- configuration des circuits

  getAllWorkflows(): Observable<WorkflowDto[]> {
    return this.http.get<WorkflowDto[]>(this.workflowsUrl).pipe(
      map((circuits) => circuits ?? []),
      catchError(this.enErreurMetier)
    );
  }

  getWorkflowById(id: string): Observable<WorkflowDto> {
    return this.http.get<WorkflowDto>(`${this.workflowsUrl}/${id}`).pipe(catchError(this.enErreurMetier));
  }

  getWorkflowsByType(resourceType: ResourceType | string): Observable<WorkflowDto[]> {
    return this.http.get<WorkflowDto[]>(`${this.workflowsUrl}/type/${resourceType}`).pipe(
      map((circuits) => circuits ?? []),
      catchError(this.enErreurMetier)
    );
  }

  /**
   * Circuit actif d'un type de ressource.
   *
   * À préférer systématiquement à `getWorkflowsByType(...)` suivi du premier élément : l'ordre de
   * cette liste n'est pas garanti, et le circuit retenu pouvait varier d'un appel à l'autre.
   * Répond 404 si aucun circuit n'est actif pour ce type.
   */
  getActiveWorkflowByType(resourceType: ResourceType | string): Observable<WorkflowDto> {
    return this.http
      .get<WorkflowDto>(`${this.workflowsUrl}/type/${resourceType}/active`)
      .pipe(catchError(this.enErreurMetier));
  }

  createWorkflow(dto: WorkflowDto): Observable<WorkflowDto> {
    return this.http.post<WorkflowDto>(this.workflowsUrl, dto).pipe(catchError(this.enErreurMetier));
  }

  updateWorkflow(id: string, dto: WorkflowDto): Observable<WorkflowDto> {
    return this.http.put<WorkflowDto>(`${this.workflowsUrl}/${id}`, dto).pipe(catchError(this.enErreurMetier));
  }

  /** Refusé en 409 si des dossiers sont en cours sur ce circuit. */
  deleteWorkflow(id: string): Observable<void> {
    return this.http.delete<void>(`${this.workflowsUrl}/${id}`).pipe(catchError(this.enErreurMetier));
  }

  // -------------------------------------------------------------- instances

  /** Ouvre un circuit. Un rejeu sur le même circuit rend l'instance déjà en cours, sans doublon. */
  initiateWorkflow(
    resourceId: string,
    resourceType: ResourceType | string,
    workflowId: string
  ): Observable<WorkflowInstanceDto> {
    const params = new HttpParams()
      .set('resourceId', resourceId)
      .set('resourceType', resourceType)
      .set('workflowId', workflowId);
    return this.http
      .post<WorkflowInstanceDto>(`${this.workflowsUrl}/initiate`, null, { params })
      .pipe(catchError(this.enErreurMetier));
  }

  getLastValidationInstance(resourceId: string): Observable<WorkflowInstanceDto> {
    return this.http
      .get<WorkflowInstanceDto>(`${this.workflowsUrl}/instances/${resourceId}`)
      .pipe(catchError(this.enErreurMetier));
  }

  /** État complet : étape courante, actions offertes et champs à saisir. */
  getWorkflowStateForResource(resourceId: string): Observable<WorkflowStateDto> {
    return this.http
      .get<WorkflowStateDto>(`${this.workflowsUrl}/instances/${resourceId}/state`)
      .pipe(catchError(this.enErreurMetier));
  }

  /**
   * États de plusieurs ressources en un appel, à coût constant côté serveur.
   *
   * À utiliser pour toute liste : appeler `getWorkflowStateForResource` en boucle multipliait les
   * requêtes HTTP autant que de lignes affichées. Les ressources sans circuit sont absentes du
   * résultat, et les doublons sont écartés avant l'envoi.
   */
  getWorkflowStatesForResources(resourceIds: string[]): Observable<Record<string, WorkflowStateDto>> {
    const demandees = Array.from(new Set((resourceIds ?? []).filter(Boolean)));
    if (demandees.length === 0) {
      return of({});
    }
    if (demandees.length > WorkflowService.TAILLE_LOT_MAX) {
      return throwError(() =>
        this.erreur(
          400,
          `Trop de ressources demandées en une fois (${demandees.length}). ` +
            `Le maximum est de ${WorkflowService.TAILLE_LOT_MAX}.`
        )
      );
    }
    return this.http
      .post<Record<string, WorkflowStateDto>>(`${this.workflowsUrl}/instances/states`, demandees)
      .pipe(
        map((etats) => etats ?? {}),
        catchError(this.enErreurMetier)
      );
  }

  /** Décisions successives, auteurs, commentaires et valeurs saisies. */
  getValidationHistory(resourceId: string): Observable<ValidationHistoryDto[]> {
    return this.http.get<ValidationHistoryDto[]>(`${this.workflowsUrl}/instances/${resourceId}/history`).pipe(
      map((historique) => historique ?? []),
      catchError(this.enErreurMetier)
    );
  }

  // -------------------------------------------------------------- décisions

  validateStep(resourceId: string, requete: WorkflowValidationRequestDto): Observable<void> {
    return this.http
      .post<void>(`${this.workflowsUrl}/validate/${resourceId}`, requete)
      .pipe(catchError(this.enErreurMetier));
  }

  rejectStep(resourceId: string, requete: WorkflowValidationRequestDto): Observable<void> {
    return this.http
      .post<void>(`${this.workflowsUrl}/reject/${resourceId}`, requete)
      .pipe(catchError(this.enErreurMetier));
  }

  /**
   * Franchit une transition désignée par son code, tel que rendu dans `allowedActions[].code`.
   * À préférer à `validateStep` / `rejectStep` dès qu'une étape offre plus de deux issues.
   */
  executeTransition(
    resourceId: string,
    transitionCode: string,
    requete: WorkflowValidationRequestDto
  ): Observable<void> {
    return this.http
      .post<void>(`${this.workflowsUrl}/execute/${resourceId}`, requete, {
        params: new HttpParams().set('transitionCode', transitionCode)
      })
      .pipe(catchError(this.enErreurMetier));
  }

  // -------------------------------------------------------------- modèles d'e-mail

  getAllEmailTemplates(): Observable<EmailTemplateDto[]> {
    return this.http.get<EmailTemplateDto[]>(this.emailTemplatesUrl).pipe(
      map((modeles) => modeles ?? []),
      catchError(this.enErreurMetier)
    );
  }

  getEmailTemplateById(id: string): Observable<EmailTemplateDto> {
    return this.http
      .get<EmailTemplateDto>(`${this.emailTemplatesUrl}/${id}`)
      .pipe(catchError(this.enErreurMetier));
  }

  createEmailTemplate(dto: EmailTemplateDto): Observable<EmailTemplateDto> {
    return this.http.post<EmailTemplateDto>(this.emailTemplatesUrl, dto).pipe(catchError(this.enErreurMetier));
  }

  updateEmailTemplate(id: string, dto: EmailTemplateDto): Observable<EmailTemplateDto> {
    return this.http
      .put<EmailTemplateDto>(`${this.emailTemplatesUrl}/${id}`, dto)
      .pipe(catchError(this.enErreurMetier));
  }

  deleteEmailTemplate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.emailTemplatesUrl}/${id}`).pipe(catchError(this.enErreurMetier));
  }

  // -------------------------------------------------------------- erreurs

  /**
   * Traduit une réponse HTTP en {@link WorkflowError} exploitable par un écran.
   *
   * Le service enveloppe ses erreurs dans `ApiResponse` — et elles seules : le message rédigé pour
   * l'utilisateur se trouve donc dans `error.message`. Le perdre revenait à afficher un libellé
   * générique là où le serveur explique précisément quoi faire.
   */
  private readonly enErreurMetier = (reponse: HttpErrorResponse) => {
    const status = reponse.status ?? 0;
    const message =
      reponse.error?.message ??
      (status === 0
        ? 'Le service de validation est injoignable. Vérifiez votre connexion.'
        : "Une erreur est survenue lors de l'opération.");
    return throwError(() => this.erreur(status, message));
  };

  private erreur(status: number, message: string): WorkflowError {
    return {
      status,
      message,
      estPerime: status === 409,
      estInterdit: status === 403
    };
  }
}
