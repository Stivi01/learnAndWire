import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from './auth';

export interface StudentProfileData {
  firstName: string;
  lastName: string;
  email: string;
  academicYear: number;
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
    return this.http.get<StudentProfileData>(
      `${this.apiUrl}/profile`,
      this.getAuthHeaders()
    );
  }

  updateProfile(profile: Partial<StudentProfileData>) {
    return this.http.put(
      `${this.apiUrl}/profile`,
      profile,
      this.getAuthHeaders()
    );
  }
}
