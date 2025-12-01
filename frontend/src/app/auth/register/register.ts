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
    const data = { email: this.email, password: this.password };
    this.auth.register(data).subscribe({
      next: (res) => {
        alert('Cont creat cu succes!');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error(err);
        alert('Înregistrare eșuată!');
      }
    });
  }
}
