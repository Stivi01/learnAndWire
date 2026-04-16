import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface CourseLesson {
  Id?: number;
  ModuleId?: number;
  moduleId?: number;
  Title: string;
  Content: string;
  DocumentUrl?: string;
  OrderIndex: number;
}

@Injectable({
  providedIn: 'root',
})
export class Lesson {
  private apiUrl = 'http://localhost:3000/api/lessons';

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = localStorage.getItem('token');
    return {
      headers: { Authorization: `Bearer ${token}` }
    };
  }

  getLessonsByModule(moduleId: number): Observable<CourseLesson[]> {
    return this.http.get<CourseLesson[]>(
      `${this.apiUrl}?moduleId=${moduleId}`,
      this.headers
    );
  }
  
  getLessonById(id: number): Observable<CourseLesson> {
  return this.http.get<CourseLesson>(
    `${this.apiUrl}/${id}`,
    this.headers
  );
}

  createLesson(formData: FormData): Observable<CourseLesson> {
    // Nu trimite headere de Content-Type manual, browserul va pune singur Multipart Boundary
    const token = localStorage.getItem('token');
    return this.http.post<CourseLesson>(this.apiUrl, formData, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  updateLesson(id: number, formData: FormData): Observable<CourseLesson> {
    const token = localStorage.getItem('token');
    return this.http.put<CourseLesson>(`${this.apiUrl}/${id}`, formData, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  deleteLesson(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, this.headers);
  }
}
