import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth';

@Injectable({
  providedIn: 'root'
})
export class NoAuthGuard implements CanActivate {

  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    // Se o utilizador está autenticado, redireciona-o para home
    if (this.auth.getToken()) {
      this.router.navigate(['/']);
      return false;
    }
    // Se não está autenticado, permite acesso ao login
    return true;
  }
}
