import { ActivatedRouteSnapshot, CanActivate, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { inject, Injectable } from '@angular/core';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const expectedRole = route.data['role'] as string;
  const user = auth.getUser();
  const role = user?.role?.toLowerCase() || auth.getRoleFromToken()?.toLowerCase();

  if (!role || role !== expectedRole.toLowerCase()) {
    router.navigate(['/login']);
    return false;
  }
  return true;
}