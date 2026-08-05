import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { DocumentQms } from '../../../../models/gestion-documentaire.model';
import { OptionsLoader, SelectInputComponent } from '../../../../shared';
import { NiveauConfidentialite } from '../../../../models/referentiel-document.model';

/**
 * Changement du niveau de confidentialité d'un document déjà déposé.
 *
 * <p>Un classement se révise : le circuit évolue, un rôle disparaît, un document est classé par
 * erreur. Réservé à l'administration générale et au responsable qualité — le serveur le vérifie
 * de son côté, l'écran ne fait que ne pas proposer l'action aux autres.</p>
 *
 * <p>Le dialogue rappelle ce que le classement produit, parce que le geste n'est pas anodin :
 * il retire la vue du document à qui ne détient pas les rôles admis, y compris au responsable
 * qualité. Le laisser vide déclasse le document.</p>
 */
@Component({
    selector: 'app-qms-reclassement-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, NgPrimeModule, SelectInputComponent],
    templateUrl: './qms-reclassement-dialog.component.html'
})
export class QmsReclassementDialogComponent {
    @Input() document?: DocumentQms;
    @Input() loading = false;
    /** Chargeur du référentiel des niveaux, page par page. */
    @Input() chargerNiveaux?: OptionsLoader<NiveauConfidentialite>;

    @Input()
    set visible(valeur: boolean) {
        if (valeur && !this._visible) {
            // Le dialogue s'ouvre sur le classement en cours : c'est de lui qu'on part pour
            // décider, et le rappeler évite de reclasser à l'identique sans s'en apercevoir.
            this.niveauId = this.document?.niveauConfidentialiteId ?? null;
            this.niveauRetenu = this.niveauId
                ? { id: this.niveauId, libelle: this.document?.niveauConfidentialiteLibelle }
                : null;
        }
        this._visible = valeur;
    }
    get visible(): boolean {
        return this._visible;
    }
    private _visible = false;

    @Output() visibleChange = new EventEmitter<boolean>();
    /** Niveau retenu : identifiant et libellé, ou les deux nuls pour déclasser. */
    @Output() confirm = new EventEmitter<{ id: string | null; libelle: string | null }>();

    niveauId: string | null = null;
    /** Option retenue, dont on tire le libellé enregistré avec l'identifiant. */
    niveauRetenu: { id?: string; libelle?: string } | null = null;

    /** Niveaux déjà retenus, à réinjecter : celui du document n'est pas forcément en page 1. */
    get niveauxPreSelectionnes(): any[] {
        return this.niveauRetenu ? [this.niveauRetenu] : [];
    }

    get estUnDeclassement(): boolean {
        return !this.niveauId && !!this.document?.niveauConfidentialiteId;
    }

    get estInchange(): boolean {
        return (this.niveauId ?? null) === (this.document?.niveauConfidentialiteId ?? null);
    }

    fermer(): void {
        this.visible = false;
        this.visibleChange.emit(false);
    }

    valider(): void {
        if (this.estInchange) {
            return;
        }
        this.confirm.emit({
            id: this.niveauId,
            libelle: this.niveauId ? (this.niveauRetenu?.libelle ?? null) : null
        });
    }
}
