import { AfterViewInit, Directive, ElementRef, OnDestroy, Renderer2, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { LicenceService } from '@core/licence';

/**
 * Désactive un bouton d'action tant que la licence ne les permet pas.
 *
 * ```html
 * <p-button label="Nouveau document" siLicenceOuverte (onClick)="creer()"></p-button>
 * ```
 *
 * <p>À poser sur les points d'entrée d'une écriture — « Nouveau », « Ajouter », « Créer ». Le
 * serveur refuse déjà ces actions en 402 ; la différence est que l'utilisateur le voit
 * <b>avant</b> d'avoir saisi un formulaire entier. Découvrir le refus à l'enregistrement, après
 * dix minutes de saisie, est la manière la plus sûre de faire passer une licence échue pour une
 * perte de données.</p>
 *
 * <p>Le bouton est désactivé, non masqué : une action qui disparaît laisse croire à un défaut de
 * droits. Le survol dit la raison, et elle est la même que celle du bandeau.</p>
 *
 * <p>La consultation, elle, n'est jamais touchée — cette directive n'a rien à faire sur un
 * bouton d'export, de filtre ou de recherche.</p>
 */
@Directive({
    selector: '[siLicenceOuverte]',
    standalone: true
})
export class LicenceOuverteDirective implements AfterViewInit, OnDestroy {

    private readonly licence = inject(LicenceService);
    private readonly hote = inject(ElementRef<HTMLElement>);
    private readonly renderer = inject(Renderer2);

    private abonnement?: Subscription;

    /**
     * Après le rendu de la vue, et non avant : posée sur un `<p-button>`, la directive doit
     * atteindre le `<button>` que PrimeNG place à l'intérieur, lequel n'existe pas encore à
     * l'initialisation.
     */
    ngAfterViewInit(): void {
        // L'état peut n'être pas encore chargé au premier rendu : on suit le flux plutôt que de
        // lire une seule fois, faute de quoi un bouton resterait désactivé après l'installation
        // d'une licence, jusqu'au rechargement de la page.
        this.abonnement = this.licence.etat$.subscribe((etat) => {
            // Tant que l'état est inconnu, on n'entrave rien : mieux vaut un refus du serveur
            // qu'une application inutilisable parce que le référentiel a mis une seconde de trop.
            this.appliquer(etat === null ? true : etat.actionsOuvertes);
        });
    }

    ngOnDestroy(): void {
        this.abonnement?.unsubscribe();
    }

    private appliquer(ouvertes: boolean): void {
        const element = this.hote.nativeElement as HTMLElement;
        const bouton = element.tagName === 'BUTTON' ? element : element.querySelector('button');

        if (ouvertes) {
            this.renderer.removeAttribute(bouton ?? element, 'disabled');
            this.renderer.removeAttribute(element, 'title');
            this.renderer.removeClass(element, 'licence-suspendue');
            return;
        }

        if (bouton) {
            this.renderer.setAttribute(bouton, 'disabled', 'true');
        }
        this.renderer.addClass(element, 'licence-suspendue');
        this.renderer.setAttribute(element, 'title',
            this.licence.etat?.message
            ?? "Action suspendue : la licence de cette installation a pris fin.");
    }
}
