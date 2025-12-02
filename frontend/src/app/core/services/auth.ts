import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:3000/api/auth';

  constructor(private http: HttpClient) {}

  login(credentials: { email: string; password: string; }): Observable<any> {
    return this.http.post<{ token: string, user: any }>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap(response => {
          if (response?.token) {
            this.saveToken(response.token);
          }
        })
      );
  }

  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user'); // optional: dacă vrei să salvezi user
  }

  saveToken(token: string) {
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // Optional: helper pentru user (dacă server trimite user la login)
  saveUser(user: any) {
    localStorage.setItem('user', JSON.stringify(user));
  }
  getUser(): any | null {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  }
}
