/** Un client de l'installation, vu de la plateforme : son identité et l'état de sa licence. */
export interface ClientPlateforme {
    id: string;
    libelleLong: string;
    libelleCourt: string;
    email: string;
    statutLicence: 'ABSENTE' | 'ACTIVE' | 'EXPIREE' | string;
    joursRestants: number | null;
    modules: string[];
}

/** Ce que l'administrateur saisit pour créer un client. */
export interface NouveauClient {
    libelleLong: string;
    libelleCourt: string;
    email: string;
    code: string;
    superAdmin: {
        username: string;
        firstName: string;
        lastName: string;
        email: string;
    };
}

/** Le compte rendu d'une création : chaque étape, et ce qui a échoué par service. */
export interface RapportDeCreation {
    direction: string;
    amorce: Record<string, unknown>;
    superAdmin: string;
}
