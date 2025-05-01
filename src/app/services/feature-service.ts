import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import {HttpClient} from "@angular/common/http";
import {TypeDemande} from "../utils";
import { FormationComponent } from '../pages/formation/formation';


@Injectable({providedIn: 'root'})
export class FeaturesService {


    private reaload = new Subject<boolean>();
    reaload$ = this.reaload.asObservable();

    constructor(private http: HttpClient) {
    }


    onReloadRequested(event: boolean) {
        this.reaload.next(event);
    }


    getDynamicDetailComponent(typeDemande: TypeDemande) {
        switch (typeDemande) {
            case TypeDemande.NON_CONFORMITE:
                return FormationComponent;
            default: return FormationComponent

        }
    }

    getDynamicFormComponent(typeDemande: TypeDemande) {
        switch (typeDemande) {
            case TypeDemande.NON_CONFORMITE:
                return FormationComponent;
            default: return FormationComponent

        }
    }






}

