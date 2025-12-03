import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from './auth';

export interface StudentProfileData {
  firstName: string;
  lastName: string;
  email: string;
  academicYear: number | string;
  phone?: string;
  address?: string;
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

}
