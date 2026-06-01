import { Injectable } from '@angular/core';
import { hasAnyPermission } from '../../utils';

@Injectable({
  providedIn: 'root' // Ce paramètre rend le service globalement accessible partout
})
export class RoleService {

  constructor() {}

  // 1. Règle : S'il contient VALIDATION_RQ -> C'est un RQ
  get isRQ(): boolean {
    return hasAnyPermission(['VALIDATION_RQ']);
  }

  // 2. Règle : S'il contient VALIDATION_CHEF et PAS VALIDATION_RQ -> C'est un Pilote (Chef)
  get isChef(): boolean {
    if (this.isRQ) return false;
    return hasAnyPermission(['VALIDATION_CHEF']);
  }

  // 3. Règle : S'il n'a ni VALIDATION_CHEF ni VALIDATION_RQ -> C'est un Agent
  get isAgent(): boolean {
    return !this.isRQ && !this.isChef;
  }

  // Bonus : Si vous utilisiez aussi "isAdmin"
  get isAdmin(): boolean {
    return hasAnyPermission(['ADMIN']);
  }
}
