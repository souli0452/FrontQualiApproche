import {Component, Input} from '@angular/core';
import {UntypedFormGroup} from "@angular/forms";
import { NgPrimeModule } from '@prime-ng';

@Component({
    selector: 'app-form-input-template',
    templateUrl: './form-input-template.component.html',
    styleUrl: './form-input-template.component.scss',
    standalone: true,
    imports: [NgPrimeModule]
})
export class FormInputTemplateComponent {
    @Input() col: any;
    @Input() dropDownObject: any;
    @Input() multiSelectObject: any;
    @Input() form!: UntypedFormGroup;

    /**
     * Retient les fichiers choisis dans le contrôle du formulaire.
     *
     * <p>Ce sont les objets {@code File} eux-mêmes qui y sont posés, non leur contenu : l'écran
     * porteur les déposera après avoir enregistré la fiche, par un appel multipart distinct —
     * une pièce ne s'attache qu'à une fiche qui existe déjà.</p>
     *
     * <p>Les choix s'ajoutent au lieu de se remplacer : on joint souvent ses documents en
     * plusieurs fois, et repartir de zéro à chaque sélection surprendrait.</p>
     */
    onFileSelected(event: any, field: string) {
        const controle = this.form.get(field);
        if (!controle) {
            return;
        }
        const choisis: File[] = Array.from(event?.files ?? event?.currentFiles ?? []);
        const deja: File[] = controle.value ?? [];
        controle.setValue([...deja, ...choisis]);
    }

    /** Les fichiers en attente de dépôt, pour les montrer avant d'enregistrer. */
    fichiersChoisis(field: string): File[] {
        return this.form.get(field)?.value ?? [];
    }

    retirerFichier(field: string, index: number) {
        const controle = this.form.get(field);
        if (!controle) {
            return;
        }
        const restants: File[] = [...(controle.value ?? [])];
        restants.splice(index, 1);
        controle.setValue(restants);
    }

    incrementKnob(field: string) {
        const ctrl = this.form.get(field);
        if (ctrl) {
            const current = ctrl.value || 0;
            if (current < 100) ctrl.setValue(current + 1);
        }
    }

    decrementKnob(field: string) {
        const ctrl = this.form.get(field);
        if (ctrl) {
            const current = ctrl.value || 0;
            if (current > 0) ctrl.setValue(current - 1);
        }
    }
}

