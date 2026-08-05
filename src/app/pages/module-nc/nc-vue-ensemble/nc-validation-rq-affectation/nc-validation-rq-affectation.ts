import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { TraitementTableComponent } from '../../../../components/non-conformite/table-traitement/traitement-table';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { EtapeTraitement } from '../../../../enums/enums';

/**
 * Non-conformités que le responsable qualité doit valider et affecter à une structure.
 *
 * <p>Charnière du circuit : jusqu'à cette étape le dossier n'est adressé à personne, après elle le
 * pilote de la structure désignée l'impute. Sans cette section, les dossiers en attente de son
 * arbitrage n'apparaissaient nulle part dans sa vue d'ensemble — il ne pouvait les découvrir qu'en
 * parcourant les listes générales, et le circuit s'arrêtait de fait après la réception.</p>
 *
 * <p>Aucune logique propre : les décisions viennent de la barre d'actions du moteur, au pied de la
 * fiche. Cette section n'est qu'une liste de plus dans la vue d'ensemble.</p>
 */
@Component({
    selector: 'app-nc-validation-rq-affectation',
    standalone: true,
    imports: [CommonModule, NgPrimeModule, TraitementTableComponent],
    providers: [MessageService],
    template: `
        <div class="shadow-1">
            <p-toast />
            <app-traitement-table
                [btnActions]="BtnActions.VALIDATION_RQ"
                [demandeList]="demandeList"
                [cols]="cols"
                [loading]="loading"
                [paginator]="false"
                [showGridlines]="false"
                [title]="title">
            </app-traitement-table>
        </div>
    `
})
export class ValidationRqAffectationComponent {
    @Input() demandeList: any = [];
    loading = false;
    title = 'Non-conformités à valider et affecter';

    protected readonly BtnActions = EtapeTraitement;

    cols: any[] = [
        { field: 'numeroReference', header: 'N° Ref', type: 'string', filter: true, width: '220px', centered: false },
        { field: 'structureSoumissionLibelle', header: 'Processus Emetteur', type: 'string', filter: true, width: '200px', centered: true },
        { field: 'niveauNonConformiteLibelle', header: 'Gravité', type: 'badge', filter: false, width: '150px', centered: false },
        { field: 'createdAt', header: 'Date soumission', type: 'date', filter: true, width: '150px', centered: false }
    ];
}
