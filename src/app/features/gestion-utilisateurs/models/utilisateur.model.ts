import { UserInfos, UserResponse } from '../../../models/auth.model';

export type { UserInfos, UserResponse };

export interface AgentPublic {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    matricule?: string;
    fonction?: string;
    telephone?: string;
    user?: UserResponse;
}
