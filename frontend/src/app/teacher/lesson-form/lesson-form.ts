import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Lesson } from '../../core/services/lesson';
import { Module } from '../../core/services/module';
import { ToastService } from '../../core/services/toast';

@Component({
  selector: 'app-lesson-form',
  imports: [CommonModule,ReactiveFormsModule],
  standalone:true,
  templateUrl: './lesson-form.html',
  styleUrl: './lesson-form.scss',
})
export class LessonForm implements OnInit {
  courseId!: number;
  courseTitle = '';
  moduleId!: number;
  moduleTitle = '';

  lessonForm!: FormGroup;
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private lessonService: Lesson,
    private moduleService: Module,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
  this.moduleId = Number(this.route.snapshot.queryParamMap.get('moduleId'));

  if (!this.moduleId) {
    this.error = 'Nu s-a găsit ID-ul modulului!';
    return;
  }

  this.initForm();
  this.loadModuleDetails(); // 👈 doar modulul
}

private initForm() {
  this.lessonForm = this.fb.group({
    title: ['', Validators.required],
    content: ['', Validators.required],
    videoUrl: [''],
    orderIndex: [1, [Validators.required, Validators.min(1)]],
  });
}
  loadModuleDetails() {
    this.moduleService.getModuleById(this.moduleId).subscribe({
      next: module => {
        this.moduleTitle = module.Title;
        this.courseTitle = module.Course?.Title || ''; 
        // sau adaptează după structura ta backend
      },
      error: () => {
        this.error = 'Nu s-au putut încărca informațiile modulului.';
      }
    });
  }

  addLesson() {
    if (this.lessonForm.invalid) return;

    const newLesson = {
      ...this.lessonForm.value,
      moduleId: this.moduleId,
    };

    this.lessonService.createLesson(newLesson).subscribe({
      next: lesson => {
        this.toastService.show('Subcapitolul a fost adăugat cu succes!', 'success');
        this.router.navigate(['/teacher/my-classes']);
      },
      error: err => {
        console.error(err);
        this.toastService.show('Eroare la adăugarea subcapitolului.', 'error');
      }
    });
  }
}

//   deleteLesson(id: number) {
//   if (!confirm("Sigur vrei să ștergi lecția?")) return;

//   this.lessonService.deleteLesson(id).subscribe({
//     next: () => {
//       this.lessons = this.lessons.filter(l => l.id !== id);
//     },
//     error: err => console.error(err)
//   });
// }

