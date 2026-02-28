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

getModuleById(moduleId: number): Observable<any> {
  const token = this.authService.getToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
  return this.http.get<any>(`${this.api}/${moduleId}`, { headers });
}

createModule(moduleData: any) {
  const token = this.authService.getToken();

  const headers = new HttpHeaders({
    Authorization: `Bearer ${token}`
  });

  return this.http.post<any>(this.api, moduleData, { headers });
}
updateModule(moduleId: number, data: { title: string; orderIndex?: number }) {
  const token = this.authService.getToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
  return this.http.put(`${this.api}/${moduleId}`, data, { headers });
}
deleteModule(moduleId: number) {
  const token = this.authService.getToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
  return this.http.delete(`${this.api}/${moduleId}`, { headers });
}
deleteAllModulesByCourse(courseId: number) {
  const token = this.authService.getToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

  return this.http.delete(
    `http://localhost:3000/api/courses/${courseId}/modules`, // ✅ CORECT
    { headers }
  );
}
createLesson(lessonData: any) {
  const token = this.authService.getToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
  return this.http.post<any>('http://localhost:3000/api/lessons', lessonData, { headers });
}

deleteLesson(lessonId: number) {
  const token = this.authService.getToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
  return this.http.delete(`http://localhost:3000/api/lessons/${lessonId}`, { headers });
}
}
