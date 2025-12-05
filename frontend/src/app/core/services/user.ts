import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from './auth';
import { map, Observable } from 'rxjs';
import { Teacher } from '../models/teacher.model';

export interface StudentProfileData {
  id:number;
  firstName: string;
  lastName: string;
  email: string;
  academicYear: number | string;
  phone?: string;
  address?: string;
  avatar?: string;
}


@Injectable({
  providedIn: 'root',
})
export class User {
  private apiUrl = 'http://localhost:3000/api/student';

  constructor(private http: HttpClient, private auth: AuthService) {}

  private getAuthHeaders() {
    const token = this.auth.getToken();
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }

  getProfile() {
    return this.http.get<StudentProfileData>('http://localhost:3000/api/profile', {
      headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
    });
  }

  updateProfile(profile: StudentProfileData) {
    return this.http.put('http://localhost:3000/api/profile', profile, {
      headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
    });
  }

  uploadAvatar(formData: FormData) {
    return this.http.post<{ avatar: string }>(
      'http://localhost:3000/api/profile/avatar',
      formData,
      { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } }
    );
  }

  getStudents(academicYear?: number): Observable<StudentProfileData[]> {
    let url = 'http://localhost:3000/api/students';
    if (academicYear) url += `?academicYear=${academicYear}`;
    return this.http.get<StudentProfileData[]>(url, {
      headers: {
        Authorization: `Bearer ${this.auth.getToken()}` // folosește token-ul de la AuthService
      }
    });
  }

  getLinkedTeachers(): Observable<Teacher[]> {
  return this.http.get<any[]>('http://localhost:3000/api/student/teachers', {
    headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
  }).pipe(
    map(teachers => teachers.map(t => ({
      id: t.Id,  // din PascalCase
      fullName: `${t.FirstName} ${t.LastName}`, // combinăm
      email: t.Email,
      role: t.Role,
      avatarUrl: t.Avatar || 'assets/avatar-default.png',
      phone: t.Phone || '',
      course: t.course || ''
    })))
  );
}







}
