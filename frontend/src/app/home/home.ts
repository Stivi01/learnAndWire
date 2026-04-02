import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth';

@Component({
  selector: 'app-home',
  standalone: true,
  template: '',
  styleUrls: []
})
export class Home implements OnInit {
  private router = inject(Router);
  private auth = inject(AuthService);

  ngOnInit() {
    const user = this.auth.getUser();
    
    if (user?.role === 'Student') {
      this.router.navigate(['/student-dashboard']);
    } else if (user?.role === 'Profesor') {
      this.router.navigate(['/teacher-dashboard']);
    } else {
      // Fallback caso role não exista
      this.router.navigate(['/login']);
    }
  }
}
