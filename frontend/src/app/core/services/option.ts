import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { AuthService } from './auth';
import { QuizOption } from '../models/quiz.model';

@Injectable({
  providedIn: 'root',
})
export class Option {
  private api = 'http://localhost:3000/api';

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers() {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.auth.getToken()}`,
      }),
    };
  }

  // =====================================
  // OPTIONS CRUD
  // =====================================

  getOptions(questionId: number): Observable<QuizOption[]> {
    return this.http.get<any[]>(`${this.api}/questions/${questionId}/options`, this.headers()).pipe(
      map(res =>
        res.map(o => ({
          id: o.Id,
          questionId: o.QuestionId,
          optionText: o.OptionText,
          isCorrect: o.IsCorrect
        }))
      )
    );
  }

  addOption(questionId: number, data: Partial<QuizOption>): Observable<QuizOption> {
    return this.http.post<any>(`${this.api}/questions/${questionId}/options`, data, this.headers()).pipe(
      map(o => ({
        id: o.Id,
        questionId: o.QuestionId,
        optionText: o.OptionText,
        isCorrect: o.IsCorrect
      }))
    );
  }

  updateOption(optionId: number, data: Partial<QuizOption>): Observable<any> {
    return this.http.put(`${this.api}/options/${optionId}`, data, this.headers());
  }

  deleteOption(optionId: number): Observable<any> {
    return this.http.delete(`${this.api}/options/${optionId}`, this.headers());
  }
}
