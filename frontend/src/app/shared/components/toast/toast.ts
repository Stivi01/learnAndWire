import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div *ngFor="let t of toastService.toasts()" class="toast" [ngClass]="t.type">
        {{ t.message }}
      </div>
    </div>
  `,
  styleUrls: ['./toast.scss']
})
export class Toast {
  constructor(public toastService: ToastService) {}
}
