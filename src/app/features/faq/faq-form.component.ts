import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { NgPrimeModule } from '@prime-ng';
import { AlertService } from '@shared/alert-message/alert-message.service';
import { FileUploadComponent } from '@features/non-conformite/components/file-upload/file-upload.component';
import { hasAnyPermission } from '@core/auth/auth-utils';
import { EntreeFaq, FichierFaq } from './faq.model';
import { FaqService } from './faq.service';

/**
 * La saisie d'une question, en pleine page.
 *
 * <p>Sur le modèle de la déclaration de non-conformité, et pour la même raison : ce qu'on écrit
 * ici engage l'organisation entière. La réponse s'affichera dans l'aide et sera reprise mot pour
 * mot par l'assistant — cela mérite un écran où l'on voit ce qu'on fait, plutôt qu'une boîte de
 * dialogue qu'on remplit de biais.</p>
 *
 * <p>La colonne de droite porte ce qui accompagne sans presser : les pièces jointes et les
 * conseils. Les conseils ne sont pas décoratifs — ils disent ce que le formulaire ne peut pas
 * montrer, notamment qu'une réponse longue occupe la place des autres dans la consigne de
 * l'assistant.</p>
 */
@Component({
    selector: 'app-faq-form',
    standalone: true,
    imports: [CommonModule, FormsModule, NgPrimeModule, FileUploadComponent],
    templateUrl: './faq-form.component.html'
})
export class FaqFormComponent implements OnInit, OnDestroy {

    /** Bornes du serveur, reprises ici pour refuser avant l'aller-retour. */
    private static readonly QUESTION_MAX = 300;
    private static readonly REPONSE_MAX = 1500;

    entree: EntreeFaq = { publiee: true };
    modification = false;
    /** Décider de ce qui paraît est un droit distinct de celui d'écrire. */
    peutPublier = false;
    enregistrement = false;

    /** Les fichiers choisis, en attente : une pièce ne s'attache qu'à une entrée qui existe. */
    private aDeposer: File[] = [];

    private readonly destroy$ = new Subject<boolean>();

    constructor(
        private readonly service: FaqService,
        private readonly route: ActivatedRoute,
        private readonly router: Router,
        private readonly alertService: AlertService
    ) {}

    ngOnInit(): void {
        this.peutPublier = hasAnyPermission(['faq-publish', 'CONFIG_GLOBAL_MANAGE']);
        // Sans ce droit, ce qu'on écrit part en brouillon : l'interrupteur est masqué, et le
        // serveur refuserait de toute façon de le suivre.
        this.entree.publiee = this.peutPublier;

        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            return;
        }
        this.modification = true;
        this.service.getById(id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (entree: any) => this.entree = entree?.data ?? entree ?? { publiee: true },
                error: () => {
                    this.alertService.showError('Cette question est introuvable.');
                    this.retour();
                }
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }

    estValide(): boolean {
        const question = (this.entree.question ?? '').trim();
        const reponse = (this.entree.reponse ?? '').trim();
        return question.length > 0 && question.length <= FaqFormComponent.QUESTION_MAX
            && reponse.length > 0 && reponse.length <= FaqFormComponent.REPONSE_MAX;
    }

    recevoirFichiers(fichiers: File[]): void {
        this.aDeposer = fichiers ?? [];
    }

    /**
     * Retire une pièce déjà enregistrée.
     *
     * <p>Immédiat, et non à l'enregistrement : la pièce existe déjà côté serveur, et attendre
     * laisserait croire qu'elle est partie alors qu'un abandon de la saisie la conserverait.</p>
     */
    retirerPieceExistante(index: number): void {
        const pieces = this.entree.fichiers ?? [];
        const piece: FichierFaq | undefined = pieces[index];
        if (!piece?.id) {
            return;
        }
        this.service.retirerLaPiece(piece.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => this.entree.fichiers = pieces.filter((_, i) => i !== index),
                error: () => this.alertService.showError('Le retrait de la pièce a échoué.')
            });
    }

    /**
     * Enregistre la question, puis dépose ses pièces.
     *
     * <p>Deux appels, et dans cet ordre : le serveur veut du multipart pour les fichiers là où la
     * fiche voyage en JSON, et une pièce ne s'attache qu'à une entrée qui existe.</p>
     *
     * <p>Un dépôt qui échoue ne perd pas la réponse : elle est déjà enregistrée, et le message le
     * dit plutôt que de laisser croire à un échec complet — c'est notamment le cas quand
     * l'installation n'a pas de serveur de fichiers.</p>
     */
    enregistrer(): void {
        if (!this.estValide() || this.enregistrement) {
            return;
        }
        this.enregistrement = true;

        const fiche: EntreeFaq = {
            id: this.entree.id,
            question: (this.entree.question ?? '').trim(),
            reponse: (this.entree.reponse ?? '').trim(),
            publiee: this.entree.publiee ?? true
        };

        const requete = fiche.id
            ? this.service.updateObject(fiche.id, fiche)
            : this.service.create(fiche);

        requete.pipe(takeUntil(this.destroy$)).subscribe({
            next: (enregistree: any) => {
                const id = enregistree?.data?.id ?? enregistree?.id ?? fiche.id;
                if (this.aDeposer.length === 0 || !id) {
                    this.terminer('Réponse enregistrée.');
                    return;
                }
                this.service.joindre(id, this.aDeposer)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: () => this.terminer('Réponse enregistrée, pièces jointes comprises.'),
                        error: (erreur) => {
                            this.enregistrement = false;
                            this.alertService.showError(erreur?.status === 503
                                ? "Réponse enregistrée. Les pièces jointes demandent un serveur de fichiers, que cette installation n'a pas configuré."
                                : 'Réponse enregistrée, mais le dépôt des pièces a échoué.');
                            this.router.navigate(['/faq']);
                        }
                    });
            },
            error: () => {
                this.enregistrement = false;
                this.alertService.showError('Enregistrement impossible.');
            }
        });
    }

    retour(): void {
        this.router.navigate(['/faq']);
    }

    private terminer(message: string): void {
        this.enregistrement = false;
        this.alertService.showSuccess(message);
        this.router.navigate(['/faq']);
    }
}
