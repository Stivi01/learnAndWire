import { Component, OnInit, signal } from '@angular/core';
import { Course } from '../../core/services/course';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-student-list-teacher',
  imports: [CommonModule,FormsModule],
  standalone: true,
  templateUrl: './student-list-teacher.html',
  styleUrl: './student-list-teacher.scss',
})
export class StudentListTeacher implements OnInit{
  courses = signal<any[]>([]);
  loading = signal(true);

  searchTerm = signal('');
  sortDirection = signal<'asc' | 'desc'>('asc');

  expandedCourses = signal<Set<number>>(new Set());

  constructor(private courseService: Course) {}

  ngOnInit(): void {
    this.courseService.getCoursesWithStudents().subscribe({
      next: data => {
        this.courses.set(data);
        this.loading.set(false);
      },
      error: err => {
  console.error("STATUS:", err.status);
  console.error("MESSAGE:", err.message);
  console.error("FULL ERROR:", err);
  this.loading.set(false);
}
    });
  }

  toggleCourse(courseId: number) {
    const set = new Set(this.expandedCourses());
    set.has(courseId) ? set.delete(courseId) : set.add(courseId);
    this.expandedCourses.set(set); 
  }

  isExpanded(courseId: number) {
    return this.expandedCourses().has(courseId);
  }

  getFilteredStudents(students: any[]) {
    let filtered = students;

    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(s =>
        `${s.FirstName} ${s.LastName}`.toLowerCase().includes(term) ||
        s.Email.toLowerCase().includes(term)
      );
    }

    filtered = filtered.sort((a, b) => {
      if (this.sortDirection() === 'asc') {
        return a.AcademicYear - b.AcademicYear;
      } else {
        return b.AcademicYear - a.AcademicYear;
      }
    });

    return filtered;
  }

  toggleSort() {
    this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
  }

  exportCourseCSV(course: any) {
    const students = course.students;

    if (!students.length) return;

    const header = "FirstName,LastName,Email,AcademicYear\n";
    const rows = students.map((s: any) =>
      `${s.FirstName},${s.LastName},${s.Email},${s.AcademicYear}`
    ).join("\n");

    this.downloadCSV(header + rows, `${course.Title}.csv`);
  }

  exportAllCSV() {
    let csv = "Course,FirstName,LastName,Email,AcademicYear\n";

    this.courses().forEach(course => {
      course.students.forEach((s: any) => {
        csv += `${course.Title},${s.FirstName},${s.LastName},${s.Email},${s.AcademicYear}\n`;
      });
    });

    this.downloadCSV(csv, "all_students.csv");
  }

  downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    window.URL.revokeObjectURL(url);
  }
}
