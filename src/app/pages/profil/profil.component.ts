import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Avatar } from 'primeng/avatar';
import { NgPrimeModule } from '../../../prime-ng.module';
import { AuthService } from '../../services/auth-services/auth.service';
import { Structure } from '../structure/structure';
import { getCurrentUserStructure } from '../../utils';
import { Router } from '@angular/router';

@Component({
    selector: 'app-profil',
    imports: [CommonModule, Avatar,NgPrimeModule],
    templateUrl: './profil.component.html',
    styleUrl: './profil.component.scss'
})
export class ProfilComponent {
   user: any={};
   userStructure!:Structure;
constructor(private authService: AuthService,private router: Router,) {
}

ngOnInit() {
    this.user = this.authService.getUser();
    this.userStructure=getCurrentUserStructure();
    console.log(this.user);
}






    editProfile() {
        console.log('Modification du profil...');
    }

    changePassword() {
       this.router.navigate(['reset-password']);
    }
}
