import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { HttpClient, HttpRequest } from '@angular/common/http';
import { ReportingInput, TypeDemande } from '../utils';
import { FormationComponent } from '../pages/formation/formation';
import { DetailsComponent } from '../pages/proc-non-conformite/details/details.component';
import {
    DemandeNon_conformiteDetailsComponent
} from '../pages/proc-non-conformite/details/demande.non-conformite.service.details/demande.non_conformite.details.component';
import {
    NonConformitFormsComponent
} from '../pages/proc-non-conformite/forms/non-conformit.forms/non-conformit.forms.component';
import { FormsComponent } from '../pages/proc-non-conformite/forms/forms.component';
import { SERVICE_PREFIX } from './quali-url-configs';
import { FormTraitementComponent } from '../components/non-conformite/form-traitement/form-traitement';
import { DetailsDialogComponent } from '../components/non-conformite/details-dialog/details-dialog';


@Injectable({providedIn: 'root'})
export class FeaturesService {
    REPORTING_URL = `${SERVICE_PREFIX}/reports/reporting`;

    loader = new BehaviorSubject(false);
    private reaload = new Subject<boolean>();
    reaload$ = this.reaload.asObservable();
    requests: Array<HttpRequest<any>> = [];
    constructor(private http: HttpClient) {
    }
    removeRequest(req: HttpRequest<any>) {
        if (this.requests.length > 0) {
            this.requests.splice(this.requests.indexOf(req), 1);
        }

        this.loader.next(this.requests.length > 0);
    }

    addRequest(req: HttpRequest<any>) {
        this.requests.push(req);

        this.loader.next(true);
    }

    onReloadRequested(event: boolean) {
        this.reaload.next(event);
    }

    public printReport(data: ReportingInput): Observable<ArrayBuffer> {
        return this.http.post(this.REPORTING_URL, data, {responseType: 'arraybuffer'});
    }
    getDynamicDetailComponent(typeDemande: TypeDemande) {
        switch (typeDemande) {
            case TypeDemande.NON_CONFORMITE:
                return DemandeNon_conformiteDetailsComponent;
            default: return DetailsComponent

        }
    }

    getDynamicFormComponent(typeDemande: TypeDemande) {
        switch (typeDemande) {
            case TypeDemande.NON_CONFORMITE:
                return NonConformitFormsComponent;
            default: return FormsComponent

        }
    }


    getDynamicFormTraitementComponent(typeDemande: TypeDemande) {
        switch (typeDemande) {
            case TypeDemande.NON_CONFORMITE:
                return FormTraitementComponent;
            default: return FormTraitementComponent
        }
    }


    getDynamicDetailsDialogComponent(typeDemande: TypeDemande) {
        switch (typeDemande) {
            case TypeDemande.NON_CONFORMITE:
                return DetailsDialogComponent;
            default: return DetailsComponent
        }
    }



}

