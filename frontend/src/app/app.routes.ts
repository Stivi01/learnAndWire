import { Routes } from '@angular/router';

export const routes: Routes = [

    { path: 'login', loadComponent: () => import('./auth/login/login').then(m => m.Login) },
    { path: 'register', loadComponent: () => import('./auth/register/register').then(m => m.Register) },
    
    { path: 'teacher-dashboard', loadComponent: () => import('./teacher/teacher-dashboard/teacher-dashboard').then(m => m.TeacherDashboard) },
    { path: 'student-dashboard', loadComponent: () => import('./student/student-dashboard/student-dashboard').then(m => m.StudentDashboard) },
    
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: '**', redirectTo: '/login' }


];
