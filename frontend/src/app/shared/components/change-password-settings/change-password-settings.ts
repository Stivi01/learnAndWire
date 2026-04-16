import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth';
import { ToastService } from '../../../core/services/toast';

interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

@Component({
  selector: 'app-change-password-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="change-password-section">
      <div class="section-header">
        <h3 class="section-title">
          <span class="icon">🔑</span> Schimbă Parola
        </h3>
        <p class="section-description">
          Actualizează-ți parola pentru a menține contul securizat.
        </p>
      </div>

      <form #changePasswordForm="ngForm" (ngSubmit)="submitChangePassword(changePasswordForm)" class="form-group">
        
        <!-- Old Password -->
        <div class="form-field">
          <label for="oldPassword" class="label">Parola Veche *</label>
          <input
            type="password"
            id="oldPassword"
            [(ngModel)]="formData.oldPassword"
            name="oldPassword"
            #oldPwInput="ngModel"
            placeholder="Introduce-ți parola actuală"
            class="input-field"
            required
          />
          <div *ngIf="oldPwInput.invalid && (oldPwInput.dirty || oldPwInput.touched)" class="error-message">
            <small *ngIf="oldPwInput.errors?.['required']">Parola veche este obligatorie.</small>
          </div>
        </div>

        <!-- New Password -->
        <div class="form-field">
          <label for="newPassword" class="label">Parolă Nouă *</label>
          <input
            type="password"
            id="newPassword"
            [(ngModel)]="formData.newPassword"
            name="newPassword"
            #newPwInput="ngModel"
            placeholder="Min. 8 caractere (mare, mică, cifră, caracter special)"
            class="input-field"
            required
            minlength="8"
            pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$"
          />
          <small class="help-text">
            Min. 8 caractere: o literă MARE, una mică, o cifră și un caracter special
          </small>
          <div *ngIf="newPwInput.invalid && (newPwInput.dirty || newPwInput.touched)" class="error-message">
            <small *ngIf="newPwInput.errors?.['required']">Parola nouă este obligatorie.</small>
            <small *ngIf="newPwInput.errors?.['minlength']">Parola trebuie să aibă minimum 8 caractere.</small>
            <small *ngIf="newPwInput.errors?.['pattern']">Parola trebuie să aibă min. 8 caractere, o literă mare, o literă mică, o cifră și un caracter special.</small>
          </div>
        </div>

        <!-- Confirm Password -->
        <div class="form-field">
          <label for="confirmPassword" class="label">Confirmă Parola Nouă *</label>
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

        <!-- Submit Button -->
        <div class="button-group">
          <button 
            type="submit" 
            class="submit-button"
            [disabled]="isLoading() || changePasswordForm.invalid || formData.newPassword !== formData.confirmPassword"
          >
            {{ isLoading() ? 'Se actualizează...' : 'Actualizează Parola' }}
          </button>
          <button 
            type="button" 
            class="reset-button"
            (click)="resetForm(changePasswordForm)"
            [disabled]="isLoading()"
          >
            Anulează
          </button>
        </div>
      </form>

      <!-- Info Box -->
      <div class="info-box">
        <span class="info-icon">ℹ️</span>
        <p class="info-text">
          După schimbarea parolei, va trebui să te conectezi din nou cu noua parolă.
        </p>
      </div>
    </div>
  `,
  styles: [`
    .change-password-section {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 24px;
      margin: 20px 0;
    }

    .section-header {
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #111827;
      margin: 0 0 8px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .icon {
      font-size: 1.5rem;
    }

    .section-description {
      color: #6b7280;
      font-size: 0.875rem;
      margin: 0;
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

    .input-field:disabled {
      background-color: #f3f4f6;
      color: #9ca3af;
      cursor: not-allowed;
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
      margin-top: 16px;
    }

    .submit-button,
    .reset-button {
      padding: 10px 20px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .submit-button {
      background-color: #22c55e;
      color: white;
      flex: 1;
    }

    .submit-button:hover:not(:disabled) {
      background-color: #16a34a;
    }

    .submit-button:disabled {
      background-color: #d1d5db;
      cursor: not-allowed;
    }

    .reset-button {
      background-color: #f3f4f6;
      color: #374151;
      flex: 1;
    }

    .reset-button:hover:not(:disabled) {
      background-color: #e5e7eb;
    }

    .reset-button:disabled {
      background-color: #f3f4f6;
      cursor: not-allowed;
      opacity: 0.6;
    }

    .info-box {
      display: flex;
      gap: 12px;
      background: #dbeafe;
      border: 1px solid #93c5fd;
      border-radius: 6px;
      padding: 12px 16px;
      margin-top: 20px;
    }

    .info-icon {
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .info-text {
      font-size: 0.875rem;
      color: #1e40af;
      line-height: 1.5;
      margin: 0;
    }
  `]
})
export class ChangePasswordSettings {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  isLoading = signal(false);
  formData = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  private getAuthHeaders() {
    const token = this.authService.getToken();
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }

  submitChangePassword(form: NgForm) {
    if (form.invalid || this.formData.newPassword !== this.formData.confirmPassword) {
      this.toastService.show('Completeaza corect toate campurile!', 'error');
      return;
    }

    this.isLoading.set(true);

    const data: ChangePasswordRequest = {
      oldPassword: this.formData.oldPassword,
      newPassword: this.formData.newPassword
    };

    this.http.post('http://localhost:3000/api/auth/change-password', data, this.getAuthHeaders()).subscribe({
      next: (response: any) => {
        this.isLoading.set(false);
        this.toastService.show(response.message, 'success');
        this.resetForm(form);
        
        // Logout immediately after password change
        this.toastService.show('Te vei reconecta cu noua parolă...', 'info');
        this.authService.logout();
      },
      error: (err: any) => {
        this.isLoading.set(false);
        const msg = err.error?.message || 'Eroare la schimbarea parolei.';
        this.toastService.show(msg, 'error');
      }
    });
  }

  resetForm(form: NgForm) {
    form.resetForm();
    this.formData = {
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
  }
}
