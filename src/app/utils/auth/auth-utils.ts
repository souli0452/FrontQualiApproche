import { currentUserState } from "../../services/auth-services/auth.state";


export function isUserInRoles(roles: string[]): boolean {
    const authData = currentUserState.value; // Lecture synchrone en mémoire !
    
    if (!authData || !authData.user || !authData.user.roles) return false;
    return roles.some(role => authData.user.roles.includes(role));
}

export function hasAnyPermission(permissions: string[]): boolean {
    const authData = currentUserState.value;
    if (!authData || !authData.permissions) return false;
    return permissions.some(p => authData.permissions.includes(p));
}

export function hasAllPermissions(permissions: string[]): boolean {
    const authData = currentUserState.value;
    if (!authData || !authData.permissions) return false;
    return permissions.every(p => authData.permissions.includes(p));
}

export function isLicenseActive(): boolean {
    const authData = currentUserState.value;
    return authData?.licenseActive || false;
}

export function isModuleSubscribed(moduleName: string): boolean {
    const authData = currentUserState.value;
    return authData?.modulesSubscribed?.includes(moduleName) || false;
}
