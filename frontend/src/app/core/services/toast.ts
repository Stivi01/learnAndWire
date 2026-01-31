import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  // semnal de array de mesaje
  public toasts = signal<ToastMessage[]>([]);

  show(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const newToast: ToastMessage = { message, type };
    this.toasts.update(prev => [...prev, newToast]);

    // eliminăm toast-ul după 3 secunde
    setTimeout(() => {
      this.toasts.update(prev => prev.filter(t => t !== newToast));
    }, 3000);
  }
}
