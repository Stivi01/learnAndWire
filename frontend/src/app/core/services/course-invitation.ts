import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

export interface CourseInvitationData {
  Id: number;
  CourseId: number;
  Status: 'Pending' | 'Accepted' | 'Declined';
  Title: string;
  Description: string;
  TeacherFirstName: string;
  TeacherLastName: string;
}

@Injectable({
  providedIn: 'root',
})
export class CourseInvitation {
  private baseUrl = 'http://localhost:3000/api/course-invitations';

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

  // Profesor: trimite invitații
  inviteStudents(courseId: number, studentIds: number[]): Observable<any> {
    return this.http.post(
      `${this.baseUrl}`,
      { courseId, studentIds },
      this.getAuthHeaders()
    );
  }

  // Student: obține invitațiile
  getInvitations(): Observable<CourseInvitationData[]> {
    return this.http.get<CourseInvitationData[]>(
      `${this.baseUrl}`,
      this.getAuthHeaders()
    );
  }

  // Student: răspunde la invitație
  respond(invitationId: number, accept: boolean): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/${invitationId}/respond`,
      { accept },
      this.getAuthHeaders()
    );
  }
}
