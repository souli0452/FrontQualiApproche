import { Validators } from "@angular/forms";

export interface FormGroupColumn {
    field?: string;
    type?: string;
    label?: string;
    topLabel?: string;
    helpText?: string;
    header?: string;
    visible?: boolean;
    required?: boolean;
    optionLabel?: string;
    optionValue?: string;
    dropdownList?: any[];
    fileNb?: number;
    validators?: Validators;
    key?: string;
    readonly?: boolean;
    class?: string;
    placeholder?: string;
    min?: number; 
    max?: number; 
    step?: number;
}

export interface TableColumn {
    field: string;
    type?: string;
    header: string;
    filter?: boolean;
    sort?: boolean;
    optionLabel?: string;
    labelTrue?: string;
    labelFalse?: string;
    width?: string;
    compute?: boolean;
    editable?: boolean;
    showValue?: boolean;

    /**
     * Colonne de type `badge` : champ de la ligne portant la sévérité PrimeNG de la pastille
     * (`success`, `warn`, `danger`, `info`, `secondary`). À défaut, la pastille est `info`.
     */
    severityField?: string;
    colorField?: string;
    max?: number;

    /** Champ secondaire pour les colonnes de type 'file' (ex: numéro de référence en sous-titre) */
    subField?: string;
    /** Champ portant le nom de fichier pour déduire l'icône d'extension (si distinct de `field`) */
    fileNameField?: string;
    /** Format personnalisé pour les dates (par défaut: 'dd/MM/yyyy') */
    dateFormat?: string;
    /** Alignement du texte de la colonne */
    align?: 'left' | 'center' | 'right';
}

export interface DropdownSelector {
    field: string;
    dropdownEntries: any[];
}

export interface DropdownData {
    data?: Array<DropdownSelector>;
}

export interface MultiSelectSelector {
    field: string;
    optionLabel?: string;
    multiselectEntries: any[];
}


export interface Message {
    text: string;
    ownerId: number,
    createdAt: number;
}