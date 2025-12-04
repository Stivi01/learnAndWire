import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface CourseInvitation {
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

  constructor(private http: HttpClient) {}

  // Profesor: trimite invitații
  inviteStudents(courseId: number, studentIds: number[]): Observable<any> {
    return this.http.post(`${this.baseUrl}`, { courseId, studentIds });
  }

  // Student: obține invitațiile
  getInvitations(): Observable<CourseInvitation[]> {
    return this.http.get<CourseInvitation[]>(`${this.baseUrl}`);
  }

  // Student: răspunde la invitație
  respond(invitationId: number, accept: boolean): Observable<any> {
    return this.http.post(`${this.baseUrl}/${invitationId}/respond`, { accept });
  }
}
