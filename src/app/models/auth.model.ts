export interface LoginRequest {
    username: String;
    password: String;
    refreshToken: String;
}

export interface AuthData {
  appRoles: string[];
  expires_in: number;
  fonction?: string | null;
  licenseActive: boolean;
  licenseDaysRemaining: number;
  modulesSubscribed: string[];
  permissions: string[];
  refresh_expires_in: number;
  scope: string;
  token_type: string;
  user: UserResponse;
}


export interface UserResponse{
  userId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fonction?: string | null;
  structure: string;
  roles: string[];
  permissions?: string[];
  appRoles?: string[];
  licenseActive?: boolean;
  licenseDaysRemaining?: number;
  enabled?: boolean
}

export interface UserInfos {
    createdById?: string;
    createdAt?: Date;
    updateById?: string;
    updateAt?: Date;
    currentUserEmail?: string;
    currentUserfullName?: string;
}