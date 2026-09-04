import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';

/** Un réglage de l'éditeur, et ce qu'il décide réellement. */
interface Reglage {
  /** Intitulé exact du champ dans l'éditeur : c'est ainsi qu'on le retrouve à l'écran. */
  libelle: string;
  /** Ce que ce réglage produit. */
  role: string;
  /**
   * Ce qui se passe s'il est laissé vide.
   *
   * C'est le plus utile et le moins devinable : un champ facultatif ne dit pas ce que le serveur
   * fera à sa place, et l'auteur du circuit découvre l'effet une fois des dossiers engagés.
   */
  aDefaut?: string;
}

/** Un bloc du guide : un moment de la saisie, ses réglages, et ce qu'il faut en comprendre. */
interface SectionGuide {
  titre: string;
  icone: string;
  propos: string;
  reglages: Reglage[];
}

/**
 * Guide de lecture de l'éditeur de circuits.
 *
 * <p>L'éditeur expose la totalité du contrat du serveur — état de traitement, fin de circuit
 * déclarée, condition métier, portée des champs, champ désignant le titulaire. Chacun de ces
 * réglages est juste, mais aucun ne dit ce qu'il produit : les libellés d'aide tiennent en une
 * ligne sous le champ, et l'effet d'un champ laissé vide n'y figure pas. Or c'est précisément là
 * que se prennent les décisions qu'on ne peut plus défaire sans toucher aux dossiers en cours.</p>
 *
 * <p>Le guide est donc rédigé <b>en regard de l'écran</b> : mêmes intitulés, même ordre, et pour
 * chaque réglage ce qu'il décide, puis ce que fait le serveur en son absence. Il se consulte
 * pendant la saisie, sans fermer le circuit en cours d'édition — d'où un dialogue ouvert depuis
 * l'écran plutôt qu'une page d'aide, qui aurait obligé à quitter et à tout ressaisir.</p>
 *
 * <p>À ne pas confondre avec {@code app-workflow-guidance}, qui s'adresse au <b>décideur</b> et lui
 * dit où en est un dossier donné. Celui-ci s'adresse à l'<b>auteur du circuit</b> et ne parle que
 * de configuration.</p>
 *
 * @example
 * <app-workflow-configuration-guide [(visible)]="guideOuvert"></app-workflow-configuration-guide>
 */
@Component({
  selector: 'app-workflow-configuration-guide',
  standalone: true,
  imports: [CommonModule, ButtonModule, DialogModule, TagModule],
  template: `
    <p-dialog 
      [visible]="visible" 
      (visibleChange)="visibleChange.emit($event)" 
      [modal]="true"
      [draggable]="false" 
      [maximizable]="true"
      maskStyleClass="backdrop-blur-sm"
      [style]="{ width: '58rem' }"
      [breakpoints]="{ '1199px': '75vw', '575px': '90vw' }"
      header="Comprendre la configuration d'un circuit">

      <ng-template pTemplate="header">
        <div class="flex flex-col items-start sm:flex-row sm:items-center sm:gap-2 gap-4">
          <div class="flex items-center justify-center w-12 h-12 rounded-xl shrink-0 bg-sky-50 dark:bg-sky-950/50 text-sky-600">
            <i class="pi pi-question-circle text-xl"></i>
          </div>
          <div>
            <h4 class="text-lg font-semibold text-surface-900 dark:text-surface-0 m-0">
              Comprendre la configuration d'un circuit
            </h4>
            <p class="text-sm text-surface-500 m-0 mt-1 leading-snug">
              Principes, étapes, transitions et règles de validation des circuits
            </p>
          </div>
        </div>
      </ng-template>

      <div class="flex flex-col gap-5 text-sm">

        <div class="bg-sky-50 dark:bg-sky-800/50 p-4 rounded-lg border-l-4 border-l-sky-500">
          <p class="m-0 text-slate-700 dark:text-surface-300 leading-relaxed">
            Un circuit décrit la suite des décisions par lesquelles passe un dossier — un document,
            une non-conformité, un plan d'action, une demande sur document. C'est lui, et lui seul,
            qui détermine les boutons offerts au décideur, ce qu'il doit saisir, qui est averti, et
            l'état que le dossier prend ensuite.
          </p>
        </div>

        @for (section of sections; track section.titre; let rang = $index) {
          <section class="rounded-lg border border-surface-200 overflow-hidden">
            <div class="flex items-center gap-2 bg-surface-50 px-3 py-2 border-b border-surface-200">
              <span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-contrast text-xs font-bold">
                {{ rang + 1 }}
              </span>
              <i class="text-surface-500" [ngClass]="section.icone"></i>
              <span class="font-semibold">{{ section.titre }}</span>
            </div>

            <div class="p-3 flex flex-col gap-3">
              <p class="m-0 text-surface-600">{{ section.propos }}</p>

              <div class="flex flex-col divide-y divide-surface-100">
                @for (reglage of section.reglages; track reglage.libelle) {
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-3 py-2">
                    <div class="font-medium text-surface-700">{{ reglage.libelle }}</div>
                    <div class="md:col-span-2 flex flex-col gap-1">
                      <span class="text-surface-600">{{ reglage.role }}</span>
                      @if (reglage.aDefaut) {
                        <span class="text-xs text-surface-500">
                          <i class="pi pi-info-circle text-[10px] mr-1"></i>
                          <span class="italic">Laissé vide :</span> {{ reglage.aDefaut }}
                        </span>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          </section>
        }

        <!-- Ce que le circuit produit une fois enregistré : sans cela, l'auteur ne voit que son
             formulaire et doit dérouler un dossier en vrai pour savoir ce qu'il a configuré. -->
        <section class="rounded-lg border border-surface-200 overflow-hidden">
          <div class="flex items-center gap-2 bg-surface-50 px-3 py-2 border-b border-surface-200">
            <i class="pi pi-eye text-surface-500"></i>
            <span class="font-semibold">Ce que le circuit produit, une fois enregistré</span>
          </div>
          <!-- Une liste à puces ne peut pas être en flex : l'affichage list-item des éléments,
               qui porte la puce, y est remplacé. D'où space-y plutôt que gap. -->
          <ul class="m-0 p-3 pl-8 list-disc space-y-2 text-surface-600">
            @for (effet of effets; track effet) {
              <li>{{ effet }}</li>
            }
          </ul>
        </section>

        <!-- Les refus du serveur sont explicites, mais ils arrivent après la saisie. Les annoncer
             ici épargne un circuit composé pour rien. -->
        <section class="rounded-lg border border-orange-200 bg-orange-50 overflow-hidden">
          <div class="flex items-center gap-2 px-3 py-2 border-b border-orange-200 text-orange-900">
            <i class="pi pi-exclamation-triangle"></i>
            <span class="font-semibold">Ce qui se passe mal, et pourquoi</span>
          </div>
          <ul class="m-0 p-3 pl-8 list-disc space-y-2 text-orange-900">
            @for (piege of pieges; track piege) {
              <li>{{ piege }}</li>
            }
          </ul>
        </section>

        <section class="rounded-lg border border-surface-200 overflow-hidden">
          <div class="flex items-center gap-2 bg-surface-50 px-3 py-2 border-b border-surface-200">
            <i class="pi pi-sitemap text-surface-500"></i>
            <span class="font-semibold">Un exemple lu de bout en bout</span>
          </div>
          <div class="p-3 flex flex-col gap-3">
            <p class="m-0 text-surface-600">
              Le traitement d'une non-conformité, tel qu'il se configure ici. Chaque étape ne
              retient que ce qui la distingue.
            </p>
            @for (etape of exemple; track etape.nom; let i = $index) {
              <div class="flex gap-3">
                <span class="flex items-center justify-center w-6 h-6 shrink-0 rounded-full bg-surface-200 text-surface-700 text-xs font-bold">
                  {{ i + 1 }}
                </span>
                <div class="flex flex-col gap-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-medium">{{ etape.nom }}</span>
                    <p-tag severity="secondary" [value]="etape.role"></p-tag>
                  </div>
                  <span class="text-surface-600">{{ etape.ceQuiSYPasse }}</span>
                </div>
              </div>
            }
          </div>
        </section>
      </div>

      <ng-template pTemplate="footer">
        <p-button label="Fermer" severity="secondary" [text]="true"
                  (onClick)="visibleChange.emit(false)"></p-button>
      </ng-template>
    </p-dialog>
  `
})
export class WorkflowConfigurationGuideComponent {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  /**
   * Les sections suivent l'ordre de saisie de l'éditeur — circuit, étape, actions, champs.
   *
   * Le contenu est porté par le composant plutôt qu'écrit dans le gabarit : la formulation d'un
   * réglage change avec le réglage lui-même, et les rassembler ici évite qu'une correction faite
   * dans l'éditeur laisse le guide dire le contraire depuis le milieu d'un fichier de mise en page.
   */
  readonly sections: SectionGuide[] = [
    {
      titre: 'Le circuit et son type de ressource',
      icone: 'pi pi-share-alt',
      propos:
        "Un dossier prend le circuit actif de son type au moment où il démarre, et le garde " +
        "jusqu'au bout : modifier un circuit ne rejoue pas les dossiers déjà engagés.",
      reglages: [
        {
          libelle: 'Nom du circuit',
          role: 'Ce sous quoi il se retrouve dans la liste. Obligatoire.'
        },
        {
          libelle: 'Type de ressource',
          role:
            "La famille de dossiers qu'il pilote — documents, non-conformités, plans d'action. " +
            "Elle détermine quel module métier recevra l'avancement du dossier."
        },
        {
          libelle: 'Description',
          role: "Ce à quoi ce circuit sert, pour qui le retrouvera dans six mois."
        },
        {
          libelle: 'Réservé à un type de document',
          role:
            "Restreint ce circuit aux documents d'un type — les procédures, les enregistrements. " +
            "C'est ici, et nulle part ailleurs, que se règle « ce type suit ce circuit » : le type " +
            "de document, lui, ne désigne rien. Un type ne peut suivre qu'un circuit à la fois, et " +
            "le serveur refuse le second.",
          aDefaut:
            "le circuit vaut pour toute sa famille : c'est lui que prennent les documents dont le " +
            "type n'a pas de circuit réservé. Il n'y en a qu'un par famille."
        },
        {
          libelle: 'Circuit actif',
          role:
            "Un circuit désactivé n'est plus ouvrable : le moteur le refuse sur tout nouveau " +
            "dossier, même si un type de document le désigne nommément. Plusieurs circuits d'une " +
            "même famille peuvent donc rester actifs — c'est même la règle dès qu'on attribue un " +
            "circuit par type de document. Les dossiers qui n'en désignent aucun prennent le plus " +
            "ancien des circuits actifs de la famille.",
          aDefaut:
            "un circuit inactif reste consultable et continue de porter les dossiers déjà " +
            "engagés, mais aucun nouveau dossier n'y entre."
        }
      ]
    },
    {
      titre: 'Les étapes',
      icone: 'pi pi-list',
      propos:
        "Le dossier stationne à une étape jusqu'à ce que quelqu'un y prenne une décision. Tout " +
        "dossier démarre à la première étape de la liste ; les flèches en changent l'ordre.",
      reglages: [
        {
          libelle: 'Pré-remplir depuis le catalogue',
          role:
            "Reprend le nom, le rôle, la description et le code d'une étape type. C'est ce qui " +
            "fait qu'une « Vérification » porte le même code dans tous les circuits, et rend les " +
            "dossiers comparables d'un circuit à l'autre.",
          aDefaut: "l'étape reçoit un code dérivé de son nom, propre à ce circuit."
        },
        {
          libelle: "Nom de l'étape",
          role: "Ce que lit le décideur, et ce qui s'affiche sur le dossier. Obligatoire."
        },
        {
          libelle: 'Rôle responsable',
          role:
            "Qui décide à cette étape : les actions ne sont proposées qu'aux porteurs de ce rôle, " +
            "et c'est à eux que part la notification d'arrivée. Obligatoire."
        },
        {
          libelle: 'État de traitement',
          role:
            "La valeur transmise au module métier pour refléter l'avancement du dossier " +
            "(« VALIDATION_RS », « CLOTURE »…). C'est elle que lisent les écrans et les tableaux " +
            "de bord du module — pas le nom de l'étape, qui n'est qu'un libellé.",
          aDefaut: "le dossier conserve l'état de traitement qu'il portait déjà."
        },
        {
          libelle: "Notification à l'arrivée",
          role:
            "Le modèle de courriel envoyé aux porteurs du rôle responsable dès que le dossier " +
            "atteint cette étape.",
          aDefaut: "personne n'est averti ; l'étape n'est vue que par qui consulte ses dossiers."
        },
        {
          libelle: 'Champ désignant le titulaire',
          role:
            "La personne saisie dans ce champ devient le titulaire du dossier, et les étapes " +
            "réservées au titulaire ne s'ouvriront qu'à elle. C'est ainsi qu'une imputation nomme " +
            "quelqu'un sans qu'il faille inventer un rôle « agent imputé », qui aurait ouvert le " +
            "traitement de tout dossier à tout agent imputable.",
          aDefaut: "l'étape ne désigne personne ; les étapes suivantes restent ouvertes à un rôle."
        },
        {
          libelle: "Code de l'étape (badge gris)",
          role:
            "L'identité fonctionnelle de l'étape : les actions le désignent comme destination et " +
            "les dossiers en cours s'y rapportent. Il est fixé à la création et ne se modifie " +
            "plus — renommer l'étape est sans risque, son code ne suit pas."
        }
      ]
    },
    {
      titre: "Les actions proposées à l'étape",
      icone: 'pi pi-directions',
      propos:
        "Une étape propose autant d'actions qu'il en faut, et plusieurs peuvent être de même " +
        "nature : « Valider » et « Demander un complément » approuvent l'une comme l'autre, mais " +
        "ne mènent pas au même endroit et n'attendent pas la même saisie.",
      reglages: [
        {
          libelle: 'Nature',
          role:
            "Approbation — le dossier avance — ou rejet — il revient en arrière. Elle donne " +
            "l'apparence du bouton par défaut, l'issue publiée au module métier à la fin du " +
            "circuit, et sert de portée aux champs à renseigner."
        },
        {
          libelle: "Code de l'action",
          role:
            "Identifie l'action au sein de son étape : c'est par lui qu'un champ se rattache à " +
            "une action précise, et c'est lui qui apparie les actions quand le circuit est " +
            "modifié plus tard.",
          aDefaut:
            "le nom de la nature en tient lieu, ce qui suffit tant que l'étape n'offre qu'une " +
            "seule action de cette nature."
        },
        {
          libelle: 'Destination',
          role:
            "L'étape où le dossier se rend. « Fin du circuit » le termine : cette fin est " +
            "déclarée, jamais devinée."
        },
        {
          libelle: 'Rôle exigé',
          role:
            "Restreint cette seule action à un rôle plus étroit que celui de l'étape — utile " +
            "quand une même étape offre une issue ordinaire et une issue réservée.",
          aDefaut: "l'action est ouverte au rôle responsable de l'étape."
        },
        {
          libelle: 'Libellé, icône et couleur du bouton',
          role:
            "Ce que voit le décideur ; l'aperçu montre le bouton tel qu'il sera rendu. Un renvoi " +
            "en correction et un refus ferme sont deux rejets : la couleur est ce qui les " +
            "distingue à l'écran.",
          aDefaut:
            "la coche verte de l'approbation ou la croix rouge du rejet, et le nom de la nature " +
            "comme libellé."
        },
        {
          libelle: 'Condition à remplir',
          role:
            "Un fait que le dossier doit porter pour que l'action soit possible — " +
            "« PLANS_ACTION_SOLDES », par exemple. C'est le module métier qui l'inscrit sur le " +
            "dossier quand la condition devient vraie ; le circuit ne fait que l'exiger, sans " +
            "avoir à connaître les plans d'action.",
          aDefaut: "l'action est franchissable sans condition, ce qui est le cas de la plupart."
        },
        {
          libelle: 'Ce que la condition veut dire',
          role:
            "La phrase montrée à celui qui attend que le dossier avance. Le nom du fait est " +
            "technique ; c'est à l'auteur du circuit de l'écrire en clair, là où il pose la " +
            "condition.",
          aDefaut: "l'écran ne peut afficher que le nom technique du fait."
        }
      ]
    },
    {
      titre: 'Les champs à renseigner pour décider',
      icone: 'pi pi-pencil',
      propos:
        "Ce que le décideur saisit en même temps que sa décision. Les valeurs restent dans " +
        "l'historique du dossier et sont transmises au module métier, qui peut les recopier dans " +
        "sa propre donnée — un justificatif de rejet, l'agent à qui le dossier est imputé.",
      reglages: [
        {
          libelle: 'Libellé affiché et nom technique',
          role:
            "Le premier est lu par le décideur ; le second est la clé sous laquelle le module " +
            "métier retrouve la valeur. Le changer coupe ce rattachement pour les dossiers à venir."
        },
        {
          libelle: 'Type',
          role:
            "Texte court ou long, nombre, date, liste de choix, fichier. Un champ « Fichier » " +
            "attend un dépôt, dont seule la référence circule jusqu'au module métier."
        },
        {
          libelle: 'Valeurs proposées (liste de choix)',
          role:
            "Une liste écrite à la main convient à « Oui, Non ». Adossée au référentiel — " +
            "structures, utilisateurs, agents de ma structure — elle suit les créations et les " +
            "corrections de libellé sans qu'on remanie le circuit."
        },
        {
          libelle: 'Demandé lors de',
          role:
            "Restreint le champ à une nature de décision : un justificatif de rejet n'est pas " +
            "réclamé à qui approuve.",
          aDefaut: "le champ est demandé quelle que soit la décision prise."
        },
        {
          libelle: "Demandé par l'action",
          role:
            "La portée la plus étroite : le champ n'est demandé que par l'action nommée. Sans " +
            "elle, le motif exigé par « Demander un complément » serait réclamé à qui valide " +
            "simplement, puisque les deux approuvent.",
          aDefaut: "toutes les actions de l'étape le demandent, selon leur nature."
        },
        {
          libelle: 'Requis',
          role:
            "La décision est refusée tant que le champ est vide, et le contrôle a lieu avant le " +
            "franchissement : le dossier ne bouge pas."
        }
      ]
    }
  ];

  /** Ce que le circuit déclenche réellement, une fois enregistré. */
  readonly effets: string[] = [
    "Sur son dossier, le décideur ne voit que les actions que son rôle lui ouvre à l'étape " +
      "courante — elles ne sont pas déduites d'un statut, elles sont demandées au moteur.",
    "Une action dont la condition n'est pas remplie est annoncée comme en attente, avec la " +
      "phrase que vous avez écrite, plutôt que passée sous silence.",
    "Chaque décision est consignée dans l'historique du dossier avec son auteur, son " +
      "commentaire et les valeurs saisies.",
    "À chaque franchissement, le module métier reçoit l'étape atteinte, son état de traitement " +
      "et les saisies ; à la fin du circuit, il reçoit l'issue — approuvée ou rejetée.",
    "Plusieurs dossiers cochés ensemble n'ouvrent une action commune que s'ils sont à la même " +
      "étape et que cette action vous est ouverte sur chacun."
  ];

  /** Les refus et les silences du serveur, annoncés avant d'avoir composé un circuit pour rien. */
  readonly pieges: string[] = [
    "Un circuit désactivé qu'un type de document désigne encore : le dépôt échoue en « circuit " +
      "désactivé », alors que la configuration du type paraît complète. Désactiver un circuit " +
      "suppose de vérifier quels types le nomment.",
    "Retirer une étape remet à vide les destinations qui la visaient : ces actions clôtureraient " +
      "alors le dossier. Il faut leur redonner une destination.",
    "Une étape déjà enregistrée refuse de changer de code : le serveur répond en erreur plutôt " +
      "que de laisser les dossiers en cours pointer vers une étape qui n'existe plus.",
    "Modifier un circuit sur lequel des dossiers stationnent est refusé pour les étapes " +
      "concernées ; le message d'erreur nomme ce qui bloque. Supprimer un circuit l'est aussi " +
      "tant qu'un dossier y est en cours.",
    "Deux actions de même nature sur une même étape empêchent la décision groupée, qui ne " +
      "désigne l'action que par sa nature : ces dossiers doivent être traités un par un."
  ];

  /** Un circuit réel, lu de bout en bout : chaque étape n'y montre que ce qui la distingue. */
  readonly exemple: { nom: string; role: string; ceQuiSYPasse: string }[] = [
    {
      nom: 'Déclaration',
      role: 'Déclarant',
      ceQuiSYPasse:
        "Une seule action, « Soumettre la NC », qui approuve et mène à la réception. C'est la " +
        "première étape de la liste : tout dossier y démarre."
    },
    {
      nom: 'Réception',
      role: 'Responsable qualité',
      ceQuiSYPasse:
        "« Transmettre » approuve et mène à l'imputation. « Renvoyer au déclarant » rejette et " +
        "revient à la déclaration, en exigeant un champ Fichier requis, demandé lors d'un rejet " +
        "seulement — le module métier rattachera le justificatif au dossier."
    },
    {
      nom: 'Imputation',
      role: 'Responsable qualité',
      ceQuiSYPasse:
        "Un champ « Agent imputé », alimenté par les agents de ma structure, est désigné comme " +
        "champ du titulaire : l'étape suivante ne s'ouvrira qu'à la personne ainsi nommée."
    },
    {
      nom: 'Traitement',
      role: 'Titulaire du dossier',
      ceQuiSYPasse:
        "« Clôturer » a pour destination « Fin du circuit » et pour condition le fait " +
        "PLANS_ACTION_SOLDES : tant que les plans d'action ne sont pas soldés, l'action est " +
        "annoncée comme en attente au lieu d'être proposée."
    }
  ];
}
