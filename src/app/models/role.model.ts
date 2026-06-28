export const app_roles = {
    NC: ['SUBMIT_NC', 
        'IMPUTATION_NC', 
        'TRAITEMENT_NC', 
        'VALIDATION_NC',
        'RQ_NC',
        'RECEPTION_NC',
        'SUPER_ADMIN'
    ]
};

export interface AppRole {
    id?: string;
    name: string;
    description?: string;
    permissions: string[];
}

export interface Permission {
    label: string;
    value: string;
    module: string;
}

export interface KcRole {
    id?: string;
    name?: string;
    description?: string;
    composite?: boolean;
}
