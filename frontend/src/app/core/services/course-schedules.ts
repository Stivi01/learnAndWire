import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { AuthService } from './auth';
import { CourseItem } from './course';

@Injectable({
  providedIn: 'root',
})
export class CourseSchedules {
  private apiUrl = 'http://localhost:3000/api/course-schedules';
  private selectedCourse: CourseItem | null = null;

  constructor(private http: HttpClient) {}

  // =============================
  // API METHODS
  // =============================
  addCourseSchedule(payload: any): Observable<any> {
    const token = localStorage.getItem('token') || '';
    const headers = { Authorization: `Bearer ${token}` };
    return this.http.post<any>(this.apiUrl, payload, { headers });
  }

  getCourseSchedules(courseId: number): Observable<any[]> {
    const token = localStorage.getItem('token') || '';
    const headers = { Authorization: `Bearer ${token}` };
    return this.http.get<any[]>(`${this.apiUrl}?courseId=${courseId}`, { headers });
  }

  getCoursesWithSchedules() {
    const token = localStorage.getItem('token') || '';
    return this.http.get<any[]>(`${this.apiUrl}/teacher/all-schedules`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  updateCourseSchedule(scheduleId: number, payload: any): Observable<any> {
    const token = localStorage.getItem('token') || '';
    const headers = { Authorization: `Bearer ${token}` };
    return this.http.put<any>(`${this.apiUrl}/${scheduleId}`, payload, { headers });
  }

  deleteCourseSchedule(scheduleId: number): Observable<any> {
    const token = localStorage.getItem('token') || '';
    const headers = { Authorization: `Bearer ${token}` };
    return this.http.delete<any>(`${this.apiUrl}/${scheduleId}`, { headers });
  }

  getScheduleForCourse(courseId: number): Observable<any | null> {
    const token = localStorage.getItem('token') || '';

    return this.http
      .get<any[]>(`${this.apiUrl}?courseId=${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .pipe(
        map(res => {
          if (!res || res.length === 0) return null;

          const s = res[0]; // presupunem 1 schedule / curs

          return {
            id: s.Id,
            courseId: s.CourseId,
            dayOfWeek: s.DayOfWeek,
            startTime: s.StartTime,
            endTime: s.EndTime,
            isActive: s.IsActive
          };
        })
      );
  }

  // =============================
  // SELECTED COURSE METHODS
  // =============================
  setSelectedCourse(course: CourseItem) {
    this.selectedCourse = course;
  }

  getSelectedCourse(): CourseItem | null {
    return this.selectedCourse;
  }

  clearSelectedCourse() {
    this.selectedCourse = null;
  }



  getStudentSchedules() {
    const token = localStorage.getItem('token') || '';
    return this.http.get<any[]>(`http://localhost:3000/api/student/course-schedules`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  getUpcomingStudentSchedules() {
    const token = localStorage.getItem('token') || '';
    return this.http.get<any[]>(`http://localhost:3000/api/student/course-schedules/upcoming`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
}
