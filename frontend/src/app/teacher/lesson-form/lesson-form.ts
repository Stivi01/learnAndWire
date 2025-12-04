import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Lesson } from '../../core/services/lesson';
import { Module } from '../../core/services/module';

@Component({
  selector: 'app-lesson-form',
  imports: [CommonModule,ReactiveFormsModule],
  standalone:true,
  templateUrl: './lesson-form.html',
  styleUrl: './lesson-form.scss',
})
export class LessonForm {
moduleId!: number;
  lessons: any[] = [];
  lessonForm!: FormGroup;
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private lessonService: Lesson,
    private moduleService: Module
  ) {}

  ngOnInit(): void {
    this.moduleId = Number(this.route.snapshot.queryParamMap.get('moduleId'));
    if (!this.moduleId) {
      this.error = 'Nu s-a găsit ID-ul modulului!';
      return;
    }

    this.lessonForm = this.fb.group({
      title: ['', Validators.required],
      content: ['', Validators.required],
      videoUrl: [''],
      orderIndex: [1, [Validators.required, Validators.min(1)]],
    });

    this.loadLessons();
  }

  loadLessons() {
    this.loading = true;
    this.lessonService.getLessonsByModule(this.moduleId).subscribe({
      next: lessons => {
        this.lessons = lessons.map(l => ({
          id: l.Id,
          title: l.Title,
          content: l.Content,
          orderIndex: l.OrderIndex,
          videoUrl: l.VideoUrl
        }));
        this.loading = false;
      },

      error: err => {
        console.error(err);
        this.error = 'Nu s-au putut încărca lecțiile.';
        this.loading = false;
      }
    });
  }

  addLesson() {
    if (this.lessonForm.invalid) return;

    const newLesson = {
      ...this.lessonForm.value,
      moduleId: this.moduleId
    };

    this.lessonService.createLesson(newLesson).subscribe({
      next: lesson => {
        this.lessons.push({
          id: lesson.Id,
          title: lesson.Title,
          content: lesson.Content,
          orderIndex: lesson.OrderIndex,
          videoUrl: lesson.VideoUrl
        });

        this.lessonForm.reset({ orderIndex: this.lessons.length + 1 });
      },

      error: err => console.error(err)
    });
  }
  deleteLesson(id: number) {
  if (!confirm("Sigur vrei să ștergi lecția?")) return;

  this.lessonService.deleteLesson(id).subscribe({
    next: () => {
      this.lessons = this.lessons.filter(l => l.id !== id);
    },
    error: err => console.error(err)
  });
}

}
