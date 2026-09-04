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
    type: string;
    header: string;
    filter: boolean;
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
     *
     * <p>La sévérité est portée par la donnée, non déduite du libellé de la colonne : deux écrans
     * peuvent nommer « État » des choses qui ne se colorent pas de la même façon.</p>
     */
    severityField?: string;
    colorField?: string;  // <-- À ajouter
    max?: number; 
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