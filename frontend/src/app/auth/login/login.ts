import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  standalone: true,
  imports: [CommonModule,FormsModule],
  styleUrls: ['./login.scss'],
})
export class Login {

  email = '';
  password = '';
  loading = false;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  login() {
    this.loading = true;
    this.auth.login({ email: this.email, password: this.password })
      .subscribe({
        next: (res) => {
          this.loading = false;
          // server trimite { token, user }
          if (res?.user) {
            this.auth.saveUser(res.user);
          }
          alert('Autentificare reușită!');
          // redirect în funcție de rol
          const role = res?.user?.role || '';
          if (role === 'Profesor' || role === 'profesor') {
            this.router.navigate(['/teacher-dashboard']); // ajustează ruta
          } else {
            this.router.navigate(['/student-dashboard']);   // ajustează ruta
          }
        },
        error: (err) => {
          this.loading = false;
          console.error('Login error:', err);
          alert(err?.error?.message || 'Eroare la autentificare');
        }
      });
  }
}
