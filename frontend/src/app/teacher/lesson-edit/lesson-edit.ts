import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Lesson } from '../../core/services/lesson';
import { ToastService } from '../../core/services/toast';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lesson-edit',
  imports: [CommonModule, ReactiveFormsModule],
  standalone: true,
  templateUrl: './lesson-edit.html',
  styleUrl: './lesson-edit.scss',
})
export class LessonEdit implements OnInit{
  lessonForm!: FormGroup;
  lessonId!: number;
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private lessonService: Lesson,
    private router: Router,
    private toastService: ToastService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
  const lessonId = Number(this.route.snapshot.paramMap.get('lessonId'));
  console.log('Lesson ID:', lessonId);
  this.lessonId=lessonId;

  this.lessonForm = this.fb.group({
    Title: ['', Validators.required],
    Content: [''],
    VideoUrl: [''],
    OrderIndex: [1, [Validators.required, Validators.min(1)]], // 🔥 aici
    ModuleId: [null]
  });

  this.loadLesson();
}

  loadLesson() {
  this.loading = true;

  this.lessonService.getLessonById(this.lessonId).subscribe({
    next: lesson => {
      console.log('Lesson primit din backend:', lesson);

      this.lessonForm.patchValue(lesson);

      console.log('Form value după patch:', this.lessonForm.value);

      this.loading = false;
      this.cd.detectChanges();
    },
    error: () => {
      this.toastService.show('Eroare la încărcarea lecției.', 'error');
      this.loading = false;
      this.cd.detectChanges();
    }
  });
}

  saveLesson() {
  if (this.lessonForm.invalid) return;

  const formValue = this.lessonForm.value;

  const updatedLesson = {
    id: this.lessonId,
    title: formValue.Title?.trim(),
    content: formValue.Content,
    videoUrl: formValue.VideoUrl,
    orderIndex: formValue.OrderIndex
  };

  const moduleId = this.lessonForm.value.ModuleId;
  if (!moduleId) {
    this.toastService.show('Nu s-a găsit modulul lecției.', 'error');
    return;
  }

  this.lessonService.getLessonsByModule(moduleId).subscribe({
    next: lessons => {

      // 🔹 1. Validare titlu duplicat (ignorăm lecția curentă)
      const titleDuplicate = lessons.some(l =>
        l.Id !== this.lessonId &&
        l.Title?.trim().toLowerCase() === updatedLesson.title.toLowerCase()
      );

      if (titleDuplicate) {
        this.toastService.show('Există deja un subcapitol cu acest titlu!', 'error');
        return;
      }

      // 🔹 2. Validare orderIndex duplicat (ignorăm lecția curentă)
      const orderDuplicate = lessons.some(l =>
        l.Id !== this.lessonId &&
        l.OrderIndex === updatedLesson.orderIndex
      );

      if (orderDuplicate) {
        this.toastService.show(
          `Există deja un subcapitol pe poziția ${updatedLesson.orderIndex}!`,
          'error'
        );
        return;
      }

      if (updatedLesson.orderIndex < 1) {
        this.toastService.show('Poziția trebuie să fie cel puțin 1.', 'error');
        return;
      }

      // ✅ Dacă totul este valid → facem update
      this.lessonService.updateLesson(updatedLesson).subscribe({
        next: () => {
          this.toastService.show('Subcapitol actualizat!', 'success');
          this.router.navigate(['/teacher/my-classes']);
        },
        error: err => {
          console.error('Eroare la update:', err);
          this.toastService.show('Eroare la actualizare.', 'error');
        }
      });

    },
    error: () => {
      this.toastService.show('Nu s-au putut prelua lecțiile modulului.', 'error');
    }
  });
}

  goBack() {
    this.router.navigate(['/teacher/modules']);
  }
}
