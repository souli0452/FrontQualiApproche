import { HTTP_INTERCEPTORS, provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { NgxPermissionsModule } from 'ngx-permissions';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import Aura from '@primeng/themes/aura';
import { definePreset } from '@primeng/themes';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AuthInterceptor } from './app/core/interceptors/auth.interceptor';
import { DatePipe, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { DialogService } from 'primeng/dynamicdialog';
import { ToastModule } from 'primeng/toast';
import { UntypedFormBuilder } from '@angular/forms';
import { LoaderInterceptor } from './app/core/interceptors/loader.interceptor';
import { LicenceInterceptor } from './app/core/interceptors/licence.interceptor';
// Définition de votre thème bleu QualiSira
const MyPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '#ebf1f7',
            100: '#d7e3f0',
            200: '#afc7e1',
            300: '#87abcf',
            400: '#5f8fbe',
            500: '#1e3a5f',
            600: '#1a3353',
            700: '#162a45',
            800: '#122238',
            900: '#0e1a2a'
        }
    }
});
export const appConfig: ApplicationConfig = {
    providers: [
        ConfirmationService,
        MessageService,
        provideRouter(appRoutes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }), withEnabledBlockingInitialNavigation()),
        provideHttpClient(withInterceptorsFromDi()),
        provideAnimationsAsync(),
        {
            provide: HTTP_INTERCEPTORS,
            useClass: LoaderInterceptor,
            multi: true
        },
        { provide: UntypedFormBuilder, useClass: UntypedFormBuilder },
        { provide: LocationStrategy, useClass: PathLocationStrategy },
        DialogService,
        { provide: DatePipe },
        providePrimeNG({ 
            theme: { preset: MyPreset, options: { darkModeSelector: '.app-dark' } },
            translation: {
                firstDayOfWeek: 1,
                dayNames: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
                dayNamesShort: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
                dayNamesMin: ["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"],
                monthNames: ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"],
                monthNamesShort: ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"],
                today: "Aujourd'hui",
                clear: "Effacer",
                dateFormat: "dd/mm/yy",
                weekHeader: "Sem",
                // Les confirmations et les listes s'affichaient en anglais (« No / Yes »,
                // « 3 items selected ») : recette du module Audit du 17 oct. 2026, observation 5.
                accept: "Oui",
                reject: "Non",
                choose: "Choisir",
                upload: "Téléverser",
                cancel: "Annuler",
                apply: "Appliquer",
                matchAll: "Toutes les conditions",
                matchAny: "Au moins une condition",
                addRule: "Ajouter une règle",
                removeRule: "Retirer la règle",
                selectionMessage: "{0} éléments sélectionnés",
                emptySelectionMessage: "Aucun élément sélectionné",
                emptySearchMessage: "Aucun résultat",
                emptyFilterMessage: "Aucun résultat",
                emptyMessage: "Aucune option disponible",
                searchMessage: "{0} résultats disponibles",
                weak: "Faible",
                medium: "Moyen",
                strong: "Fort",
                passwordPrompt: "Saisissez un mot de passe",
                // Le bloc entier : PrimeNG fusionne la traduction en surface, un bloc partiel efface les
                // clés absentes — sans « pageLabel », chaque paginateur plantait (getPageAriaLabel).
                aria: {
                    trueLabel: "Vrai",
                    falseLabel: "Faux",
                    nullLabel: "Non sélectionné",
                    star: "1 étoile",
                    stars: "{star} étoiles",
                    selectAll: "Tout sélectionner",
                    unselectAll: "Tout désélectionner",
                    close: "Fermer",
                    previous: "Précédent",
                    next: "Suivant",
                    navigation: "Navigation",
                    scrollTop: "Remonter en haut",
                    moveTop: "Déplacer tout en haut",
                    moveUp: "Monter",
                    moveDown: "Descendre",
                    moveBottom: "Déplacer tout en bas",
                    moveToTarget: "Déplacer vers la cible",
                    moveToSource: "Déplacer vers la source",
                    moveAllToTarget: "Tout déplacer vers la cible",
                    moveAllToSource: "Tout déplacer vers la source",
                    pageLabel: "Page {page}",
                    firstPageLabel: "Première page",
                    lastPageLabel: "Dernière page",
                    nextPageLabel: "Page suivante",
                    prevPageLabel: "Page précédente",
                    rowsPerPageLabel: "Lignes par page",
                    previousPageLabel: "Page précédente",
                    jumpToPageDropdownLabel: "Aller à la page (liste)",
                    jumpToPageInputLabel: "Aller à la page (saisie)",
                    selectRow: "Ligne sélectionnée",
                    unselectRow: "Ligne désélectionnée",
                    expandRow: "Ligne dépliée",
                    collapseRow: "Ligne repliée",
                    showFilterMenu: "Afficher le menu de filtre",
                    hideFilterMenu: "Masquer le menu de filtre",
                    filterOperator: "Opérateur de filtre",
                    filterConstraint: "Contrainte de filtre",
                    editRow: "Modifier la ligne",
                    saveEdit: "Enregistrer la modification",
                    cancelEdit: "Annuler la modification",
                    listView: "Vue en liste",
                    gridView: "Vue en grille",
                    slide: "Diapositive",
                    slideNumber: "{slideNumber}",
                    zoomImage: "Agrandir l'image",
                    zoomIn: "Zoom avant",
                    zoomOut: "Zoom arrière",
                    rotateRight: "Pivoter à droite",
                    rotateLeft: "Pivoter à gauche",
                    listLabel: "Liste d'options",
                    selectColor: "Choisir une couleur",
                    removeLabel: "Retirer",
                    browseFiles: "Parcourir les fichiers",
                    maximizeLabel: "Agrandir"
                }
            }
        }),
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        // Le refus de licence (402) doit être dit à l'utilisateur, faute de quoi l'écran reste
        // muet et le refus passe pour une panne.
        { provide: HTTP_INTERCEPTORS, useClass: LicenceInterceptor, multi: true },
        importProvidersFrom(NgxPermissionsModule.forRoot())
    ]
};