import { ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ToastService } from '../../core/services/toast';
import { ForgotPasswordModal } from './forgot-password-modal';


interface LoginData {
    email: string;
    password: string;
}

interface User {
    role: string;
    firstName: string;
    lastName: string;
}

interface LoginResponse {
    token: string;
    user: User;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  standalone: true,
  imports: [CommonModule,FormsModule,RouterModule, ForgotPasswordModal],
  styleUrls: ['./login.scss'],
})
export class Login {
  email = '';
  password = '';
  loading = false;
  showForgotPasswordModal = false;

  private toastService = inject(ToastService);

  constructor(private auth: AuthService, private router: Router, private cdr: ChangeDetectorRef) {}

  login(form?: NgForm) {
    // VALIDARE MANUALĂ
    if (!this.email || !this.password) {
      this.toastService.show('Completează email și parolă!', 'error');
      return;
    }

    if (form && form.invalid) {
      this.toastService.show('Vă rugăm să completați corect câmpurile!', 'error');
      return;
    }

    this.loading = true;

    const data: LoginData = { email: this.email, password: this.password };

    this.auth.login(data).subscribe({
      next: (res: LoginResponse) => {
        this.loading = false;

        this.toastService.show('Autentificare reușită!', 'success');

        if (form) form.resetForm();
        this.email = '';
        this.password = '';

        const destination =
          res.user.role.toLowerCase() === 'profesor'
            ? '/teacher-dashboard'
            : '/student-dashboard';

        this.router.navigate([destination]);
      },
      error: (err) => {
        this.loading = false;
        this.cdr.detectChanges();
        const msg = err.error?.message || 'Email sau parolă incorectă.';
        this.toastService.show(msg, 'error');
      },
    });
  }
}
