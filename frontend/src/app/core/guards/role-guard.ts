import { ActivatedRouteSnapshot, CanActivate, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { inject, Injectable } from '@angular/core';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.getToken();
  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  const expectedRole = route.data['role'];
  const storedUser = auth.getUser();
  const userRole = storedUser?.role || auth.getRoleFromToken();

  if (!userRole || userRole !== expectedRole) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};