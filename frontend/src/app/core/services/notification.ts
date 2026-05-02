import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { CourseInvitationData } from './course-invitation';

export interface StudentExclusionNotification {
  courseId: number;
  courseTitle: string;
  excludedAt: string;
}

export interface StudentQuizNotification {
  id: number;
  courseId: number;
  courseTitle: string;
  title: string;
  description: string;
  scheduledAt?: string;
  createdAt?: string;
}

export interface StudentModuleNotification {
  id: number;
  courseId: number;
  courseTitle: string;
  title: string;
}

export interface StudentLessonNotification {
  id: number;
  moduleId: number;
  courseId: number;
  courseTitle: string;
  moduleTitle: string;
  title: string;
}

export interface StudentHomeworkNotification {
  id: number;
  courseId: number;
  courseTitle: string;
  title: string;
  dueAt?: string;
  createdAt?: string;
}

export interface StudentNotificationsResponse {
  invitations: CourseInvitationData[];
  exclusions: StudentExclusionNotification[];
  quizzes: StudentQuizNotification[];
  modules: StudentModuleNotification[];
  lessons: StudentLessonNotification[];
  homeworks: StudentHomeworkNotification[];
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private baseUrl = 'http://localhost:3000/api/student-notifications';

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  private getAuthHeaders() {
    const token = this.auth.getToken();
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`
      })
    };
  }

  getNotifications(): Observable<StudentNotificationsResponse> {
    return this.http.get<StudentNotificationsResponse>(
      this.baseUrl,
      this.getAuthHeaders()
    );
  }
}
