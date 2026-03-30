import { Component, OnInit, signal } from '@angular/core';
import { Course, CourseItem } from '../../core/services/course';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { filter, startWith, Subject, switchMap, take, takeUntil } from 'rxjs';
import { CourseSchedules } from '../../core/services/course-schedules';
import { ToastService } from '../../core/services/toast';

@Component({
  selector: 'app-my-classes',
  imports: [CommonModule,ReactiveFormsModule,RouterModule],
  standalone: true,
  templateUrl: './my-classes.html',
  styleUrl: './my-classes.scss',
})
export class MyClasses implements OnInit{

  courses = signal<any[]>([]);
  loading = signal(true);
  error = signal('');
  expandedCourseId = signal<number | null>(null);
  selectedLesson = signal<any | null>(null);

  private destroy$ = new Subject<void>();

  constructor(
    private courseService: Course,
    private authService: AuthService,
    private courseScheduleService: CourseSchedules,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.router.events
      .pipe(
        startWith(new NavigationEnd(0, this.router.url, this.router.url)),
        filter(event => event instanceof NavigationEnd),
        switchMap(() => this.authService.currentUser$),
        filter(user => !!user),
        switchMap(user => {
          this.loading.set(true);
          return this.courseService.getCoursesByTeacher(user!.id, this.authService.getToken()!);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: courses => {
          this.courses.set(courses);
          this.loading.set(false);
        },
        error: err => {
          console.error(err);
          this.error.set('Nu s-au putut încărca cursurile.');
          this.loading.set(false);
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleCourse(courseId: number) {
    if (this.expandedCourseId() === courseId) {
      this.expandedCourseId.set(null);
      return;
    }

    this.expandedCourseId.set(courseId);

    this.courseService.getFullCourse(courseId).subscribe({
      next: (full) => {
        // adăugăm expanded = false pentru fiecare lecție
        full.modules.forEach((mod: any) => {
          mod.lessons.forEach((lesson: any) => lesson.expanded = false);
        });

        const updated = this.courses().map(c =>
          c.Id === courseId ? { ...c, modules: full.modules } : c
        );
        this.courses.set(updated);
      }
    });
  }

  toggleLesson(lesson: any) {
    lesson.expanded = !lesson.expanded;
  }

  addModule(course: any) {
    if (course.IsPublished) {
      this.toast.show('Cursul este publicat și nu mai poți modifica capitolele.', 'info');
      return;
    }

    this.router.navigate(['/teacher/module-form'], { queryParams: { courseId: course.Id } });
  }

  addLesson(moduleId: number, course: any) {
    if (course.IsPublished) {
      this.toast.show('Cursul este publicat și nu mai poți modifica subcapitolele.', 'info');
      return;
    }

    this.router.navigate(['/teacher/lesson-form'], { queryParams: { moduleId } });
  }

  editCourse(course: any) {
    if (course.IsPublished) {
      this.toast.show('Cursul este publicat și nu mai poate fi editat.', 'info');
      return;
    }

    this.router.navigate(['/teacher/edit-course'], { queryParams: { id: course.Id } });
  }

  inviteStudents(course: any) {
    this.router.navigate(['/teacher/invite-students'], { state: { course } });
  }

  scheduleCourse(course: CourseItem) {
    this.courseScheduleService.setSelectedCourse(course);
    this.router.navigate(['/teacher/course-schedule']);
  }

  goToAddCourse() {
    this.router.navigate(['/teacher/course-form']);
  }

  

  // Metoda pentru a deschide modalul
  openLessonPreview(lesson: any) {
    this.selectedLesson.set(lesson);
  }

  // Metoda pentru a închide modalul
  closePreview() {
    this.selectedLesson.set(null);
  }


}
