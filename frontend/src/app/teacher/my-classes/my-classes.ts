import { Component, OnInit, signal } from '@angular/core';
import { Course } from '../../core/services/course';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { filter, startWith, Subject, switchMap, take, takeUntil } from 'rxjs';

@Component({
  selector: 'app-my-classes',
  imports: [CommonModule,ReactiveFormsModule],
  standalone: true,
  templateUrl: './my-classes.html',
  styleUrl: './my-classes.scss',
})
export class MyClasses implements OnInit{

  courses = signal<any[]>([]);
  loading = signal(true);
  error = signal('');
  expandedCourseId = signal<number | null>(null);

  private destroy$ = new Subject<void>();

  constructor(
    private courseService: Course,
    private authService: AuthService,
    private router: Router
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

  addModule(courseId: number) {
    this.router.navigate(['/teacher/module-form'], { queryParams: { courseId } });
  }

  addLesson(moduleId: number) {
    this.router.navigate(['/teacher/lesson-form'], { queryParams: { moduleId } });
  }

  editCourse(courseId: number) {
    this.router.navigate(['/teacher/course-form'], { queryParams: { id: courseId } });
  }

  inviteStudents(courseId: number) {
    this.router.navigate(['/teacher/invite-students'], { queryParams: { id: courseId } });
  }
}
