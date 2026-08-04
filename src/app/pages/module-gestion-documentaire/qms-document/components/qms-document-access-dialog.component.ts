import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { DocumentQms, DocumentUserAccess } from '../../../../models/gestion-documentaire.model';

/** Droit d'accès à octroyer sur un document. */
export interface AccessGrant {
    userId: string;
    userFullName: string;
    userEmail: string;
    role: string;
}

/**
 * Gestion des accès à un document : droits en place et octroi d'un nouvel accès.
 *
 * <p>Le dialogue porte son formulaire et la sélection de l'utilisateur — remplir les champs à
 * partir de l'utilisateur choisi n'intéresse que lui. Le chargement des utilisateurs d'une
 * structure reste au parent, qui détient les services : le dialogue signale le changement de
 * filtre et se contente d'afficher la liste qu'on lui fournit.</p>
 */
@Component({
    selector: 'app-qms-document-access-dialog',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, NgPrimeModule],
    templateUrl: './qms-document-access-dialog.component.html'
})
export class QmsDocumentAccessDialogComponent {
    @Input() document?: DocumentQms;
    @Input() accessList: DocumentUserAccess[] = [];
    @Input() structures: any[] = [];
    @Input() filteredUsers: any[] = [];
    @Input() roleOptions: any[] = [];
    @Input() loading = false;
    @Input() loadingAccess = false;
    /** Structures déjà destinataires d'un partage, chargées par le parent. */
    @Input() partagesStructure: any[] = [];

    @Input()
    set visible(valeur: boolean) {
        if (valeur && !this._visible) {
            this.form.reset({ role: 'READ_ONLY' });
            this.selectedStructureFilter = undefined;
            this.selectedUser = undefined;
            this.activeTab = 'access';
            this.structurePartage = undefined;
        }
        this._visible = valeur;
    }
    get visible(): boolean {
        return this._visible;
    }
    private _visible = false;

    @Output() visibleChange = new EventEmitter<boolean>();
    /** Structure choisie : le parent charge les utilisateurs correspondants. */
    @Output() structureFilterChange = new EventEmitter<string | undefined>();
    @Output() grant = new EventEmitter<AccessGrant>();
    @Output() revoke = new EventEmitter<DocumentUserAccess>();
    /** Partage à une structure entière, décidé à l'étape en cours. */
    @Output() partagerAvecStructure = new EventEmitter<{ structureId: string; structureLibelle: string }>();
    @Output() retirerPartageStructure = new EventEmitter<any>();

    activeTab: 'access' | 'grant' | 'structure' = 'access';
    structurePartage?: string;
    selectedStructureFilter?: string;
    selectedUser?: any;

    readonly form: FormGroup;

    /**
     * Structures proposables au partage : toutes sauf celle qui a émis le document — ses membres
     * le voient déjà, et le serveur refuserait le partage.
     */
    get structuresPartageables(): any[] {
        return (this.structures ?? []).filter(structure => structure?.id !== this.document?.serviceId);
    }

    partagerStructure(): void {
        if (!this.structurePartage) {
            return;
        }
        const structure = this.structures.find(s => s.id === this.structurePartage);
        this.partagerAvecStructure.emit({
            structureId: this.structurePartage,
            structureLibelle: structure?.libelleLong || structure?.libelleCourt || ''
        });
        this.structurePartage = undefined;
    }

    constructor(private fb: FormBuilder) {
        this.form = this.fb.group({
            userId: ['', Validators.required],
            userFullName: [''],
            userEmail: ['', Validators.email],
            role: ['READ_ONLY', Validators.required]
        });
    }

    onStructureFilterChange(structureId: string | undefined): void {
        this.selectedUser = undefined;
        this.viderUtilisateur();
        this.structureFilterChange.emit(structureId);
    }

    onUserSelected(user: any): void {
        if (!user) {
            this.viderUtilisateur();
            return;
        }
        this.form.patchValue({
            userId: user.id,
            userFullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            userEmail: user.email
        });
    }

    private viderUtilisateur(): void {
        this.form.patchValue({ userId: '', userFullName: '', userEmail: '' });
    }

    fermer(): void {
        this.visible = false;
        this.visibleChange.emit(false);
    }

    valider(): void {
        if (this.form.invalid) {
            return;
        }
        this.grant.emit(this.form.value as AccessGrant);
    }
}
