import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from './auth';
import { map, Observable } from 'rxjs';
import { QuizData,QuizOption, QuizQuestion, QuizResult } from '../models/quiz.model';

@Injectable({
  providedIn: 'root',
})
export class Quiz {
  private api = 'http://localhost:3000/api/quizzes';
  private questionsApi = 'http://localhost:3000/api/questions';

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers() {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.auth.getToken()}`,
      }),
    };
  }

  // -------------------------
  // QUIZ CRUD
  // -------------------------

  createQuiz(data: { courseId?: number; title: string; description?: string }): Observable<QuizData> {
    return this.http.post<any>(`${this.api}`, data, this.headers()).pipe(
      map(q => ({
        id: q.Id,
        courseId: q.CourseId,
        title: q.Title,
        description: q.Description,
        createdAt: q.CreatedAt,
        createdBy: q.CreatedBy,
        isPublished: q.IsPublished
      }))
    );
  }

  getQuizByCourse(courseId: number): Observable<QuizData[]> {
    return this.http.get<any[]>(`${this.api}/course/${courseId}`, this.headers()).pipe(
      map(quizzes => quizzes.map(q => ({
        id: q.Id,
        courseId: q.CourseId,
        title: q.Title,
        description: q.Description,
        createdAt: q.CreatedAt,
        createdBy: q.CreatedBy,
        isPublished: q.IsPublished
      })))
    );
  }

  getQuizzesByTeacher(teacherId: number): Observable<QuizData[]> {
    return this.http.get<any[]>(`${this.api}/teacher/${teacherId}`, this.headers()).pipe(
      map(res => res.map(q => ({
        id: q.Id,
        courseId: q.CourseId,
        title: q.Title,
        description: q.Description,
        createdAt: q.CreatedAt,
        createdBy: q.CreatedBy,
        isPublished: q.IsPublished
      })))
    );
  }

  getQuizFull(id: number): Observable<{ quiz: any; questions: any[] }> {
    return this.http.get<any>(`${this.api}/${id}/full`, this.headers());
  }

  updateQuiz(id: number, data: Partial<QuizData>): Observable<QuizData> {
    return this.http.put<any>(`${this.api}/${id}`, data, this.headers()).pipe(
      map(q => ({
        id: q.Id,
        courseId: q.CourseId,
        title: q.Title,
        description: q.Description,
        createdAt: q.CreatedAt,
        createdBy: q.CreatedBy,
        isPublished: q.IsPublished
      }))
    );
  }

  publishQuiz(quizId: number) {
    return this.http.put(`${this.api}/${quizId}/publish`, {}, this.headers());
  }

  // -------------------------
  // QUESTIONS
  // -------------------------

  addQuestion(quizId: number, data: Partial<QuizQuestion>): Observable<QuizQuestion> {
    return this.http.post<any>(`${this.api}/${quizId}/questions`, data, this.headers()).pipe(
      map(q => ({
        id: q.Id,
        quizId: q.QuizId,
        questionText: q.QuestionText,
        questionType: q.QuestionType,
        points: q.Points
      }))
    );
  }

  getQuestions(quizId: number): Observable<QuizQuestion[]> {
    return this.http.get<any[]>(`${this.api}/${quizId}/questions`, this.headers()).pipe(
      map(res => res.map(q => ({
        id: q.Id,
        quizId: q.QuizId,
        questionText: q.QuestionText,
        questionType: q.QuestionType,
        points: q.Points
      })))
    );
  }

  // In quiz.service.ts
  updateQuestion(questionId: number, data: Partial<QuizQuestion>) {
    return this.http.put(`${this.questionsApi}/${questionId}`, data, this.headers());
  }


    // -------------------------
  // OPTIONS
  // -------------------------

  // quiz.service.ts
updateOption(optionId: number, data: Partial<QuizOption>) {
  const payload = {
    ...data,
    isCorrect: data.isCorrect ? 1 : 0
  };
  return this.http.put(`http://localhost:3000/api/options/${optionId}`, payload, this.headers());
}


addOption(questionId: number, data: Partial<QuizOption>) {
  const payload = {
    ...data,
    isCorrect: data.isCorrect ? 1 : 0
  };
  return this.http.post<any>(`${this.questionsApi}/${questionId}/options`, payload, this.headers()).pipe(
    map(o => ({
      id: o.Id,
      questionId: o.QuestionId,
      optionText: o.OptionText,
      isCorrect: !!o.IsCorrect  // convertim 0/1 → boolean
    }))
  );
}


  getOptions(questionId: number): Observable<QuizOption[]> {
    return this.http.get<any[]>(`${this.questionsApi}/${questionId}/options`, this.headers()).pipe(
      map(res => res.map(o => ({
        id: o.Id,
        questionId: o.QuestionId,
        optionText: o.OptionText,
        isCorrect: o.IsCorrect
      })))
    );
  }

  deleteOption(optionId: number) {
    return this.http.delete(`${this.questionsApi}/${optionId}`, this.headers());
  }

  // -------------------------
  // STUDENT SUBMISSION
  // -------------------------

  submitQuiz(quizId: number, answers: any): Observable<{ score: number }> {
    return this.http.post<{ score: number }>(`${this.api}/${quizId}/submit`, answers, this.headers());
  }

  getQuizResults(quizId: number): Observable<QuizResult[]> {
    return this.http.get<any[]>(`${this.api}/${quizId}/results`, this.headers()).pipe(
      map(res => res.map(r => ({
        id: r.Id,
        quizId: r.QuizId,
        studentId: r.StudentId,
        score: r.Score,
        submittedAt: r.SubmittedAt
      })))
    );
  }
}
