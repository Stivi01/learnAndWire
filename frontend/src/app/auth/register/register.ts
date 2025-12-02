import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth';
import { Router, RouterModule } from '@angular/router';

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

  // Toast
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  showToast = false;

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

  showFeedback(message: string, type: 'success' | 'error') {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => (this.showToast = false), 3000);
  }

  register() {
    if (!this.firstName || !this.lastName || !this.email || !this.password) {
      this.showFeedback('Toate câmpurile sunt obligatorii!', 'error');
      return;
    }

    if (!this.roleDisplay) {
      this.showFeedback(
        'Email invalid — trebuie să se termine cu @stud.etti.upb.ro sau @etti.upb.ro',
        'error'
      );
      return;
    }

    this.loading = true;

    const data: RegisterData = {
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      password: this.password,
      role: this.roleDisplay,
    };

    this.auth.register(data).subscribe({
      next: (res) => {
        this.auth.saveToken(res.token);
        this.showFeedback(res.message, 'success');

        // Reset form
        this.firstName = '';
        this.lastName = '';
        this.email = '';
        this.password = '';
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
        this.showFeedback(msg, 'error');
        this.loading = false;
      },
    });
  }
}
