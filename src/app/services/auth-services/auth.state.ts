import { BehaviorSubject } from 'rxjs';
import { AuthData } from '../../models/auth.model';

// Ceci est stocké uniquement dans la RAM du navigateur
export const currentUserState = new BehaviorSubject<AuthData | null>(null);

