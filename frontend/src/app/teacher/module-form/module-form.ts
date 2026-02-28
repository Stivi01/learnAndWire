import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Module } from '../../core/services/module';
import { AuthService } from '../../core/services/auth';
import { CourseLesson, Lesson } from '../../core/services/lesson';
import { ToastService } from '../../core/services/toast';
import { forkJoin, map, switchMap } from 'rxjs';

interface UIModule {
  id: number;
  title: string;
  orderIndex: number;
  lessons: { id: number; title: string }[];
  editing?: boolean;
  editTitle?: string;
}

@Component({
  selector: 'app-module-form',
  imports: [CommonModule,ReactiveFormsModule,FormsModule],
  standalone: true,
  templateUrl: './module-form.html',
  styleUrl: './module-form.scss',
})

export class ModuleForm implements OnInit{
  courseId!: number;
  modules: any[] = [];
  moduleForm!: FormGroup;
  loading = false;
  error = '';
  expandedModuleIds = new Set<number>();
  selectedLesson = signal<any | null>(null);
  isModalOpening = signal(false);

  constructor(
    private fb: FormBuilder,
    private moduleService: Module,
    private lessonService: Lesson,
    private route: ActivatedRoute,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.courseId = Number(this.route.snapshot.queryParamMap.get('courseId'));
    if (!this.courseId) {
      this.error = 'Nu s-a găsit ID-ul cursului!';
      return;
    }

    this.moduleForm = this.fb.group({
      title: ['', Validators.required]
    });

    this.loadModules();
  }

  // --- Load Modules + lessons ---
  loadModules() {
  this.loading = true;
  this.moduleService.getModulesByCourse(this.courseId).pipe(
    switchMap(modules => {
      // Creăm un array de request-uri pentru lecții
      const requests = modules.map(m => 
        this.lessonService.getLessonsByModule(m.Id).pipe(
          map(lessons => ({
            id: m.Id,
            title: m.Title,
            orderIndex: m.OrderIndex,
            lessons: lessons.map(l => ({ id: l.Id, title: l.Title }))
          }))
        )
      );
      return forkJoin(requests); // Așteaptă să se termine TOATE request-urile de lecții
    })
  ).subscribe({
    next: (fullData) => {
      this.modules = fullData; // Acum ai datele complete dintr-odată!
      this.loading = false;
    },
    error: () => { this.loading = false; }
  });
}

  // --- CRUD Module ---
  addModule() {
    if (this.moduleForm.invalid) return;

    const newModule = {
      title: this.moduleForm.value.title,
      courseId: this.courseId,
      orderIndex: this.modules.length + 1
    };

    this.moduleService.createModule(newModule).subscribe({
      next: module => {
        this.modules.push({
          id: module.Id,
          courseId: module.CourseId,
          title: module.Title,
          orderIndex: module.OrderIndex,
          lessons: [],
          showAddLessonForm: false,
          newLessonTitle: ''
        });
        this.moduleForm.reset();
        this.toastService.show('Capitolul a fost adăugat cu succes!', 'success');
      },
      error: err => {
        console.error(err);
        this.toastService.show('Eroare la adăugarea capitolului.', 'error');
      }
    });
  }

  editModule(mod: any) {
    this.router.navigate(['/teacher/module-edit'], { queryParams: { moduleId: mod.id } });
  }

  startEditing(mod: any) {
    mod.editing = true;
    mod.editTitle = mod.title ?? '';
  }

  cancelEditing(mod: any) {
    mod.editing = false;
  }

  saveModuleEdit(mod: any) {
  if (!mod.editTitle || mod.editTitle.trim() === '') return;

  const updatedData = {
    title: mod.editTitle.trim(),
    orderIndex: mod.orderIndex   // 🔑 păstrează valoarea reală
  };

  this.moduleService.updateModule(mod.id, updatedData).subscribe({
    next: () => {
      mod.title = mod.editTitle;
      mod.editing = false;
      this.toastService.show('Capitolul a fost actualizat!', 'success');
    },
    error: err => {
      console.error('Eroare la actualizarea capitolului:', err);
      this.toastService.show('Eroare la actualizarea capitolului.', 'error');
    }
  });
}

  deleteModule(mod: any) {
    if (!confirm('Sigur ștergi capitolul?')) return;

    this.moduleService.deleteModule(mod.id).subscribe({
      next: () => {
        this.modules = this.modules.filter(m => m.id !== mod.id);
        this.toastService.show('Capitolul a fost șters cu succes!', 'success');
        this.loadModules();
      },
      error: err => {
        console.error(err);
        this.toastService.show('Eroare la ștergerea capitolului.', 'error');
      }
    });
  }

  deleteAllModules() {
    if (!confirm('Sigur vrei să ștergi toate capitolele și lecțiile asociate?')) return;

    this.moduleService.deleteAllModulesByCourse(this.courseId).subscribe({
      next: () => {
        // Golește lista locală și da refresh
        this.modules = [];
        this.toastService.show('Toate capitolele au fost șterse cu succes.', 'success');
        // Reîncarcă modulele dacă vrei să fii sigur
        this.loadModules();
      },
      error: err => {
        console.error(err);
        this.toastService.show('Eroare la ștergerea tuturor capitolelor.', 'error');
      }
    });
  }

  // --- Toggle module collapse ---
  toggleModule(id: number) {
    if (this.expandedModuleIds.has(id)) this.expandedModuleIds.delete(id);
    else this.expandedModuleIds.add(id);
  }

  isExpanded(id: number) {
    return this.expandedModuleIds.has(id);
  }

  // --- CRUD Lessons ---
  showAddLesson(mod: any) {
    mod.showAddLessonForm = true;
  }

  addLesson(mod: any) {
    if (!mod.newLessonTitle) return;

    const newLesson: CourseLesson = {
      moduleId: mod.id,
      Title: mod.newLessonTitle,
      Content: '',
      OrderIndex: mod.lessons.length + 1
    };

    this.lessonService.createLesson(newLesson).subscribe({
      next: lesson => {
        mod.lessons.push({
          id: lesson.Id,
          title: lesson.Title,
          content: lesson.Content,
          orderIndex: lesson.OrderIndex,
          videoUrl: lesson.VideoUrl
        });
        mod.newLessonTitle = '';
        mod.showAddLessonForm = false;
        this.toastService.show('Subcapitolul a fost adăugat!', 'success');
      },
      error: err => {
        console.error(err);
        this.toastService.show('Eroare la adăugarea subcapitolului.', 'error');
      }
    });
  }

  editLesson(lesson: any) {
    this.router.navigate(['/teacher/lesson-edit'], { queryParams: { lessonId: lesson.id } });
  }

  deleteLesson(lesson: any, mod: any) {
    if (!confirm('Sigur ștergi subcapitolul?')) return;

    this.lessonService.deleteLesson(lesson.id).subscribe({
      next: () => {
        mod.lessons = mod.lessons.filter((l: any) => l.id !== lesson.id);
        this.toastService.show('Subcapitolul a fost șters!', 'success');
      },
      error: err => {
        console.error(err);
        this.toastService.show('Eroare la ștergerea subcapitolului.', 'error');
      }
    });
  }

  // Adaugă aceste semnale/proprietăți în clasa ModuleForm


  // Metoda pentru deschiderea preview-ului (folosește serviciul pentru a lua datele complete)
  openLessonPreview(sub: any) {
    this.loading = true;
    this.lessonService.getLessonsByModule(sub.id).subscribe({
      next: (fullLesson) => {
        this.selectedLesson.set(fullLesson);
        this.loading = false;
        setTimeout(() => this.isModalOpening.set(true), 10);
      },
      error: () => {
        this.toastService.show('Nu s-au putut încărca detaliile lecției', 'error');
        this.loading = false;
      }
    });
  }

  closePreview() {
    this.isModalOpening.set(false);
    setTimeout(() => this.selectedLesson.set(null), 300);
  }
}