import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
    private toastService: ToastService,
    private cd: ChangeDetectorRef
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
  this.loading = true;

  this.moduleService.getModuleById(this.moduleId).subscribe({
    next: module => {
      this.moduleTitle = module.Title ?? '';
      this.courseTitle = module.CourseTitle ?? '';

      // Condiții la publicare nu blochează adăugarea de subcapitole.
      // Preia lecțiile existente ca să calculăm orderIndex
      this.lessonService.getLessonsByModule(this.moduleId).subscribe({
        next: lessons => {
          const maxOrderIndex = lessons.length > 0 
            ? Math.max(...lessons.map(l => l.OrderIndex ?? 0))
            : 0;

          this.lessonForm.patchValue({ orderIndex: maxOrderIndex + 1 });
          this.loading = false;
          this.cd.detectChanges();
        },
        error: () => {
          this.error = 'Nu s-au putut încărca lecțiile modulului.';
          this.loading = false;
          this.cd.detectChanges();
        }
      });
    },
    error: () => {
      this.error = 'Nu s-au putut încărca informațiile modulului.';
      this.loading = false;
      this.cd.detectChanges();
    }
  });
}

  addLesson() {
    if (this.lessonForm.invalid) return;

    const newLesson = {
      ...this.lessonForm.value,
      moduleId: this.moduleId,
    };

    // --- Validări locale înainte de trimitere ---
    this.lessonService.getLessonsByModule(this.moduleId).subscribe({
      next: lessons => {
        // 1️⃣ Verificare titlu duplicat
        const titleDuplicate = lessons.some(l => l.Title.trim().toLowerCase() === newLesson.title.trim().toLowerCase());
        if (titleDuplicate) {
          this.toastService.show('Există deja un subcapitol cu acest titlu!', 'error');
          return;
        }

        // 2️⃣ Verificare orderIndex duplicat
        const orderDuplicate = lessons.some(l => l.OrderIndex === newLesson.orderIndex);
        if (orderDuplicate) {
          this.toastService.show(`Există deja un subcapitol pe poziția ${newLesson.orderIndex}!`, 'error');
          return;
        }

        if (this.lessonForm.value.orderIndex < 1) {
          this.toastService.show('Poziția trebuie să fie cel puțin 1.', 'error');
          return;
        }

        // Totul valid -> creăm subcapitolul
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
      },
      error: err => {
        console.error(err);
        this.toastService.show('Nu s-au putut prelua lecțiile modulului.', 'error');
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

