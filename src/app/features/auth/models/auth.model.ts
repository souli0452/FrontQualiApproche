export interface LoginRequest {
    username: string;
    password: string;
    refreshToken?: string;
}

export interface AuthData {
    appRoles: string[];
    expires_in: number;
    fonction?: string | null;
    licenseActive: boolean;
    licenseDaysRemaining: number;
    modulesSubscribed: string[];
    permissions: string[];
    /**
     * Le compte administre la plateforme : il crée les clients, et ne voit rien de leurs données.
     * Le jeton vit en cookie HttpOnly — c'est `/me` qui le dit au frontal.
     */
    plateformeAdmin?: boolean;
    refresh_expires_in: number;
    scope: string;
    token_type: string;
    user: UserResponse;
}

export interface UserResponse {
    userId: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    fonction?: string | null;
    phoneNumber?: string | null;
    emailVerified?: boolean;
    structure: string;
    roles: string[];
    permissions?: string[];
    appRoles?: string[];
    licenseActive?: boolean;
    licenseDaysRemaining?: number;
    enabled?: boolean;
}

export interface UserInfos {
    createdById?: string;
    createdAt?: Date;
    updateById?: string;
    updateAt?: Date;
    currentUserEmail?: string;
    currentUserfullName?: string;
}
