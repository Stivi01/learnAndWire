import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from './auth';
import { Observable } from 'rxjs';
import { HomeworkItem, HomeworkSubmission } from '../models/homework.model';

@Injectable({
  providedIn: 'root',
})
export class Homework {
  private api = 'http://localhost:3000/api/homeworks';

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers() {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.auth.getToken()}`,
      }),
    };
  }

  createHomework(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.api}`, formData, this.headers());
  }

  getTeacherHomeworks(): Observable<HomeworkItem[]> {
    return this.http.get<HomeworkItem[]>(`${this.api}/teacher`, this.headers());
  }

  getHomeworkSubmissions(homeworkId: number): Observable<HomeworkSubmission[]> {
    return this.http.get<HomeworkSubmission[]>(`${this.api}/${homeworkId}/submissions`, this.headers());
  }

  gradeSubmission(submissionId: number, data: { grade: number; comments?: string }): Observable<any> {
    return this.http.put(`${this.api}/submissions/${submissionId}/grade`, data, this.headers());
  }

  getStudentHomeworks(): Observable<HomeworkItem[]> {
    return this.http.get<HomeworkItem[]>(`${this.api}/student`, this.headers());
  }

  submitHomework(homeworkId: number, formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.api}/${homeworkId}/submit`, formData, this.headers());
  }
}
