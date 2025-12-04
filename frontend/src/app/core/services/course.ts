import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface FullCourseResponse {
  course: any;
  modules: {
    id: number;
    title: string;
    lessons: { id: number; title: string }[];
  }[];
}

export interface CourseItem {
  Id: number;
  Title: string;
  Description: string;
  CreatedAt: string;
  IsPublished: boolean;
  modules?: ModuleItem[];
}

export interface ModuleItem {
  Id: number;
  Title: string;
  OrderIndex: number;
  lessons?: LessonItem[];
}

export interface LessonItem {
  Id: number;
  Title: string;
}


@Injectable({
  providedIn: 'root',
})
export class Course {
  private apiUrl = 'http://localhost:3000/api'; // sau ruta backend reală

  constructor(private http: HttpClient) { }

  // 1️⃣ Preluare cursuri pentru profesor
  getCoursesByTeacher(teacherId: number, token?: string): Observable<Course[]> {
    const httpOptions = token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : {};
    return this.http.get<Course[]>(`${this.apiUrl}/courses?createdBy=${teacherId}`, httpOptions);
  }


  // 2️⃣ Creare curs
  createCourse(data: any, headers: any): Observable<{ id: number }> {
  return this.http.post<{ id: number }>(`${this.apiUrl}/courses`, data, { headers });
}

  getMyCourses(): Observable<Course[]> {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    return this.http.get<Course[]>(`${this.apiUrl}/courses`, { headers });
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
  getFullCourse(courseId: number): Observable<FullCourseResponse> {
  const token = localStorage.getItem('token');

  return this.http.get<FullCourseResponse>(
    `${this.apiUrl}/courses/${courseId}/full`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
}




}
