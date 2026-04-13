import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth-guard';
import { NoAuthGuard } from './core/guards/no-auth-guard';
import { roleGuard } from './core/guards/role-guard';
import { Home } from './home/home';

export const routes: Routes = [

    { path: 'login', canActivate: [NoAuthGuard], loadComponent: () => import('./auth/login/login').then(m => m.Login) },
    { path: 'register', canActivate: [NoAuthGuard], loadComponent: () => import('./auth/register/register').then(m => m.Register) },
    
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
    path: 'teacher-profile',               // aici ruta pentru settings
    canActivate: [AuthGuard, roleGuard],   // aceleași guard-uri
    data: { role: 'Profesor' },
    loadComponent: () => import('./teacher/teacher-profile/teacher-profile').then(m => m.TeacherProfile)
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
    path: 'teacher/course-schedule',
    canActivate: [AuthGuard, roleGuard],
    data: { role: 'Profesor' },
    loadComponent: () => import('./teacher/course-schedule/course-schedule').then(m => m.CourseSchedule)
  },

  {
    path: 'teacher/edit-course',
    canActivate: [AuthGuard, roleGuard],
    data: { role: 'Profesor' },
    loadComponent: () => import('./teacher/course-edit/course-edit').then(m => m.CourseEdit)
  },

  {
    path: 'teacher/lesson-form',
    canActivate: [AuthGuard, roleGuard],
    data: { role: 'Profesor' },
    loadComponent: () =>
      import('./teacher/lesson-form/lesson-form').then(m => m.LessonForm)
  },

  {
    path: 'teacher/lesson-edit/:lessonId',
    canActivate: [AuthGuard, roleGuard],
    data: { role: 'Profesor' },
    loadComponent: () =>
      import('./teacher/lesson-edit/lesson-edit').then(m => m.LessonEdit)
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

    {
      path: 'teacher/students',
      canActivate: [AuthGuard, roleGuard],
      data: { role: 'Profesor' },
      loadComponent: () =>
        import('./teacher/student-list-teacher/student-list-teacher')
          .then(m => m.StudentListTeacher)
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

  {
    path: 'teacher/results',
    canActivate: [AuthGuard, roleGuard],
    data: { role: 'Profesor' },
    loadComponent: () => import('./teacher/quiz-results/quiz-results').then(m => m.QuizResults)
  },

  //path for breadbord
  {
    path: 'breadbord',
    loadComponent: () => import('./breadbord/breadbord/breadbord').then(m => m.Breadbord)
  },


  // STUDENT
  {
    path: 'student/quizzes',
    canActivate: [AuthGuard, roleGuard],
    data: { role: 'Student' },
    loadComponent: () => import('./student/quiz-list-student/quiz-list-student').then(m => m.QuizListStudent)
  },

  {
    path: 'student/course/:id',
    canActivate: [AuthGuard, roleGuard],
    data: { role: 'Student' },
    loadComponent: () => import('./student/course-detail/course-detail').then(m => m.CourseDetail)
  },

  {
    path: 'student/quiz/take/:id',
    canActivate: [AuthGuard, roleGuard],
    data: { role: 'Student' },
    loadComponent: () => import('./student/quiz-take/quiz-take').then(m => m.QuizTake)
  },

  {
    path: 'student/grades',
    canActivate: [AuthGuard, roleGuard],
    data: { role: 'Student' },
    loadComponent: () => import('./student/my-grades/my-grades').then(m => m.MyGrades)
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

   {
    path: 'teacher/calendar',
    canActivate: [AuthGuard, roleGuard],
    data: { role: 'Profesor' },
    loadComponent: () => import('./teacher/teacher-calendar/teacher-calendar').then(m => m.TeacherCalendar)
  },







    { path: '', canActivate: [AuthGuard], component: Home },
    { path: '**', redirectTo: '/login' }


];
