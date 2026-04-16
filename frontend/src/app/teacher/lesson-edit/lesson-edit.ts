import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Lesson } from '../../core/services/lesson';
import { Module } from '../../core/services/module';
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

  selectedFile: File | null = null;

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private lessonService: Lesson,
    private moduleService: Module,
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
    DocumentUrl: [''],
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

      const moduleId = Number((lesson as any).ModuleId ?? (lesson as any).moduleId);
      if (!moduleId) {
        this.toastService.show('Nu s-a putut identifica modulul lecției.', 'error');
        this.loading = false;
        this.cd.detectChanges();
        return;
      }

      this.moduleService.getModuleById(moduleId).subscribe({
        next: module => {
          // Permitem editarea subcapitolelor chiar dacă cursul este publicat.

          this.lessonForm.patchValue({
            Title: (lesson as any).Title ?? (lesson as any).title ?? '',
            Content: (lesson as any).Content ?? (lesson as any).content ?? '',
            DocumentUrl: (lesson as any).DocumentUrl ?? (lesson as any).documentUrl ?? '',
            OrderIndex: (lesson as any).OrderIndex ?? (lesson as any).orderIndex ?? 1,
            ModuleId: moduleId
          });

          console.log('Form value după patch:', this.lessonForm.value);
          this.loading = false;
          this.cd.detectChanges();
        },
        error: () => {
          this.toastService.show('Nu s-au putut încărca informațiile modulului.', 'error');
          this.loading = false;
          this.cd.detectChanges();
        }
      });
    },
    error: () => {
      this.toastService.show('Eroare la încărcarea lecției.', 'error');
      this.loading = false;
      this.cd.detectChanges();
    }
  });
}

  saveLesson() {
    // 1. Verificăm validitatea de bază a formularului
    if (this.lessonForm.invalid) return;

    const formValue = this.lessonForm.value;
    const moduleId = formValue.ModuleId;

    if (!moduleId) {
      this.toastService.show('Nu s-a găsit modulul lecției.', 'error');
      return;
    }

    // 2. Pregătim obiectul FormData pentru trimitere (necesar pentru fișiere)
    const formData = new FormData();
    formData.append('title', formValue.Title?.trim());
    formData.append('content', formValue.Content || '');
    formData.append('orderIndex', formValue.OrderIndex.toString());

    if (this.selectedFile) {
      formData.append('document', this.selectedFile);
    }

    // 3. Rulăm validările complexe (verificăm duplicatele în baza de date)
    this.lessonService.getLessonsByModule(moduleId).subscribe({
      next: (lessons) => {
        
        // 🔹 Validare 1: Titlu duplicat (excluzând lecția curentă)
        const titleDuplicate = lessons.some(l =>
          l.Id !== this.lessonId &&
          l.Title?.trim().toLowerCase() === formValue.Title?.trim().toLowerCase()
        );

        if (titleDuplicate) {
          this.toastService.show('Există deja un subcapitol cu acest titlu!', 'error');
          return;
        }

        // 🔹 Validare 2: OrderIndex duplicat (excluzând lecția curentă)
        const orderDuplicate = lessons.some(l =>
          l.Id !== this.lessonId &&
          l.OrderIndex === formValue.OrderIndex
        );

        if (orderDuplicate) {
          this.toastService.show(`Există deja un subcapitol pe poziția ${formValue.OrderIndex}!`, 'error');
          return;
        }

        // 🔹 Validare 3: Valoare minimă ordine
        if (formValue.OrderIndex < 1) {
          this.toastService.show('Poziția trebuie să fie cel puțin 1.', 'error');
          return;
        }

        // ✅ Dacă toate validările au trecut -> Trimitem ID-ul și FormData către service
        this.lessonService.updateLesson(this.lessonId, formData).subscribe({
          next: () => {
            this.toastService.show('Subcapitol actualizat cu succes!', 'success');
            this.router.navigate(['/teacher/my-classes']);
          },
          error: (err) => {
            console.error('Eroare la update:', err);
            this.toastService.show('Eroare la salvarea modificărilor.', 'error');
          }
        });

      },
      error: () => {
        this.toastService.show('Nu s-au putut prelua lecțiile modulului pentru validare.', 'error');
      }
    });
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  goBack() {
    this.router.navigate(['/teacher/modules']);
  }
}
