import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Module } from '../../core/services/module';
import { Course } from '../../core/services/course';
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

interface LessonItem {
  id: number;
  title: string;
  content?: string;
  orderIndex?: number;
  DocumentUrl?: string;
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
  courseIsPublished = false;
  expandedModuleIds = new Set<number>();
  selectedLesson = signal<any | null>(null);
  isModalOpening = signal(false);

  selectedFilesQuick: { [moduleId: number]: File } = {};

  constructor(
    private fb: FormBuilder,
    private moduleService: Module,
    private lessonService: Lesson,
    private courseService: Course,
    private route: ActivatedRoute,
    private router: Router,
    private toastService: ToastService,
    private cd: ChangeDetectorRef 
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

    this.loadCourseStatus();
    this.loadModules();
  }

  private loadCourseStatus() {
    this.courseService.getMyCourses().subscribe({
      next: (courses: any[]) => {
        const currentCourse = courses.find(course => Number(course.Id) === this.courseId);
        this.courseIsPublished = !!currentCourse?.IsPublished;
      },
      error: err => console.error('Eroare la verificarea stării cursului:', err)
    });
  }

  private canModifyCourseContent(): boolean {
    // Permitem modificarea capitolelor/subcapitolelor chiar dacă cursul este publicat.
    return true;
  }

  // --- Load Modules + lessons ---
  loadModules() {
  this.loading = true;
  this.moduleService.getModulesByCourse(this.courseId).pipe(
    switchMap(modules => {
      const requests = modules.map(m => 
        this.lessonService.getLessonsByModule(m.Id).pipe(
          map(lessons => ({
            id: m.Id,
            courseId: m.CourseId,
            title: m.Title,
            orderIndex: m.OrderIndex + 1,
            lessons: lessons.map(l => ({ 
              id: l.Id, 
              title: l.Title, 
              orderIndex: l.OrderIndex,
              content: l.Content,
              DocumentUrl: l.DocumentUrl  
            }))
            .sort((a, b) => a.orderIndex - b.orderIndex)
          }))
        )
      );
      return forkJoin(requests);
    })
  ).subscribe({
    next: (fullData) => {
      this.modules = fullData;        // setăm array-ul complet
      this.loading = false;
      this.cd.detectChanges();        // 🔑 forțăm re-render, doar dacă e nevoie
    },
    error: () => { 
      this.loading = false; 
      this.cd.detectChanges();
    }
  });
}

  // --- CRUD Module ---
  addModule() {
    if (!this.canModifyCourseContent()) return;
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

        this.cd.detectChanges();
      },
      error: err => {
        console.error(err);
        this.toastService.show('Eroare la adăugarea capitolului.', 'error');
      }
    });
  }

  editModule(mod: any) {
    if (!this.canModifyCourseContent()) return;
    this.router.navigate(['/teacher/module-edit'], { queryParams: { moduleId: mod.id } });
  }

  startEditing(mod: any) {
    if (!this.canModifyCourseContent()) return;
    mod.editing = true;
    mod.editTitle = mod.title ?? '';
  }

  cancelEditing(mod: any) {
    mod.editing = false;
  }

  saveModuleEdit(mod: any) {
  if (!this.canModifyCourseContent()) return;
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
    if (!this.canModifyCourseContent()) return;
    if (!confirm('Sigur ștergi capitolul?')) return;

    this.moduleService.deleteModule(mod.id).subscribe({
      next: () => {
        this.modules = this.modules.filter(m => m.id !== mod.id);
        this.toastService.show('Capitolul a fost șters cu succes!', 'success');
        this.cd.detectChanges();
        this.loadModules();
      },
      error: err => {
        console.error(err);
        this.toastService.show('Eroare la ștergerea capitolului.', 'error');
      }
    });
  }

  deleteAllModules() {
    if (!this.canModifyCourseContent()) return;
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
    if (!this.canModifyCourseContent()) return;
    mod.showAddLessonForm = true;
  }

  onFileSelectedQuick(event: any, mod: any) {
    if (event.target.files.length > 0) {
      this.selectedFilesQuick[mod.id] = event.target.files[0];
    }
  }

  addLesson(mod: any) {
    if (!this.canModifyCourseContent()) return;
    if (!mod.newLessonTitle) return;

    const maxOrderIndex = mod.lessons.length > 0 
      ? Math.max(...mod.lessons.map((l: LessonItem) => l.orderIndex!)) 
      : 0;

    const formData = new FormData();
    formData.append('moduleId', mod.id.toString());
    formData.append('title', mod.newLessonTitle);
    formData.append('content', ''); // Conținut gol pentru quick add
    formData.append('orderIndex', (maxOrderIndex + 1).toString());

    if (this.selectedFilesQuick[mod.id]) {
      formData.append('document', this.selectedFilesQuick[mod.id]);
    }

    this.lessonService.createLesson(formData).subscribe({
      next: (lesson) => {
        mod.lessons.push({
          id: lesson.Id,
          title: lesson.Title,
          content: lesson.Content,
          orderIndex: lesson.OrderIndex,
          DocumentUrl: lesson.DocumentUrl
        });
        mod.newLessonTitle = '';
        mod.showAddLessonForm = false;
        delete this.selectedFilesQuick[mod.id]; // Curățăm fișierul după upload
        this.toastService.show('Subcapitol adăugat!', 'success');
        this.cd.detectChanges();
      }
    });
  }
  editLesson(lesson: any) {
    if (!this.canModifyCourseContent()) return;
    this.router.navigate(['/teacher/lesson-edit', lesson.id]);
  }

  deleteLesson(lesson: any, mod: any) {
    if (!this.canModifyCourseContent()) return;
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

  this.lessonService.getLessonById(sub.id).subscribe({
    next: (lesson) => {
      this.selectedLesson.set(lesson);
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

  // ModuleForm.ts
  goToAddLesson(mod: any) {
    if (!this.canModifyCourseContent()) return;
    this.router.navigate(['/teacher/lesson-form'], {
      queryParams: {
        moduleId: mod.id,
        courseId: mod.courseId   // dacă ai CourseId
      }
    });
  }
  private updateLessonOrder(lesson: any) {
    const formData = new FormData();
    
    // Adăugăm câmpurile obligatorii
    formData.append('title', lesson.title);
    formData.append('content', lesson.content || '');
    formData.append('orderIndex', lesson.orderIndex.toString());
    
    // 🔥 SOLUȚIA: Trimitem calea actuală a documentului 
    // Dacă lecția are deja un document, îl trimitem înapoi pentru a nu fi șters în DB
    if (lesson.DocumentUrl) {
      formData.append('documentUrl', lesson.DocumentUrl);
    }
    
    return this.lessonService.updateLesson(lesson.id, formData);
  }

  moveLessonUp(lesson: LessonItem, mod: any) {
    if (!this.canModifyCourseContent()) return;
    mod.lessons.sort((a: any, b: any) => a.orderIndex - b.orderIndex);
    const index = mod.lessons.findIndex((l: any) => l.id === lesson.id);
    if (index <= 0) return;

    const prevLesson = mod.lessons[index - 1];
    [lesson.orderIndex, prevLesson.orderIndex] = [prevLesson.orderIndex, lesson.orderIndex];

    forkJoin([
      this.updateLessonOrder(lesson),
      this.updateLessonOrder(prevLesson)
    ]).subscribe({
      next: () => {
        mod.lessons.sort((a: any, b: any) => a.orderIndex - b.orderIndex);
        this.cd.detectChanges();
      }
    });
  }

  moveLessonDown(lesson: LessonItem, mod: any) {
    if (!this.canModifyCourseContent()) return;
    mod.lessons.sort((a: any, b: any) => a.orderIndex - b.orderIndex);
    const index = mod.lessons.findIndex((l: any) => l.id === lesson.id);
    if (index >= mod.lessons.length - 1) return;

    const nextLesson = mod.lessons[index + 1];
    [lesson.orderIndex, nextLesson.orderIndex] = [nextLesson.orderIndex, lesson.orderIndex];

    forkJoin([
      this.updateLessonOrder(lesson),
      this.updateLessonOrder(nextLesson)
    ]).subscribe({
      next: () => {
        mod.lessons.sort((a: any, b: any) => a.orderIndex - b.orderIndex);
        this.cd.detectChanges();
      }
    });
  }
}