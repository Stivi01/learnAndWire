import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Course {
  private apiUrl = 'http://localhost:3000/api'; // sau ruta backend reală

  constructor(private http: HttpClient) { }

  // 1️⃣ Preluare cursuri pentru profesor
  getCoursesByTeacher(teacherId: number): Observable<Course[]> {
    return this.http.get<Course[]>(`${this.apiUrl}/courses?createdBy=${teacherId}`);
  }

  // 2️⃣ Creare curs
  createCourse(courseData: any, headers?: any) {
    return this.http.post(`${this.apiUrl}/courses`, courseData, { headers });
  }


  // 3️⃣ Editare curs
  updateCourse(courseId: number, course: Partial<Course>): Observable<Course> {
    return this.http.put<Course>(`${this.apiUrl}/courses/${courseId}`, course);
  }

  // 4️⃣ Invitare studenți
  inviteStudents(courseId: number, studentIds: number[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/course-enrollments`, { courseId, studentIds });
  }

  // 5️⃣ Ștergere curs (opțional)
  deleteCourse(courseId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/courses/${courseId}`);
  }
}
