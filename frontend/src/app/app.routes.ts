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
  {
    path: 'teacher/my-classes',
    canActivate: [AuthGuard, roleGuard],
    data: { role: 'Profesor' },
    loadComponent: () => import('./teacher/my-classes/my-classes').then(m => m.MyClasses)
  },

  {
    path: 'student/my-classes',
    canActivate: [AuthGuard, roleGuard],
    data: { role: 'Student' },
    loadComponent: () => import('./student/my-classes-student/my-classes-student').then(m => m.MyClassesStudent)
  },

  {
    path: 'teacher/module-form',
    canActivate: [AuthGuard, roleGuard],
    data: { role: 'Profesor' },
    loadComponent: () =>
      import('./teacher/module-form/module-form').then(m => m.ModuleForm)
  },

  {
    path: 'teacher/lesson-form',
    canActivate: [AuthGuard, roleGuard],
    data: { role: 'Profesor' },
    loadComponent: () =>
      import('./teacher/lesson-form/lesson-form').then(m => m.LessonForm)
  },

  // TEACHER: Invite Students
    {
      path: 'teacher/invite-students',
      canActivate: [AuthGuard, roleGuard],
      data: { role: 'Profesor' },
      loadComponent: () => import('./teacher/invite-students/invite-students').then(m => m.InviteStudents)
    },

    // STUDENT: My Enrollments / Invitations
    {
      path: 'student/my-enrollments',
      canActivate: [AuthGuard, roleGuard],
      data: { role: 'Student' },
      loadComponent: () => import('./student/my-enrollments/my-enrollments').then(m => m.MyEnrollments)
    },

    // PROFESOR
  {
    path: 'teacher/quizzes',
    canActivate: [AuthGuard, roleGuard],
    data: { role: 'Profesor' },
    loadComponent: () => import('./teacher/quiz-list-teacher/quiz-list-teacher').then(m => m.QuizListTeacher)
  },
  {
    path: 'teacher/quiz-form',
    canActivate: [AuthGuard, roleGuard],
    data: { role: 'Profesor' },
    loadComponent: () => import('./teacher/quiz-form/quiz-form').then(m => m.QuizForm)
  },

  // STUDENT
  {
    path: 'student/quizzes',
    canActivate: [AuthGuard, roleGuard],
    data: { role: 'Student' },
    loadComponent: () => import('./student/quiz-list-student/quiz-list-student').then(m => m.QuizListStudent)
  },

  {
    path: 'teacher/quiz/:id/manage',
    canActivate: [AuthGuard, roleGuard],
    data: { role: 'Profesor' },
    loadComponent: () => import('./teacher/quiz-manager/quiz-manager')
                        .then(m => m.QuizManager)
  },

  {
    path: 'teacher/quiz/:quizId/question/add',
    canActivate: [AuthGuard, roleGuard],
    data: { role: 'Profesor' },
    loadComponent: () => import('./teacher/question-form/question-form')
                        .then(m => m.QuestionForm)
  },
  {
    path: 'teacher/quiz/:quizId/question/:id',
    canActivate: [AuthGuard, roleGuard],
    data: { role: 'Profesor' },
    loadComponent: () => import('./teacher/question-form/question-form')
                        .then(m => m.QuestionForm)
  },

  {
    path: 'teacher/question/:questionId/options',
    canActivate: [AuthGuard, roleGuard],
    data: { role: 'Profesor' },
    loadComponent: () => import('./teacher/option-form/option-form')
                        .then(m => m.OptionForm)
  },

  {
    path: 'teacher/quiz/:quizId/question/add',
    canActivate: [AuthGuard, roleGuard],
    data: { role: 'Profesor' },
    loadComponent: () => import('./teacher/question-form/question-form').then(m => m.QuestionForm)
  },
  {
    path: 'teacher/quiz/:quizId/question/:questionId',
    canActivate: [AuthGuard, roleGuard],
    data: { role: 'Profesor' },
    loadComponent: () => import('./teacher/question-form/question-form').then(m => m.QuestionForm)
  },
  {
    path: 'teacher/questions/:questionId/options',
    canActivate: [AuthGuard, roleGuard],
    data: { role: 'Profesor' },
    loadComponent: () => import('./teacher/option-form/option-form').then(m => m.OptionForm)
  },







    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: '**', redirectTo: '/login' }


];
