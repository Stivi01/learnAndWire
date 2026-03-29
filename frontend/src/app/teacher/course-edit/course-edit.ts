import { ChangeDetectorRef, Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Course, CourseItem, EditableCourse } from '../../core/services/course';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth';
import { ToastService } from '../../core/services/toast';

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
    isPublished: [false],
  });

  this.route.queryParams.subscribe(params => {
    this.courseId = +params['id'];
    if (this.courseId) {
      const user = this.authService.currentUserValue // metoda ta de a lua utilizatorul logat
      if (!user) {
        this.toast.show('Nu sunteți logat!', 'error');
        this.router.navigate(['/login']);
        return;
      }
      this.loadCourse(this.courseId, user.id);
    }
  });
}

loadCourse(courseId: number, teacherId: number) {
  this.loading = true;
  this.courseService.getEditableCoursesByTeacher(teacherId).subscribe({
    next: (courses: EditableCourse[]) => {
      const course = courses.find(c => c.Id === courseId);
      if (!course) {
        this.toast.show('Cursul nu a fost găsit.', 'error');
        this.loading = false; // 
        this.cdr.detectChanges();
        this.router.navigate(['/teacher/my-classes']);
        return;
      }
      this.courseForm.patchValue({
        title: course.Title,
        description: course.Description,
        thumbnailUrl: course.ThumbnailUrl || '',
        isPublished: course.IsPublished,
      });
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

  onSubmit() {
    if (this.courseForm.invalid) return;

    this.loading = true;
    this.cdr.detectChanges();

    const payload = {
      title: this.courseForm.value.title,
      description: this.courseForm.value.description,
      thumbnailUrl: this.courseForm.value.thumbnailUrl,
      isPublished: this.courseForm.value.isPublished,
    };

    this.courseService.updateCourse(this.courseId, payload).subscribe({
      next: () => {
        this.toast.show('Curs actualizat cu succes!', 'success');
        this.router.navigate(['/teacher/my-classes']);
      },
      error: (err) => {
        console.error(err);
        this.toast.show('Eroare la actualizarea cursului.', 'error');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
