import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { QualiUrlConfig } from '../quali-url-configs';
import { DocumentWorkflow } from '../../models/gestion-documentaire.model';
import { ApiResponse } from '../../models/response.model';
import { WorkflowStateDto } from '../../models/workflow.model';

import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {

  constructor(private http: HttpClient) {}

  getAllWorkflows(): Observable<DocumentWorkflow[]> {
    return this.http.get<any>(QualiUrlConfig.WORKFLOW_ROOT_URL, {
      params: {
        page: '0',
        size: '1000'
      }
    }).pipe(
      map((response) => {
        if (response && response.data) {
          if (Array.isArray(response.data)) {
            return response.data;
          } else if (response.data.content && Array.isArray(response.data.content)) {
            return response.data.content;
          }
        }
        if (response && Array.isArray(response)) {
          return response;
        }
        return [];
      })
    );
  }

  getWorkflowsPage(page: number = 0, size: number = 10): Observable<ApiResponse<DocumentWorkflow>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<ApiResponse<DocumentWorkflow>>(QualiUrlConfig.WORKFLOW_ROOT_URL, { params });
  }

  getWorkflowById(id: string): Observable<DocumentWorkflow> {
    return this.http.get<any>(`${QualiUrlConfig.WORKFLOW_ROOT_URL}/${id}`).pipe(
      map(res => res?.data ?? res)
    );
  }

  getWorkflowStateForResource(resourceId: string): Observable<WorkflowStateDto> {
    return this.http.get<WorkflowStateDto>(`${QualiUrlConfig.WORKFLOW_ROOT_URL}/instances/${resourceId}/state`);
  }



  /** Modèles d'e-mail servis par workflow-service, proposés à chaque étape d'un circuit. */
  getAllEmailTemplates(): Observable<any[]> {
    return this.http.get<any>(QualiUrlConfig.EMAIL_TEMPLATE_URL).pipe(
      map((res) => (res?.data?.content ?? res?.data ?? res ?? []) as any[])
    );
  }

  createWorkflow(workflow: DocumentWorkflow): Observable<DocumentWorkflow> {
    return this.http.post<DocumentWorkflow>(QualiUrlConfig.WORKFLOW_ROOT_URL, workflow);
  }

  updateWorkflow(id: string, workflow: DocumentWorkflow): Observable<DocumentWorkflow> {
    return this.http.put<DocumentWorkflow>(`${QualiUrlConfig.WORKFLOW_ROOT_URL}/${id}`, workflow);
  }

  deleteWorkflow(id: string): Observable<void> {
    return this.http.delete<void>(`${QualiUrlConfig.WORKFLOW_ROOT_URL}/${id}`);
  }

  /**
   * `expectedStateCode` est l'étape sur laquelle l'écran croit agir (le `currentStateCode` de
   * l'état affiché). Le serveur refuse la demande en 409 si le dossier a changé d'étape
   * entre-temps, ce qui neutralise du même coup le second envoi d'un double clic.
   */
  validateStep(documentId: string, comments: string, expectedStateCode?: string): Observable<void> {
    return this.http.post<void>(`${QualiUrlConfig.WORKFLOW_ROOT_URL}/validate/${documentId}`, { comments, expectedStateCode });
  }

  rejectStep(documentId: string, comments: string, expectedStateCode?: string): Observable<void> {
    return this.http.post<void>(`${QualiUrlConfig.WORKFLOW_ROOT_URL}/reject/${documentId}`, { comments, expectedStateCode });
  }

  executeTransition(documentId: string, transitionCode: string, comments: string, expectedStateCode?: string): Observable<void> {
    return this.http.post<void>(`${QualiUrlConfig.WORKFLOW_ROOT_URL}/execute/${documentId}`, { comments, expectedStateCode }, { params: { transitionCode } });
  }
}
