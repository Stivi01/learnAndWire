import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Course, CourseItem } from '../../core/services/course';

@Component({
  selector: 'app-my-classes-student',
  imports: [CommonModule,RouterModule],
  standalone: true,
  templateUrl: './my-classes-student.html',
  styleUrl: './my-classes-student.scss',
})
export class MyClassesStudent {
  courses = signal<CourseItem[]>([]);
  loading = signal(false);
  error = signal('');

  constructor(private courseService: Course) {}

  ngOnInit() {
    this.loadCourses();
  }

  loadCourses() {
    this.loading.set(true);
    this.courseService.getStudentCourses().subscribe({
      next: (data) => {
        this.courses.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading student courses:', err);
        this.error.set('Nu s-au putut încărca cursurile.');
        this.loading.set(false);
      }
    });
  }
}
