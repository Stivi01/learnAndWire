import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RecoveryService } from '../../core/services/recovery';
import { ToastService } from '../../core/services/toast';
import { isPasswordValid } from '../../core/validators/password.validator';

interface ForgotPasswordForm {
  email: string;
  recoveryCode: string;
  newPassword: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-forgot-password-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="closeModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <h2 class="modal-title">Resetează Parola</h2>
          <button type="button" class="close-button" (click)="closeModal()">
            <span>×</span>
          </button>
        </div>

        <!-- Body -->
        <div class="modal-body">
          <p class="info-text">
            Introdu emailul tău și codul de recuperare (din mesajele pe care le-ai salvat la înregistrare).
          </p>

          <form #forgotForm="ngForm" (ngSubmit)="submitReset(forgotForm)" class="form-group">
            
            <!-- Email -->
            <div class="form-field">
              <label for="forgotEmail" class="label">Email</label>
              <input
                type="email"
                id="forgotEmail"
                [(ngModel)]="formData.email"
                name="email"
                #emailInput="ngModel"
                placeholder="your@email.com"
                class="input-field"
                required
                email
              />
              <div *ngIf="emailInput.invalid && (emailInput.dirty || emailInput.touched)" class="error-message">
                <small *ngIf="emailInput.errors?.['required']">Emailul este obligatoriu.</small>
                <small *ngIf="emailInput.errors?.['email']">Formatul emailului nu este valid.</small>
              </div>
            </div>

            <!-- Recovery Code -->
            <div class="form-field">
              <label for="recoveryCode" class="label">Cod de Recuperare</label>
              <input
                type="text"
                id="recoveryCode"
                [(ngModel)]="formData.recoveryCode"
                name="recoveryCode"
                #codeInput="ngModel"
                placeholder="ABC3-D4EF-GH (sau ABCD1EFGH)"
                class="input-field"
                required
              />
              <small class="help-text">Codul pe care l-ai salvat la înregistrare</small>
              <div *ngIf="codeInput.invalid && (codeInput.dirty || codeInput.touched)" class="error-message">
                <small *ngIf="codeInput.errors?.['required']">Codul este obligatoriu.</small>
              </div>
            </div>

            <!-- New Password -->
            <div class="form-field">
              <label for="newPassword" class="label">Parolă Nouă</label>
              <input
                type="password"
                id="newPassword"
                [(ngModel)]="formData.newPassword"
                name="newPassword"
                #pwInput="ngModel"
                placeholder="Min. 8 caractere (mare, mică, cifră, caracter special)"
                class="input-field"
                required
                minlength="8"
              />
              <div *ngIf="pwInput.invalid && (pwInput.dirty || pwInput.touched)" class="error-message">
                <small *ngIf="pwInput.errors?.['required']">Parola este obligatorie.</small>
                <small *ngIf="pwInput.errors?.['minlength']">Parola trebuie să aibă minimum 8 caractere.</small>
              </div>
            </div>

            <!-- Confirm Password -->
            <div class="form-field">
              <label for="confirmPassword" class="label">Confirmă Parola</label>
              <input
                type="password"
                id="confirmPassword"
                [(ngModel)]="formData.confirmPassword"
                name="confirmPassword"
                #confirmInput="ngModel"
                placeholder="Confirmă noua parolă"
                class="input-field"
                required
              />
              <div *ngIf="confirmInput.invalid && (confirmInput.dirty || confirmInput.touched)" class="error-message">
                <small *ngIf="confirmInput.errors?.['required']">Confirmarea parolei este obligatorie.</small>
              </div>
              <div *ngIf="formData.newPassword && formData.confirmPassword && formData.newPassword !== formData.confirmPassword" class="error-message">
                <small>Parolele nu se potrivesc.</small>
              </div>
            </div>

            <!-- Buttons -->
            <div class="button-group">
              <button type="button" class="btn-secondary" (click)="closeModal()" [disabled]="loading">
                Anulează
              </button>
              <button type="submit" class="btn-primary" [disabled]="loading || formData.newPassword !== formData.confirmPassword">
                {{ loading ? 'Se procesează...' : 'Resetează Parolă' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      border-bottom: 1px solid #e5e7eb;
    }

    .modal-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }

    .close-button {
      background: none;
      border: none;
      font-size: 2rem;
      color: #6b7280;
      cursor: pointer;
      padding: 0;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: all 0.2s;
    }

    .close-button:hover {
      background-color: #f3f4f6;
      color: #111827;
    }

    .modal-body {
      padding: 24px;
    }

    .info-text {
      color: #6b7280;
      font-size: 0.875rem;
      margin-bottom: 20px;
      line-height: 1.5;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .label {
      font-weight: 600;
      color: #374151;
      font-size: 0.875rem;
    }

    .input-field {
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.875rem;
      transition: all 0.2s;
    }

    .input-field:focus {
      outline: none;
      border-color: #22c55e;
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
    }

    .help-text {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .error-message {
      color: #ef4444;
      font-size: 0.75rem;
    }

    .button-group {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
    }

    .btn-primary,
    .btn-secondary {
      padding: 10px 20px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .btn-primary {
      background-color: #22c55e;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background-color: #16a34a;
    }

    .btn-primary:disabled {
      background-color: #d1d5db;
      cursor: not-allowed;
    }

    .btn-secondary {
      background-color: #f3f4f6;
      color: #374151;
    }

    .btn-secondary:hover:not(:disabled) {
      background-color: #e5e7eb;
    }

    .btn-secondary:disabled {
      background-color: #f3f4f6;
      cursor: not-allowed;
      opacity: 0.6;
    }
  `]
})
export class ForgotPasswordModal {
  @Input() isOpen = false;
  @Output() onClose = new EventEmitter<void>();

  loading = false;
  formData: ForgotPasswordForm = {
    email: '',
    recoveryCode: '',
    newPassword: '',
    confirmPassword: ''
  };

  private recoveryService = inject(RecoveryService);
  private toastService = inject(ToastService);

  closeModal() {
    this.onClose.emit();
    this.resetForm();
  }

  submitReset(form: NgForm) {
    if (form.invalid || this.formData.newPassword !== this.formData.confirmPassword) {
      this.toastService.show('Completeaza corect toate campurile!', 'error');
      return;
    }

    // Validare parolă
    if (!isPasswordValid(this.formData.newPassword)) {
      this.toastService.show(
        'Parola trebuie să aibă min. 8 caractere, o literă mare, o literă mică, o cifră și un caracter special.',
        'error'
      );
      return;
    }

    this.loading = true;

    this.recoveryService.verifyCode(
      this.formData.email,
      this.formData.recoveryCode,
      this.formData.newPassword
    ).subscribe({
      next: (response) => {
        this.loading = false;
        this.toastService.show(response.message, 'success');
        this.closeModal();
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.message || 'Eroare la resetarea parolei.';
        this.toastService.show(msg, 'error');
      }
    });
  }

  private resetForm() {
    this.formData = {
      email: '',
      recoveryCode: '',
      newPassword: '',
      confirmPassword: ''
    };
  }
}
