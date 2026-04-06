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
  navigateToDashboard() {
    if (this.role === 'Profesor') {
      this.router.navigate(['/teacher-dashboard']);
    } else if (this.role === 'Student') {
      this.router.navigate(['/student-dashboard']);
    }
  }
  navigateToProfile() {
    if (this.role === 'Student') {
      this.router.navigate(['/student-profile']);
    } else if (this.role === 'Profesor') {
      this.router.navigate(['/teacher-profile']);
    }
  }
  // navigateToCourseForm() {
  //   this.router.navigate(['/teacher/course-form']);
  // }
  navigateToMyClasses() {
    if (this.role === 'Profesor') {
      this.router.navigate(['/teacher/my-classes']);
    } else if (this.role === 'Student') {
      this.router.navigate(['/student/my-classes']); // dacă vrei să faci și pentru student
    }
  }
  navigateToInvitations() {
    if (this.role === 'Profesor') {
      this.router.navigate(['/teacher/invite-students']);
    } else if (this.role === 'Student') {
      this.router.navigate(['/student/my-enrollments']);
    }
  }

  navigateToQuizzes() {
    if (this.role === 'Profesor') {
      this.router.navigate(['/teacher/quizzes']);
    } else if (this.role === 'Student') {
      this.router.navigate(['/student/quizzes']);
    }
  }

  navigateToQuizzesResults() {
    if (this.role === 'Profesor') {
      this.router.navigate(['/teacher/results']);
    }
  }

  navigateToQuizForm() {
    if (this.role === 'Profesor') {
      this.router.navigate(['/teacher/quiz-form']);
    }
  }

  navigateToStudentsGrades() {
    if (this.role === 'Student') {
      this.router.navigate(['/student/grades']);
    }
  }

  navigateToStudents() {
    if (this.role === 'Profesor') {
      this.router.navigate(['/teacher/students']);
    }
  }

  navigateToTeacherCalendar() {
  if (this.role === 'Profesor') {
      this.router.navigate(['/teacher/calendar']);
    }
}




}
