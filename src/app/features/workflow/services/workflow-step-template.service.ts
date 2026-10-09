import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { QualiUrlConfig } from '@core/services/url-config';
import { WorkflowStepTemplate } from '@features/gestion-documentaire/models/document.model';

/**
 * Service de gestion du référentiel des modèles d'étapes (Catalogue des Étapes).
 */
@Injectable({
  providedIn: 'root'
})
export class WorkflowStepTemplateService {

  constructor(private http: HttpClient) {}

  getAll(): Observable<WorkflowStepTemplate[]> {
    return this.http.get<any>(QualiUrlConfig.WORKFLOW_STEP_TEMPLATE_ROOT_URL, {
      params: { page: '0', size: '1000' }
    }).pipe(
      map((response) => {
        if (response?.data?.content && Array.isArray(response.data.content)) {
          return response.data.content;
        }
        if (Array.isArray(response?.data)) {
          return response.data;
        }
        if (Array.isArray(response)) {
          return response;
        }
        return [];
      })
    );
  }

  create(template: WorkflowStepTemplate): Observable<WorkflowStepTemplate> {
    return this.http.post<any>(QualiUrlConfig.WORKFLOW_STEP_TEMPLATE_ROOT_URL, template).pipe(
      map((response) => response?.data ?? response)
    );
  }

  update(id: string, template: WorkflowStepTemplate): Observable<WorkflowStepTemplate> {
    return this.http.put<any>(`${QualiUrlConfig.WORKFLOW_STEP_TEMPLATE_ROOT_URL}/${id}`, template).pipe(
      map((response) => response?.data ?? response)
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${QualiUrlConfig.WORKFLOW_STEP_TEMPLATE_ROOT_URL}/${id}`);
  }
}
