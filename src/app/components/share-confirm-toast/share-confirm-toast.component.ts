import {Component, OnInit} from '@angular/core';
import { NgPrimeModule } from '../../../prime-ng.module';

@Component({
  selector: 'app-share-confirm-toast',
  standalone: true,
  templateUrl: './share-confirm-toast.component.html',
  styleUrl: './share-confirm-toast.component.scss',
  imports: [NgPrimeModule]
})
export class ShareConfirmToastComponent implements OnInit {

    constructor() { }

    ngOnInit(): void {
    }

}
