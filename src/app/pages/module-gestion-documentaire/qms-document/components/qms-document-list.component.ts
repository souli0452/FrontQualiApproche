import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { DocumentQms, QmsDocumentType } from '../../../../models/gestion-documentaire.model';
import { DomaineApplication, NiveauConfidentialite, PrioriteDocument } from '../../../../models/referentiel-document.model';
import { OptionsLoader, SelectInputComponent } from '../../../../shared';

/**
 * Liste des documents : recherche, filtres et tableau.
 *
 * <p>Composant de présentation — il ne détient aucun état métier et ne fait aucun appel : les
 * critères de recherche lui sont fournis et toute action est remontée au parent. Le menu d'actions
 * par ligne a été retiré : une ligne s'ouvre, et c'est la fiche du document qui expose les actions
 * possibles, en fonction des droits de l'utilisateur.</p>
 */
@Component({
    selector: 'app-qms-document-list',
    standalone: true,
    imports: [CommonModule, FormsModule, NgPrimeModule, SelectInputComponent],
    templateUrl: './qms-document-list.component.html'
})
export class QmsDocumentListComponent {
    @Input() documents: DocumentQms[] = [];
    @Input() loading = false;

    /*
     * Pagination portée par le serveur : le tableau n'affiche que la page reçue et s'en remet au
     * total pour dimensionner sa barre. Il paginait auparavant les seuls documents qu'on lui
     * avait donnés, en les présentant comme le fonds entier.
     */
    @Input() totalDocuments = 0;
    @Input() premiereLigne = 0;
    @Input() taillePage = 15;
    @Output() pageChange = new EventEmitter<{ first: number; rows: number }>();

    /*
     * Les filtres reçoivent un chargeur, non une liste toute faite.
     *
     * Ces référentiels sont servis paginés : les charger d'avance revenait à n'en afficher que
     * la première page, sans que rien ne signale les valeurs manquantes. Chaque liste déroulante
     * charge donc la sienne — première page à l'ouverture, suivantes à la demande, recherche
     * servie par le serveur.
     */
    @Input() chargerTypes?: OptionsLoader<QmsDocumentType>;
    @Input() chargerStructures?: OptionsLoader<any>;
    @Input() chargerPriorites?: OptionsLoader<PrioriteDocument>;
    /**
     * Niveaux proposables : ceux que l'utilisateur a le droit de voir, résolus par le serveur.
     * Un niveau qu'il n'a pas le droit de consulter ne rendrait aucun document, et le proposer
     * révélerait un classement qui ne le regarde pas.
     */
    @Input() chargerNiveauxConfidentialite?: OptionsLoader<NiveauConfidentialite>;
    @Input() chargerDomaines?: OptionsLoader<DomaineApplication>;

    @Input() searchQuery = '';
    @Input() selectedType = '';
    @Input() selectedService = '';
    @Input() selectedPriorite = '';
    @Input() selectedNiveauConfidentialite = '';
    @Input() selectedDomaine = '';

    @Output() searchQueryChange = new EventEmitter<string>();
    @Output() selectedTypeChange = new EventEmitter<string>();
    @Output() selectedServiceChange = new EventEmitter<string>();
    @Output() selectedPrioriteChange = new EventEmitter<string>();
    @Output() selectedNiveauConfidentialiteChange = new EventEmitter<string>();
    @Output() selectedDomaineChange = new EventEmitter<string>();

    /** Rechargement demandé : saisie validée, filtre modifié ou bouton Actualiser. */
    @Output() refresh = new EventEmitter<void>();
    /** Ouverture de la fiche d'un document. */
    @Output() open = new EventEmitter<DocumentQms>();

    /** Libellé et couleur de l'état, fournis par le parent qui détient la règle d'affichage. */
    @Input() statusLabel: (doc: DocumentQms) => string = () => '';
    @Input() statusSeverity: (doc: DocumentQms) => string = () => 'info';

    /**
     * État du circuit, résolu par le parent auprès de workflow-service.
     *
     * <p>Complète l'état du document sans le remplacer : celui-ci dit où en est le fichier
     * (brouillon, obsolète, en retard de révision), celui-là où en est sa validation — et
     * si l'utilisateur qui consulte a une décision à prendre.</p>
     */
    @Input() etapeDeCircuit: (doc: DocumentQms) => string | undefined = () => undefined;
    @Input() aUneDecisionAttendue: (doc: DocumentQms) => boolean = () => false;
    @Input() circuitTermine: (doc: DocumentQms) => boolean = () => false;
}
