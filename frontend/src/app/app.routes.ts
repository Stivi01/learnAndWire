import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';

export const routes: Routes = [

    { path: 'login', loadComponent: () => import('./auth/login/login').then(m => m.Login) },
    { path: 'register', loadComponent: () => import('./auth/register/register').then(m => m.Register) },
    
    { 
    path: 'teacher-dashboard',
    canActivate: [AuthGuard, roleGuard],
    data: { role: 'Profesor' },
    loadComponent: () => import('./teacher/teacher-dashboard/teacher-dashboard').then(m => m.TeacherDashboard)
  },

  // STUDENT
  { 
    path: 'student-dashboard',
    canActivate: [AuthGuard, roleGuard],
    data: { role: 'Student' },
    loadComponent: () => import('./student/student-dashboard/student-dashboard').then(m => m.StudentDashboard)
  },

  {
    path: 'student-profile',               // aici ruta pentru settings
    canActivate: [AuthGuard, roleGuard],   // aceleași guard-uri
    data: { role: 'Student' },
    loadComponent: () => import('./student/student-profile/student-profile').then(m => m.StudentProfile)
  },

  {
    path: 'teacher/course-form',
    canActivate: [AuthGuard, roleGuard],
    data: { role: 'Profesor' },
    loadComponent: () => import('./teacher/course-form/course-form')
                        .then(m => m.CourseForm)
  },


    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: '**', redirectTo: '/login' }


];
