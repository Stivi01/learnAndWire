import { Component, Input } from '@angular/core';
import { AuthService } from '../../../core/services/auth';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  @Input() role: 'student' | 'profesor' | null = null;
  constructor(public auth: AuthService, private router: Router) {}

    navigate(route: string) {
      this.router.navigate([`/${route}`]);
    }
    logout() {
      this.auth.logout();
      this.router.navigate(['/login']);
    }
}
