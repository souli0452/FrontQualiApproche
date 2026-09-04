import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';

@Component({
  selector: 'app-alert-message',
  standalone: true,
  templateUrl: './alert-message.component.html',
  styleUrl: './alert-message.component.scss',
  imports: [Toast]
})
export class AlertMessageComponent {
  constructor(public messageService: MessageService) {
        console.log('[AlertMessageComponent] Monté avec MessageService ID :', (this.messageService as any));
    }
}
