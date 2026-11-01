import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { NgPrimeModule } from '@prime-ng';
import { AlertService } from '@shared/alert-message/alert-message.service';
import { AuditPageFormulaireComponent } from '@features/gestion-audit/components/page-formulaire.component';
import { AuditLibelleComponent } from '@features/gestion-audit/components/libelle-aide.component';
import { NouveauClient } from './clients.model';
import { ClientsService } from './clients.service';

/**
 * Création d'un client : sa direction, puis son super administrateur.
 *
 * Le serveur pose ensuite le paramétrage par défaut du client dans chaque service (rôles,
 * circuits, modèles de courriel, types de documents, réglages) et crée le compte de son
 * administrateur, qui reçoit un courriel pour choisir son mot de passe.
 */
@Component({
    selector: 'app-client-form',
    standalone: true,
    imports: [CommonModule, NgPrimeModule, ReactiveFormsModule, AuditPageFormulaireComponent, AuditLibelleComponent],
    templateUrl: './client-form.component.html'
})
export class ClientFormComponent {

    etapes = ['Le client', 'Son super administrateur'];
    etape = 1;
    saving = false;

    conseils = [
        'Le client est une direction : ses comptes, son paramétrage et sa licence ne sont visibles que de lui.',
        'Le code partenaire est celui qui figure dans les licences émises pour ce client : sans lui, toute licence authentique serait acceptée.',
        'Le super administrateur reçoit un courriel pour définir son mot de passe ; il crée ensuite les structures et les comptes de son organisation.',
        'Le client démarre sans licence : il pourra lancer l\'essai gratuit ou installer celle que vous lui remettez.'
    ];

    /** Les champs de chaque étape, pour ne valider que ce qui est à l'écran. */
    private champsParEtape: string[][] = [
        ['libelleLong', 'libelleCourt', 'email', 'code'],
        ['adminUsername', 'adminEmail', 'adminFirstName', 'adminLastName']
    ];

    formulaire: FormGroup;

    constructor(private fb: FormBuilder, private service: ClientsService,
                private alertService: AlertService, private router: Router) {
        this.formulaire = this.fb.group({
            libelleLong: ['', [Validators.required, Validators.maxLength(255)]],
            libelleCourt: ['', [Validators.maxLength(50)]],
            email: ['', [Validators.required, Validators.email]],
            code: ['', [Validators.maxLength(40)]],
            adminUsername: ['', [Validators.required]],
            adminEmail: ['', [Validators.required, Validators.email]],
            adminFirstName: ['', [Validators.required]],
            adminLastName: ['', [Validators.required]]
        });
    }

    invalide(champ: string): boolean {
        const controle = this.formulaire.get(champ);
        return !!controle && controle.invalid && (controle.touched || controle.dirty);
    }

    private etapeValide(n: number): boolean {
        return this.champsParEtape[n - 1].every(champ => this.formulaire.get(champ)?.valid);
    }

    private marquerEtape(n: number): void {
        this.champsParEtape[n - 1].forEach(champ => this.formulaire.get(champ)?.markAsTouched());
    }

    suivant(): void {
        if (this.etapeValide(this.etape)) {
            this.etape++;
        } else {
            this.marquerEtape(this.etape);
        }
    }

    precedent(): void {
        this.etape = Math.max(1, this.etape - 1);
    }

    allerA(n: number | undefined): void {
        if (n && (n < this.etape || this.etapeValide(this.etape))) {
            this.etape = n;
        } else {
            this.marquerEtape(this.etape);
        }
    }

    /** L'adresse du client sert d'adresse au super administrateur, tant qu'on ne la change pas. */
    reprendreLAdresse(): void {
        const admin = this.formulaire.get('adminEmail');
        if (admin && !admin.value) {
            admin.setValue(this.formulaire.value.email);
        }
    }

    annuler(): void {
        this.router.navigate(['/plateforme/clients']);
    }

    creer(): void {
        if (this.formulaire.invalid) {
            this.champsParEtape.forEach((_, i) => this.marquerEtape(i + 1));
            this.etape = this.champsParEtape.findIndex((_, i) => !this.etapeValide(i + 1)) + 1 || this.etape;
            return;
        }
        const v = this.formulaire.value;
        const client: NouveauClient = {
            libelleLong: v.libelleLong.trim(),
            libelleCourt: (v.libelleCourt || '').trim(),
            email: v.email.trim(),
            code: (v.code || '').trim(),
            superAdmin: {
                username: v.adminUsername.trim(),
                firstName: v.adminFirstName.trim(),
                lastName: v.adminLastName.trim(),
                email: v.adminEmail.trim()
            }
        };
        this.saving = true;
        this.service.creer(client).subscribe({
            next: rapport => {
                this.saving = false;
                const services = Object.keys(rapport?.amorce ?? {});
                if (services.length > 0) {
                    this.alertService.showWarning(`Client « ${client.libelleLong} » créé, mais son paramétrage est `
                        + `incomplet dans : ${services.join(', ')}. Reposez-le depuis la liste quand ces services répondront.`);
                } else if (rapport?.superAdmin?.startsWith('échec')) {
                    this.alertService.showWarning(`Client « ${client.libelleLong} » créé, mais son super administrateur `
                        + `n'a pas pu l'être : ${rapport.superAdmin}`);
                } else {
                    this.alertService.showSuccess(`Client « ${client.libelleLong} » créé. Son super administrateur `
                        + `reçoit un courriel pour définir son mot de passe.`);
                }
                this.router.navigate(['/plateforme/clients']);
            },
            error: err => {
                this.saving = false;
                this.alertService.handleHttpError(err, 'Le client n\'a pas pu être créé.');
            }
        });
    }
}
