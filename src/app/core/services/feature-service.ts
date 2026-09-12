import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { HttpClient, HttpRequest } from '@angular/common/http';
import { TypeDemande } from '@features/non-conformite/models/nc-status.model';
import { FormTraitementComponent } from '@features/non-conformite/components/form-traitement/form-traitement';
import { DetailsDialogComponent } from '@features/non-conformite/components/details-dialog/details-dialog';

@Injectable({ providedIn: 'root' })
export class FeaturesService {
    loader = new BehaviorSubject(false);
    private reaload = new Subject<boolean>();
    reaload$ = this.reaload.asObservable();
    requests: Array<HttpRequest<any>> = [];

    constructor(private http: HttpClient) {}

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

    getDynamicFormTraitementComponent(typeDemande: TypeDemande) {
        switch (typeDemande) {
            case TypeDemande.NON_CONFORMITE:
                return FormTraitementComponent;
            default:
                return FormTraitementComponent;
        }
    }

    getDynamicDetailsDialogComponent(typeDemande: TypeDemande) {
        switch (typeDemande) {
            case TypeDemande.NON_CONFORMITE:
                return DetailsDialogComponent;
            default:
                return DetailsDialogComponent;
        }
    }
}
