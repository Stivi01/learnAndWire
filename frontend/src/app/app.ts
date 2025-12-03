import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './shared/components/navbar/navbar';
import { AuthService, UserInfo } from './core/services/auth';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,CommonModule,Navbar],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('frontend');
  auth = inject(AuthService);
  currentUser = signal<UserInfo | null>(this.auth.currentUserValue);

  constructor() {
    // Sincronizăm semnalul cu BehaviorSubject-ul din AuthService
    this.auth.currentUser$.subscribe(user => {
      this.currentUser.set(user);
    });
  }
}
