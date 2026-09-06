import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, Input, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import { WorkflowDto, WorkflowStepDto, WorkflowTransitionDto } from '../../../models/workflow.model';

/** Identifiant unique par rendu : Mermaid refuse de réutiliser le même. */
let SEQUENCE_RENDU = 0;

/**
 * Diagramme état-transition d'un circuit de validation.
 *
 * <p>Un circuit se lit mal en liste : « après approbation, on passe à la vérification, sauf si le
 * vérificateur retourne le dossier au rédacteur » demande de reconstituer mentalement un graphe. Le
 * dessiner montre d'un coup d'œil ce qu'aucune énumération ne donne — les impasses, les boucles de
 * retour, et les étapes qu'aucune transition n'atteint.</p>
 *
 * <p>Le source Mermaid est calculé à partir du circuit ({@link codeMermaid}), ce qui rend la
 * construction vérifiable sans navigateur ni rendu. Les <b>flèches de retour</b> — celles qui
 * remontent vers une étape antérieure — sont recolorées après rendu : ce sont elles qu'on cherche en
 * relisant un circuit, et Mermaid ne sait pas les distinguer.</p>
 *
 * <p>Mermaid est chargé à la demande : la bibliothèque pèse plusieurs centaines de kilo-octets, et
 * seule la consultation d'un circuit en a besoin.</p>
 */
@Component({
    selector: 'app-workflow-diagram',
    standalone: true,
    imports: [CommonModule, ButtonModule, TooltipModule],
    template: `
        @if (aucuneEtape) {
            <div class="flex flex-col items-center gap-2 py-8 text-surface-400">
                <i class="pi pi-inbox text-2xl"></i>
                <span class="text-sm">Diagramme indisponible : ce circuit n'a aucune étape.</span>
            </div>
        } @else {
            <div class="flex flex-wrap items-center justify-between gap-4 mb-3">
                <div class="flex flex-wrap items-center gap-4 text-xs text-surface-500">
                    @if (etapeCouranteCode) {
                        <!-- Sur un dossier, la question n'est pas « comment le circuit est fait »
                             mais « où en est-on » : la légende suit. -->
                        <span class="inline-flex items-center gap-1">
                            <span class="w-3 h-3 rounded-full bg-amber-400"></span>Étape en cours
                        </span>
                        <span class="inline-flex items-center gap-1">
                            <span class="w-3 h-3 rounded-full bg-slate-300"></span>Déjà franchie
                        </span>
                    } @else {
                        <span class="inline-flex items-center gap-1">
                            <span class="w-3 h-3 rounded-full bg-blue-500"></span>Première étape
                        </span>
                        <span class="inline-flex items-center gap-1">
                            <span class="w-3 h-3 rounded-full bg-green-500"></span>Étape sans suite
                        </span>
                    }
                    <span class="inline-flex items-center gap-1">
                        <span class="w-4 h-0.5 bg-orange-500"></span>Retour en arrière
                    </span>
                </div>
                <div class="flex items-center gap-2">
                    <!-- Un circuit long tient mieux à l'horizontale, un court à la verticale. Le
                         choix est automatique mais reprenable : la bonne disposition dépend aussi de
                         l'écran de qui regarde. -->
                    <p-button [icon]="dispositionEffective === 'LR' ? 'pi pi-arrows-v' : 'pi pi-arrows-h'"
                              [label]="dispositionEffective === 'LR' ? 'Vertical' : 'Horizontal'"
                              severity="secondary" [outlined]="true" size="small"
                              [pTooltip]="dispositionEffective === 'LR'
                                            ? 'Disposer les étapes de haut en bas'
                                            : 'Disposer les étapes de gauche à droite'"
                              (onClick)="basculerLaDisposition()"></p-button>
                    <p-button label="Exporter en PNG" icon="pi pi-download" severity="secondary"
                              [outlined]="true" size="small" [loading]="exportEnCours"
                              (onClick)="exporterPng()"></p-button>
                </div>
            </div>

            @if (enErreur) {
                <div class="flex flex-col items-center gap-2 py-8 text-surface-400">
                    <i class="pi pi-exclamation-triangle text-2xl"></i>
                    <span class="text-sm">Le diagramme n'a pas pu être dessiné.</span>
                </div>
            } @else {
                <div class="overflow-auto rounded-xl border border-surface-200 bg-surface-0 p-4">
                    <div #diagramme class="wf-mermaid flex justify-center" [innerHTML]="svg"></div>
                </div>
            }
        }
    `,
    styles: [`
        /* Le SVG garde sa taille naturelle : le défilement est celui du cadre parent. */
        .wf-mermaid ::ng-deep svg {
            max-width: 100%;
            height: auto;
        }
    `]
})
export class WorkflowDiagramComponent implements OnChanges, OnDestroy {

    /** Couleur des flèches qui remontent vers une étape antérieure. */
    private static readonly COULEUR_RETOUR = '#f97316';

    @ViewChild('diagramme') private conteneur?: ElementRef<HTMLElement>;

    svg: SafeHtml | null = null;
    enErreur = false;
    exportEnCours = false;
    aucuneEtape = true;

    /** Source Mermaid du dernier circuit reçu — exposé pour être vérifiable sans rendu. */
    codeMermaid = '';

    /** Drapeaux « retour », dans l'ordre de déclaration des arêtes. */
    private retours: boolean[] = [];

    /**
     * Étape où se trouve le dossier, s'il s'agit d'en suivre un.
     *
     * <p>Renseignée, elle change ce que le diagramme raconte : non plus la forme du circuit, mais la
     * position du dossier dedans. Absente, le diagramme reste celui de la configuration.</p>
     */
    @Input() etapeCouranteCode?: string | null;

    /** Codes des étapes déjà franchies, pour distinguer le chemin parcouru du reste. */
    @Input() etapesParcourues: string[] = [];

    /**
     * Disposition imposée par l'appelant, s'il en a une. Absente, elle est déduite puis reprenable
     * par l'utilisateur.
     */
    @Input() direction?: 'TB' | 'LR';

    /** Disposition choisie à la main, qui prime sur la déduction. */
    private dispositionChoisie?: 'TB' | 'LR';

    /** Nombre d'étapes du dernier circuit reçu, pour en déduire la disposition. */
    private nombreEtapes = 0;

    private circuit?: WorkflowDto;
    private observateurDeTheme?: MutationObserver;
    private rendrePrevu = false;

    /** Disposition du dernier source construit, pour ne redessiner qu'utilement. */
    private dispositionDessinee: 'TB' | 'LR' = 'TB';

    @Input({ required: true })
    set workflow(circuit: WorkflowDto | undefined) {
        this.circuit = circuit;
        this.nombreEtapes = circuit?.steps?.length ?? 0;
        this.aucuneEtape = this.nombreEtapes === 0;
        this.planifierLeRendu();
    }

    ngOnChanges(): void {
        // L'étape courante et le chemin parcouru arrivent par d'autres entrées : le diagramme doit
        // suivre, sans redessiner une fois par entrée reçue.
        this.planifierLeRendu();
    }

    /**
     * Recalcule le source, et reporte le seul dessin à la fin du cycle en cours.
     *
     * <p>Le source est recalculé tout de suite : il ne coûte que quelques concaténations, et le
     * laisser en retard d'une passe donnerait un composant dont l'état ne correspond pas à ses
     * entrées. Le <b>rendu</b>, lui, est reporté : trois entrées posées dans la même passe de
     * détection ne doivent produire qu'un dessin, et deux rendus concurrents se disputeraient le
     * même conteneur.</p>
     */
    private planifierLeRendu(): void {
        this.dispositionDessinee = this.dispositionEffective;
        const modele = this.construire(this.circuit);
        this.codeMermaid = modele.code;
        this.retours = modele.retours;
        this.svg = null;
        this.enErreur = false;

        if (this.aucuneEtape || this.rendrePrevu) {
            return;
        }
        this.rendrePrevu = true;
        void Promise.resolve().then(() => {
            this.rendrePrevu = false;
            void this.dessiner();
        });
    }

    constructor(private readonly sanitizer: DomSanitizer) {
        // Le thème peut basculer pendant la consultation : le diagramme est redessiné, sans quoi il
        // resterait en couleurs claires sur fond sombre, illisible.
        this.observateurDeTheme = new MutationObserver(() => {
            if (!this.aucuneEtape) {
                void this.dessiner();
            }
        });
        this.observateurDeTheme.observe(document.documentElement,
            { attributes: true, attributeFilter: ['class'] });
    }

    ngOnDestroy(): void {
        this.observateurDeTheme?.disconnect();
    }

    /**
     * Disposition retenue : celle qu'on impose, celle que l'utilisateur a choisie, ou celle qu'on
     * déduit.
     *
     * <p>Déduction : au-delà de cinq étapes et sur un écran large, l'horizontale évite le ruban
     * vertical de plusieurs écrans de haut qu'un circuit d'instruction produit. En dessous, la
     * verticale se lit comme une liste, ce qu'un circuit court est.</p>
     */
    get dispositionEffective(): 'TB' | 'LR' {
        if (this.direction) {
            return this.direction;
        }
        if (this.dispositionChoisie) {
            return this.dispositionChoisie;
        }
        const ecranLarge = typeof window !== 'undefined' && window.innerWidth >= 1024;
        return ecranLarge && this.nombreEtapes > 5 ? 'LR' : 'TB';
    }

    basculerLaDisposition(): void {
        this.dispositionChoisie = this.dispositionEffective === 'LR' ? 'TB' : 'LR';
        this.planifierLeRendu();
    }

    /**
     * Redessine si — et seulement si — la disposition déduite a changé.
     *
     * <p>Un redimensionnement de fenêtre ne justifie pas un rendu Mermaid : seul le passage d'une
     * disposition à l'autre le justifie, et il n'arrive qu'au franchissement du seuil.</p>
     */
    @HostListener('window:resize')
    surRedimensionnement(): void {
        if (this.direction || this.dispositionChoisie) {
            return;
        }
        const disposition = this.dispositionEffective;
        if (disposition !== this.dispositionDessinee) {
            this.planifierLeRendu();
        }
    }

    // ------------------------------------------------------------------ construction du source

    /**
     * Source `stateDiagram-v2` du circuit, et les drapeaux « retour » de ses arêtes.
     *
     * <p>Nos transitions sont portées par leur étape d'origine : c'est elle qui donne le départ de
     * l'arête. Une transition marquée terminale mène à la sortie du diagramme, comme une étape qui
     * n'offre aucune action.</p>
     */
    private construire(circuit?: WorkflowDto): { code: string; retours: boolean[] } {
        const etapes = this.etapesTriees(circuit);
        if (etapes.length === 0) {
            return { code: '', retours: [] };
        }

        const rangParCode = new Map<string, number>();
        etapes.forEach((etape, index) => rangParCode.set(this.cleDe(etape, index), index));

        const lignes: string[] = ['stateDiagram-v2', `  direction ${this.dispositionEffective}`];
        const retours: boolean[] = [];

        etapes.forEach((etape, index) =>
            lignes.push(`  state "${this.libelle(etape.nomEtape || this.cleDe(etape, index))}" `
                + `as ${this.identifiant(this.cleDe(etape, index))}`));

        // La première étape est celle de plus petit ordre : le moteur ouvre là.
        lignes.push(`  [*] --> ${this.identifiant(this.cleDe(etapes[0], 0))}`);
        retours.push(false);

        etapes.forEach((etape, index) => {
            const depart = this.identifiant(this.cleDe(etape, index));
            const transitions = etape.transitions ?? [];

            if (transitions.length === 0) {
                lignes.push(`  ${depart} --> [*]`);
                retours.push(false);
                return;
            }

            transitions.forEach((transition) => {
                const etiquette = this.libelle(transition.label || transition.decision || '');
                if (transition.terminal || !transition.toStepCode) {
                    lignes.push(`  ${depart} --> [*]${etiquette ? ` : ${etiquette}` : ''}`);
                    retours.push(false);
                    return;
                }
                lignes.push(`  ${depart} --> ${this.identifiant(transition.toStepCode)}`
                    + `${etiquette ? ` : ${etiquette}` : ''}`);
                const rangDestination = rangParCode.get(transition.toStepCode);
                // Un retour est une transition qui remonte : c'est ce qu'on cherche en relisant un
                // circuit, et rien ne le distingue d'une avancée dans une liste.
                retours.push(rangDestination !== undefined && rangDestination < index);
            });
        });

        // Une seule classe par étape : deux styles superposés se disputeraient le remplissage, et
        // l'étape en cours doit rester la plus visible du dessin. Seuls les styles employés sont
        // déclarés — un `classDef` inutilisé n'est que du bruit dans le source.
        const parcourues = new Set((this.etapesParcourues ?? []).filter(Boolean));
        const courante = this.etapeCouranteCode ?? null;
        const styles: Record<string, string> = {
            depart: 'fill:#dbeafe,stroke:#3b82f6,color:#1e3a8a,stroke-width:2px',
            fin: 'fill:#dcfce7,stroke:#16a34a,color:#14532d,stroke-width:2px',
            courante: 'fill:#fef3c7,stroke:#f59e0b,color:#78350f,stroke-width:4px',
            parcourue: 'fill:#f1f5f9,stroke:#94a3b8,color:#475569,stroke-width:1px'
        };

        const affectations: { nom: string; style: string }[] = [];
        etapes.forEach((etape, index) => {
            const cle = this.cleDe(etape, index);
            const nom = this.identifiant(cle);
            if (courante && cle === courante) {
                affectations.push({ nom, style: 'courante' });
            } else if (parcourues.has(cle)) {
                affectations.push({ nom, style: 'parcourue' });
            } else if (!courante && index === 0) {
                affectations.push({ nom, style: 'depart' });
            } else if (!courante && this.clotLeCircuit(etape)) {
                affectations.push({ nom, style: 'fin' });
            }
        });

        new Set(affectations.map((affectation) => affectation.style))
            .forEach((style) => lignes.push(`  classDef ${style} ${styles[style]}`));
        affectations.forEach(({ nom, style }) => lignes.push(`  class ${nom} ${style}`));

        return { code: lignes.join('\n'), retours };
    }

    private etapesTriees(circuit?: WorkflowDto): WorkflowStepDto[] {
        return [...(circuit?.steps ?? [])].sort((a, b) => (a.stepOrder ?? 0) - (b.stepOrder ?? 0));
    }

    /** Une étape clôt le circuit si elle n'offre rien, ou si toutes ses actions le terminent. */
    private clotLeCircuit(etape: WorkflowStepDto): boolean {
        const transitions = etape.transitions ?? [];
        return transitions.length === 0
            || transitions.every((transition: WorkflowTransitionDto) =>
                transition.terminal || !transition.toStepCode);
    }

    /** Clé d'une étape : son code, ou son rang à défaut — une étape non enregistrée n'en a pas. */
    private cleDe(etape: WorkflowStepDto, index: number): string {
        return etape.code || `etape_${index + 1}`;
    }

    /**
     * Identifiant Mermaid : lettres, chiffres et soulignés seulement.
     *
     * <p>Une suite de caractères écartés ne donne qu'un souligné : un code accentué ou parenthésé
     * ferait échouer le rendu <b>entier</b> du diagramme, pas seulement l'étape en cause.</p>
     */
    private identifiant(code: string): string {
        return (code || '').replace(/[^A-Za-z0-9_]+/g, '_') || '_';
    }

    /** Libellé d'arête : ni guillemets, ni deux-points, ni retour ligne — Mermaid s'y perdrait. */
    private libelle(texte: string): string {
        return (texte || '').replace(/"/g, "'").replace(/:/g, ' -').replace(/\s+/g, ' ').trim();
    }

    // ------------------------------------------------------------------ rendu

    private async dessiner(): Promise<void> {
        if (!this.codeMermaid) {
            return;
        }
        try {
            const mermaid = (await import('mermaid')).default;
            mermaid.initialize({
                startOnLoad: false,
                securityLevel: 'loose',
                theme: this.themeSombre() ? 'dark' : 'default',
                fontFamily: 'inherit'
            });
            const { svg } = await mermaid.render(`circuit-${++SEQUENCE_RENDU}`, this.codeMermaid);
            const dessin = this.retours.some(Boolean) ? this.colorerLesRetours(svg) : svg;
            this.svg = this.sanitizer.bypassSecurityTrustHtml(dessin);
            this.enErreur = false;
        } catch {
            // Un circuit peut porter des libellés inattendus : mieux vaut le dire que laisser un
            // cadre vide, mais rien de ceci n'empêche de consulter le reste de la fiche.
            this.svg = null;
            this.enErreur = true;
        }
    }

    private themeSombre(): boolean {
        return document.documentElement.classList.contains('app-dark');
    }

    /**
     * Recolore les arêtes de retour — trait, pointe de flèche et libellé.
     *
     * <p>Mermaid émet les arêtes dans l'ordre où elles sont déclarées : c'est ce qui permet de les
     * rapprocher des drapeaux calculés. Si les comptes ne correspondent pas, le rendu d'origine est
     * conservé plutôt que colorié au hasard.</p>
     */
    private colorerLesRetours(svgTexte: string): string {
        const document_ = new DOMParser().parseFromString(svgTexte, 'image/svg+xml');
        const svg = document_.querySelector('svg');
        if (!svg) {
            return svgTexte;
        }

        const traces = Array.from(svg.querySelectorAll('.edgePaths path'));
        const etiquettes = Array.from(svg.querySelectorAll('.edgeLabels .edgeLabel'));
        if (traces.length !== this.retours.length) {
            return svgTexte;
        }

        const defs = svg.querySelector('defs');
        let marqueurRetour = '';

        traces.forEach((trace, i) => {
            if (!this.retours[i]) {
                return;
            }
            trace.setAttribute('style', `stroke:${WorkflowDiagramComponent.COULEUR_RETOUR} !important;`);

            const reference = trace.getAttribute('marker-end')?.match(/#([^)"]+)/)?.[1];
            if (reference && defs) {
                const origine = svg.querySelector(`marker#${CSS.escape(reference)}`);
                if (origine) {
                    if (!marqueurRetour) {
                        const copie = origine.cloneNode(true) as SVGElement;
                        marqueurRetour = `${reference}-retour`;
                        copie.setAttribute('id', marqueurRetour);
                        copie.querySelectorAll('path, circle, polygon').forEach((forme) => {
                            forme.setAttribute('fill', WorkflowDiagramComponent.COULEUR_RETOUR);
                            forme.setAttribute('stroke', WorkflowDiagramComponent.COULEUR_RETOUR);
                        });
                        defs.appendChild(copie);
                    }
                    trace.setAttribute('marker-end', `url(#${marqueurRetour})`);
                }
            }

            const etiquette = etiquettes[i] as HTMLElement | undefined;
            if (etiquette) {
                const couleur = `color:${WorkflowDiagramComponent.COULEUR_RETOUR};`;
                etiquette.setAttribute('style', couleur);
                etiquette.querySelectorAll('*')
                    .forEach((element) => (element as HTMLElement).setAttribute('style', couleur));
            }
        });

        return new XMLSerializer().serializeToString(svg);
    }

    // ------------------------------------------------------------------ export

    /**
     * Enregistre le diagramme en PNG.
     *
     * <p>Un circuit se relit en réunion, sur un support qui n'est pas l'application : le SVG est
     * redessiné sur un fond opaque — sans lui, l'image serait transparente et illisible sur la
     * plupart des supports — puis doublé en résolution.</p>
     */
    async exporterPng(): Promise<void> {
        const svg = this.conteneur?.nativeElement?.querySelector('svg') as SVGSVGElement | null;
        if (!svg) {
            return;
        }

        this.exportEnCours = true;
        try {
            const cadre = svg.viewBox?.baseVal;
            const largeur = cadre?.width || svg.clientWidth || 800;
            const hauteur = cadre?.height || svg.clientHeight || 600;

            const copie = svg.cloneNode(true) as SVGSVGElement;
            copie.setAttribute('width', String(largeur));
            copie.setAttribute('height', String(hauteur));
            copie.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

            const fond = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            fond.setAttribute('x', '0');
            fond.setAttribute('y', '0');
            fond.setAttribute('width', String(largeur));
            fond.setAttribute('height', String(hauteur));
            fond.setAttribute('fill', this.themeSombre() ? '#1f2937' : '#ffffff');
            copie.insertBefore(fond, copie.firstChild);

            const source = 'data:image/svg+xml;charset=utf-8,'
                + encodeURIComponent(new XMLSerializer().serializeToString(copie));
            const image = new Image();
            await new Promise<void>((resolve, reject) => {
                image.onload = () => resolve();
                image.onerror = () => reject(new Error('SVG illisible'));
                image.src = source;
            });

            const echelle = 2;
            const canevas = document.createElement('canvas');
            canevas.width = largeur * echelle;
            canevas.height = hauteur * echelle;
            const contexte = canevas.getContext('2d');
            if (!contexte) {
                return;
            }
            contexte.scale(echelle, echelle);
            contexte.drawImage(image, 0, 0);

            const blob = await new Promise<Blob | null>((resolve) =>
                canevas.toBlob(resolve, 'image/png'));
            if (!blob) {
                return;
            }

            const lien = document.createElement('a');
            const adresse = URL.createObjectURL(blob);
            lien.href = adresse;
            lien.download = `circuit-${(this.circuit?.nom || 'validation')
                .replace(/[^A-Za-z0-9-_]+/g, '-').toLowerCase()}.png`;
            lien.click();
            URL.revokeObjectURL(adresse);
        } catch {
            // L'export est un agrément : son échec ne doit pas interrompre la consultation.
        } finally {
            this.exportEnCours = false;
        }
    }
}
