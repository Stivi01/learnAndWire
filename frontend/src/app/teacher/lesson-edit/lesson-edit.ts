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
    OrderIndex: [1],
    moduleId: [null]
  });

  this.loadLesson();
}

  loadLesson() {
    this.loading = true;

    this.lessonService.getLessonById(this.lessonId).subscribe({
      next: lesson => {
        this.lessonForm.patchValue(lesson);
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

  const updatedLesson = {
    id: this.lessonId, // 🔑 adaugă ID-ul
    title: this.lessonForm.value.Title,
    content: this.lessonForm.value.Content,
    videoUrl: this.lessonForm.value.VideoUrl,
    orderIndex: this.lessonForm.value.OrderIndex
  };

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
}

  goBack() {
    this.router.navigate(['/teacher/modules']);
  }
}
