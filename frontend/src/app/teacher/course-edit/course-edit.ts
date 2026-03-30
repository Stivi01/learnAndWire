import { ChangeDetectorRef, Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Course, EditableCourse, PublishReadinessResponse } from '../../core/services/course';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth';
import { ToastService } from '../../core/services/toast';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-course-edit',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './course-edit.html',
  styleUrl: './course-edit.scss',
})
export class CourseEdit {
  courseForm!: FormGroup;
  courseId!: number;
  loading = false;
  publishReadiness: PublishReadinessResponse | null = null;

  constructor(
    private fb: FormBuilder,
    private courseService: Course,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.courseForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      thumbnailUrl: [''],
      isPublished: [{ value: false, disabled: true }],
    });

    this.courseForm.get('title')?.valueChanges.subscribe(() => this.updatePublishControl());
    this.courseForm.get('description')?.valueChanges.subscribe(() => this.updatePublishControl());

    this.route.queryParams.subscribe(params => {
      this.courseId = +params['id'];
      if (this.courseId) {
        const user = this.authService.currentUserValue;
        if (!user) {
          this.toast.show('Nu sunteți logat!', 'error');
          this.router.navigate(['/login']);
          return;
        }
        this.loadCourse(this.courseId, user.id);
      }
    });
  }

  get canPublish(): boolean {
    const title = (this.courseForm?.get('title')?.value || '').trim();
    const description = (this.courseForm?.get('description')?.value || '').trim();
    const checks = this.publishReadiness?.checks;

    return !!title && !!description && !!checks?.hasModule && !!checks?.everyModuleHasLesson;
  }

  get publishChecklist() {
    const title = (this.courseForm?.get('title')?.value || '').trim();
    const description = (this.courseForm?.get('description')?.value || '').trim();
    const checks = this.publishReadiness?.checks;

    return [
      { label: 'Titlul cursului este completat', done: !!title },
      { label: 'Descrierea cursului este completată', done: !!description },
      { label: 'Există cel puțin un modul', done: !!checks?.hasModule },
      { label: 'Fiecare modul are cel puțin o lecție', done: !!checks?.everyModuleHasLesson },
    ];
  }

  get missingPublishItems(): string[] {
    const items: string[] = [];
    const title = (this.courseForm?.get('title')?.value || '').trim();
    const description = (this.courseForm?.get('description')?.value || '').trim();

    if (!title) {
      items.push('Adaugă titlul cursului.');
    }

    if (!description) {
      items.push('Adaugă descrierea cursului.');
    }

    for (const item of this.publishReadiness?.missingItems || []) {
      const normalized = item.toLowerCase();
      if (normalized.includes('titlul cursului') || normalized.includes('descrierea cursului')) {
        continue;
      }

      if (!items.includes(item)) {
        items.push(item);
      }
    }

    return items;
  }

  loadCourse(courseId: number, teacherId: number) {
    this.loading = true;

    forkJoin({
      courses: this.courseService.getEditableCoursesByTeacher(teacherId),
      readiness: this.courseService.getPublishReadiness(courseId)
    }).subscribe({
      next: ({ courses, readiness }) => {
        const course = courses.find(c => c.Id === courseId);
        if (!course) {
          this.toast.show('Cursul nu a fost găsit.', 'error');
          this.loading = false;
          this.cdr.detectChanges();
          this.router.navigate(['/teacher/my-classes']);
          return;
        }

        this.publishReadiness = readiness;
        this.courseForm.patchValue({
          title: course.Title,
          description: course.Description || '',
          thumbnailUrl: course.ThumbnailUrl || '',
          isPublished: course.IsPublished,
        });

        this.updatePublishControl();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.toast.show('Eroare la încărcarea cursului.', 'error');
        this.loading = false;
        this.cdr.detectChanges();
        this.router.navigate(['/teacher/my-classes']);
      }
    });
  }

  private updatePublishControl() {
    const publishControl = this.courseForm.get('isPublished');
    if (!publishControl) {
      return;
    }

    const keepEnabled = this.canPublish || publishControl.value === true;

    if (keepEnabled) {
      publishControl.enable({ emitEvent: false });
      return;
    }

    publishControl.disable({ emitEvent: false });
  }

  onSubmit() {
    if (this.courseForm.invalid) {
      this.courseForm.markAllAsTouched();
      return;
    }

    const formValue = this.courseForm.getRawValue();
    const payload = {
      title: (formValue.title || '').trim(),
      description: (formValue.description || '').trim(),
      thumbnailUrl: formValue.thumbnailUrl,
      isPublished: formValue.isPublished,
    };

    if (payload.isPublished && !this.canPublish) {
      this.toast.show(`Cursul nu poate fi publicat încă. ${this.missingPublishItems.join(' ')}`, 'error');
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    this.courseService.updateCourse(this.courseId, payload).subscribe({
      next: () => {
        this.toast.show('Curs actualizat cu succes!', 'success');
        this.router.navigate(['/teacher/my-classes']);
      },
      error: (err) => {
        console.error(err);
        const message = err?.error?.message || 'Eroare la actualizarea cursului.';
        const missingItems = Array.isArray(err?.error?.missingItems)
          ? ` ${err.error.missingItems.join(' ')}`
          : '';

        this.toast.show(`${message}${missingItems}`, 'error');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
