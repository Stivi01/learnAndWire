import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface UserInfo {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:3000/api/auth';
  private sessionTimeoutMs = 30 * 60 * 1000; // 30 minute
  private sessionTimerId: ReturnType<typeof setTimeout> | null = null;

  private currentUserSubject = new BehaviorSubject<UserInfo | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  // Signal reactiv pentru starea logged-in
  public isLoggedInSignal = signal<boolean>(!!this.getToken());

  constructor(private http: HttpClient) {
    this.initializeUser();
    this.setupIdleAutoLogout();
  }

  private initializeUser() {
    const user = this.getStoredUser();
    this.currentUserSubject.next(user);
  }

  private clearSessionTimeout() {
    if (this.sessionTimerId !== null) {
      clearTimeout(this.sessionTimerId);
      this.sessionTimerId = null;
    }
  }

  private scheduleLogout() {
    this.clearSessionTimeout();
    this.sessionTimerId = setTimeout(() => {
      this.logout();
      window.location.href = '/login';
    }, this.sessionTimeoutMs);
  }

  private setupIdleAutoLogout() {
    const events = ['click', 'keydown', 'mousemove', 'touchstart'];
    events.forEach(ev => {
      window.addEventListener(ev, () => {
        if (this.isLoggedIn()) {
          this.scheduleLogout();
        }
      });
    });

    if (this.isLoggedIn()) {
      this.scheduleLogout();
    }
  }

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post<{ token: string; user: UserInfo }>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap(response => {
          if (response?.token) {
            this.saveToken(response.token);
            this.saveUser(response.user);
            this.currentUserSubject.next(response.user);
            this.isLoggedInSignal.set(true);
            this.scheduleLogout();
          }
        })
      );
  }

  updateUserAvatar(newAvatarPath: string) {
    const user = this.currentUserSubject.getValue();
    if (user) {
      const updatedUser = { ...user, avatar: newAvatarPath };
      this.saveUser(updatedUser);
      Promise.resolve().then(() => {
        this.currentUserSubject.next(updatedUser);
      });
    }
  }

  register(data: any): Observable<any> {
    return this.http.post<{ token: string; user: UserInfo }>(`${this.apiUrl}/register`, data).pipe(
      tap(response => {
        if (response?.token) {
          this.saveToken(response.token);
          this.saveUser(response.user);
          this.currentUserSubject.next(response.user);
          this.isLoggedInSignal.set(true);
          this.scheduleLogout();
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
    this.isLoggedInSignal.set(false);
    this.clearSessionTimeout();
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

  saveUser(user: any) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  getStoredUser(): UserInfo | null {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) as UserInfo : null;
  }

  getUser(): any | null {
    return this.getStoredUser();
  }

  getRoleFromToken(): string | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded?.role || null;
    } catch (e) {
      return null;
    }
  }

  public get currentUserValue(): UserInfo | null {
    return this.currentUserSubject.getValue();
  }
}
