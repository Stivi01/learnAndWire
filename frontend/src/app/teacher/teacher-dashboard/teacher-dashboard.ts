import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth';

interface CourseWithStudents {
  Id: number;
  Title: string;
  Description?: string;
  students?: any[];
  CreatedAt?: string;
}

interface Quiz {
  Id: number;
  Title: string;
  CourseId: number;
}

@Component({
  selector: 'app-teacher-dashboard',
  imports: [CommonModule, RouterModule],
  standalone: true,
  templateUrl: './teacher-dashboard.html',
  styleUrl: './teacher-dashboard.scss',
})
export class TeacherDashboard {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  // Statistici
  totalCourses = signal(0);
  totalStudents = signal(0);
  totalQuizzes = signal(0);
  pendingAssignments = signal(0);

  // Date pentru afișare
  recentCourses = signal<CourseWithStudents[]>([]);
  isLoading = signal(true);

  constructor() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    const teacherId = this.auth.getUser()?.id;
    if (!teacherId) return;

    // Încarcă cursuri cu studenți
    this.http.get<CourseWithStudents[]>('http://localhost:3000/api/teacher/courses-with-students', {
      headers: { Authorization: `Bearer ${this.auth.getToken()}` }
    }).subscribe({
      next: (courses) => {
        this.totalCourses.set(courses.length);
        const totalStudents = courses.reduce((sum, c) => sum + (c.students?.length || 0), 0);
        this.totalStudents.set(totalStudents);
        this.recentCourses.set(courses.slice(0, 3));
      },
      error: () => {
        console.error('Failed to load courses');
        this.isLoading.set(false);
      }
    });

    // Încarcă quiz-uri
    this.http.get<Quiz[]>(`http://localhost:3000/api/quizzes/teacher/${teacherId}`, {
      headers: { Authorization: `Bearer ${this.auth.getToken()}` }
    }).subscribe({
      next: (quizzes) => {
        this.totalQuizzes.set(quizzes.length);
      },
      error: () => console.error('Failed to load quizzes')
    });

    this.pendingAssignments.set(5);
    this.isLoading.set(false);
  }

  getStudentCount(course: CourseWithStudents): number {
    return course.students?.length || 0;
  }
}
