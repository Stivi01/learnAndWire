import { Component, Input } from '@angular/core';
import { AuthService, UserInfo } from '../../../core/services/auth';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  @Input() role: string | null = null;
  user: UserInfo | null = null;
  private userSubscription: Subscription | undefined;

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.userSubscription = this.auth.currentUser$.subscribe(user => {
      this.user = user;
      // Actualizează rolul din @Input dacă este cazul (pentru a afișa/ascunde link-uri)
      if (user && !this.role) {
         this.role = user.role;
      }
    });
  }

  ngOnDestroy() {
    // Curățenie: Oprește abonamentul când componenta este distrusă
    this.userSubscription?.unsubscribe();
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
  navigateToProfile() {
    this.router.navigate(['/student-profile']);
  }
}
