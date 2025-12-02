import { Component, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


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
  imports: [CommonModule,FormsModule,RouterModule],
  styleUrls: ['./login.scss'],
})
export class Login {
  email = '';
  password = '';
  loading = false;

  // Toast
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  showToast = false;

  constructor(private auth: AuthService, private router: Router) {}

  showFeedback(message: string, type: 'success' | 'error') {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => (this.showToast = false), 3000);
  }

  login() {
    if (!this.email || !this.password) {
      this.showFeedback('Emailul și parola sunt obligatorii!', 'error');
      return;
    }

    this.loading = true;

    const data: LoginData = { email: this.email, password: this.password };

    this.auth.login(data).subscribe({
      next: (res: LoginResponse) => {
        this.auth.saveToken(res.token);
        this.auth.saveUser(res.user);

        this.showFeedback('Autentificare reușită! Se încarcă tabloul de bord...', 'success');

        // Reset form
        this.email = '';
        this.password = '';
        this.loading = false;

        // Redirect în funcție de rol
        setTimeout(() => {
          if (res.user.role.toLowerCase() === 'profesor') {
            this.router.navigate(['/teacher-dashboard']);
          } else {
            this.router.navigate(['/student-dashboard']);
          }
        }, 1000);
      },
      error: (err) => {
        console.error('Login error:', err);
        const msg = err.error?.message || 'Eroare necunoscută la autentificare.';
        this.showFeedback(msg, 'error');
        this.loading = false;
      },
    });
  }
}
