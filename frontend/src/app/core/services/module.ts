import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

export interface CourseModule {
  id?: number;
  courseId: number;
  title: string;
  orderIndex: number;
}

@Injectable({
  providedIn: 'root',
})
export class Module {
  private api = 'http://localhost:3000/api/modules';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // ------ CREATE MODULE ------
  getModulesByCourse(courseId: number) {
  const token = this.authService.getToken();

  const headers = new HttpHeaders({
    Authorization: `Bearer ${token}`
  });

  return this.http.get<any[]>(`${this.api}?courseId=${courseId}`, { headers });
}

createModule(moduleData: any) {
  const token = this.authService.getToken();

  const headers = new HttpHeaders({
    Authorization: `Bearer ${token}`
  });

  return this.http.post<any>(this.api, moduleData, { headers });
}

}
