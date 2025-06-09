import { Component, OnInit, OnDestroy} from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import {takeUntil} from 'rxjs/operators';
import {Subject} from 'rxjs';
import {AuthService} from "../../services/auth-services/auth.service";
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgPrimeModule } from '../../../prime-ng.module';

@Component({
  selector: 'app-email-verification',
  templateUrl: './email-verification.component.html',
  styleUrl: './email-verification.component.scss',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, NgPrimeModule]
})
export class EmailVerificationComponent implements OnInit, OnDestroy{
    destroy$: Subject<boolean> = new Subject<boolean>();
    emailVerified: boolean | null = null;
    errorMessage="";
    constructor(private router: Router, private authService:AuthService,private route: ActivatedRoute ) {}

    ngOnInit(): void {
        this.checkEmailVerification();
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }


    goToLogin(): void {
        this.router.navigate(['/login']);
    }

    checkEmailVerification(): void {
        const token = this.route.snapshot.queryParamMap.get('token');
        const userId = this.route.snapshot.queryParamMap.get('userId');
        console.log(userId)
        this.authService.isEmailVerified(userId!).pipe(
            takeUntil(this.destroy$)).subscribe({
            next: (res) => {

                    this.emailVerified = res.body;
            },
            error: (error) => {
                if (error.status === 400) {
                    this.errorMessage = 'Les informations fournies sont incorrectes.';
                    this.emailVerified = false;
                } else if (error.status === 404) {
                    this.errorMessage = 'Token invalide ou expiré.';
                    this.emailVerified = false;
                } else {
                    this.errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
                    this.emailVerified = false;
                }
            }
        });
    }

    VerifyEmail(): void {
        const token = this.route.snapshot.queryParamMap.get('token');
        const userId = this.route.snapshot.queryParamMap.get('userId');
        this.authService.emailVerifcation(userId!,token!).pipe(
            takeUntil(this.destroy$)).subscribe({
            next: (res) => {
                if (res.status === 200) {
                    this.emailVerified = true;
                }
            },
            error: (error) => {
                if (error.status === 400 || error.status === 404) {
                    this.emailVerified = false;
                }
            }
        });

    }
}
