import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { QuizQuestion } from '../models/quiz.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root',
})
export class Question {
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
  // QUESTIONS CRUD
  // =====================================

  addQuestion(quizId: number, data: Partial<QuizQuestion>): Observable<QuizQuestion> {
    return this.http.post<any>(`${this.api}/quizzes/${quizId}/questions`, data, this.headers()).pipe(
      map(q => ({
        id: q.Id || q.id,
        quizId: q.QuizId,
        questionText: q.QuestionText,
        questionType: q.QuestionType,
        points: q.Points
      }))
    );
  }

  getQuestions(quizId: number): Observable<QuizQuestion[]> {
    return this.http.get<any[]>(`${this.api}/quizzes/${quizId}/questions`, this.headers()).pipe(
      map(rows =>
        rows.map(q => ({
          id: q.Id,
          quizId: q.QuizId,
          questionText: q.QuestionText,
          questionType: q.QuestionType,
          points: q.Points
        }))
      )
    );
  }

  updateQuestion(questionId: number, data: Partial<QuizQuestion>): Observable<any> {
    return this.http.put(`${this.api}/questions/${questionId}`, data, this.headers());
  }

  deleteQuestion(questionId: number): Observable<any> {
    return this.http.delete(`${this.api}/questions/${questionId}`, this.headers());
  }
}
