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

  private destroy$ = new Subject<void>();

  constructor(private courseService: Course, private authService: AuthService, private router: Router) {}

   ngOnInit(): void {
    this.router.events
      .pipe(
        startWith(new NavigationEnd(0, this.router.url, this.router.url)), // emite și la refresh
        filter(event => event instanceof NavigationEnd),
        switchMap(() => this.authService.currentUser$),
        filter(user => !!user),
        switchMap(user => {
          this.loading.set(true);
          const token = this.authService.getToken()!;
          return this.courseService.getCoursesByTeacher(user!.id, token);
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







  editCourse(courseId: number) {
    this.router.navigate(['/teacher/course-form'], { queryParams: { id: courseId } });
  }

  inviteStudents(courseId: number) {
    this.router.navigate(['/teacher/invite-students'], { queryParams: { id: courseId } });
  }
}
