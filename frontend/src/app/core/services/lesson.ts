import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface CourseLesson {
  Id?: number;
  moduleId: number;
  Title: string;
  Content: string;
  VideoUrl?: string;
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

  createLesson(lesson: CourseLesson): Observable<CourseLesson> {
    return this.http.post<CourseLesson>(
      this.apiUrl,
      lesson,
      this.headers
    );
  }

  updateLesson(lesson: CourseLesson): Observable<CourseLesson> {
    return this.http.put<CourseLesson>(
      `${this.apiUrl}/${lesson.Id}`,
      lesson,
      this.headers
    );
  }

  deleteLesson(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, this.headers);
  }
}
