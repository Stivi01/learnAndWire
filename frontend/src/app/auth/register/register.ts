import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../core/services/auth';
import { Router, RouterModule } from '@angular/router';
import { ToastService } from '../../core/services/toast';

interface RegisterData {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'student' | 'profesor';
}

interface AuthResponse {
    token: string;
    message: string;
}

@Component({
  selector: 'app-register',
  imports: [CommonModule,FormsModule,RouterModule],
  standalone: true,
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  firstName = '';
  lastName = '';
  email = '';
  password = '';
  roleDisplay: 'student' | 'profesor' | null = null;
  loading = false;

  // Iniectăm serviciul de Toast global
  private toastService = inject(ToastService);

  constructor(private auth: AuthService, private router: Router) {}

  checkRole() {
    const emailValue = this.email.trim().toLowerCase();
    if (emailValue.endsWith('@stud.etti.upb.ro')) {
      this.roleDisplay = 'student';
    } else if (emailValue.endsWith('@etti.upb.ro')) {
      this.roleDisplay = 'profesor';
    } else {
      this.roleDisplay = null;
    }
  }

  register(form?: NgForm) {
    if (form && form.invalid) {
      this.toastService.show('Vă rugăm să corectați erorile din formular!', 'error');
      return;
    }

    if (!this.roleDisplay) {
      this.toastService.show(
        'Email invalid — trebuie să se termine cu @stud.etti.upb.ro sau @etti.upb.ro',
        'error'
      );
      return;
    }

    this.loading = true;

    const data: RegisterData = {
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      email: this.email.trim().toLowerCase(),
      password: this.password,
      role: this.roleDisplay,
    };

    this.auth.register(data).subscribe({
      next: (res) => {
        this.auth.saveToken(res.token);
        this.toastService.show(res.message, 'success');

        // Reset form
        if (form) form.resetForm();
        this.roleDisplay = null;
        this.loading = false;

        // Redirecționare
        setTimeout(() => {
          if (data.role === 'profesor') {
            this.router.navigate(['/teacher-dashboard']);
          } else {
            this.router.navigate(['/student-dashboard']);
          }
        }, 1000);
      },
      error: (err) => {
        console.error(err);
        const msg = err.error?.message || 'Eroare necunoscută. Verifică consola.';
        this.toastService.show(msg, 'error');
        this.loading = false;
      },
    });
  }
}
