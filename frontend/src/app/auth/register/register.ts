import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  imports: [CommonModule,FormsModule],
  standalone: true,
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  email = '';
  password = '';

  constructor(
    private auth: AuthService,
    private router: Router
  ) { }

  register() {
    const emailLower = this.email.trim().toLowerCase();
    let role = '';
    if (emailLower.endsWith('@stud.etti.upb.ro')) {
      role = 'student';
    } else if (emailLower.endsWith('@etti.upb.ro')) {
      role = 'profesor';
    } else {
      alert('Email invalid — trebuie @stud.etti.upb.ro sau @etti.upb.ro');
      return;
    }

    this.auth.register({ email: this.email, password: this.password, role })
      .subscribe({
        next: () => {
          alert('Cont creat cu succes, te poti loga.');
          this.router.navigate(['/login']);
        },
        error: err => {
          console.error(err);
          alert('Eroare la creare cont');
        }
      });
  }
}
