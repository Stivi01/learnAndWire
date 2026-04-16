import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuizData } from '../../core/models/quiz.model';
import { Quiz } from '../../core/services/quiz';
import { ActivatedRoute, Router } from '@angular/router';
import { Course, CourseItem } from '../../core/services/course';
import { ToastService } from '../../core/services/toast';

@Component({
  selector: 'app-quiz-form',
  imports: [CommonModule,FormsModule],
  standalone: true,
  templateUrl: './quiz-form.html',
  styleUrl: './quiz-form.scss',
})
export class QuizForm {
  quizId: number | null = null;
  quiz = signal<Partial<QuizData>>({
    title: '',
    description: '',
    isPublished: false,
    scheduledAt: null,
    closedAt: null
  });

  courses = signal<CourseItem[]>([]);
  selectedCourse: CourseItem | null = null;
  loadingCourses = signal(false);

  constructor(
    private quizService: Quiz,
    private route: ActivatedRoute,
    private router: Router,
    private courseService: Course,
    private toast: ToastService
  ) {}

  ngOnInit() {
    // Dacă există quizId în URL → edit
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.quizId = +params['id'];
        this.loadQuiz(this.quizId);
      }
    });
    this.loadCourses();
  }

  loadCourses() {
  this.loadingCourses.set(true);
  this.courseService.getMyCourses().subscribe({
    next: (data: any[]) => {
      // Mapăm datele la CourseItem
      const mapped: CourseItem[] = data.map(c => ({
        Id: c.Id ?? c.id ?? 0,
        Title: c.Title ?? c.title ?? '',
        Description: c.Description ?? c.description ?? '',
        CreatedAt: c.CreatedAt ?? c.createdAt ?? '',
        IsPublished: c.IsPublished ?? c.isPublished ?? false,
        modules: c.modules ?? []
      }));
      this.courses.set(mapped);

      if (mapped.length > 0) this.selectedCourse = mapped[0];
      this.loadingCourses.set(false);
    },
    error: (err) => {
      console.error('❌ Error loading courses for quiz:', err);
      this.toast.show('Nu s-au putut încărca cursurile profesorului.', 'error');
      this.loadingCourses.set(false);
    }
  });
}




  loadQuiz(id: number) {
  this.quizService.getQuizFull(id).subscribe({
    next: data => {

      let scheduled = data.quiz.ScheduledAt;
      let closed = data.quiz.ClosedAt;

      // 🔥 Conversie pentru datetime-local
      if (scheduled) {
        scheduled = scheduled.substring(0, 16);
      }
      if (closed) {
        closed = closed.substring(0, 16);
      }

      this.quiz.set({
        title: data.quiz.Title,
        description: data.quiz.Description,
        isPublished: data.quiz.IsPublished,
        courseId: data.quiz.CourseId,
        scheduledAt: scheduled,
        closedAt: closed
      });

      const match = this.courses().find(c => c.Id === data.quiz.CourseId);
      if (match) this.selectedCourse = match;
    },
    error: err => console.error("Eroare la încărcarea quiz-ului:", err)
  });
}

  saveQuiz() {
  const quizData = this.quiz();
  if (!quizData.title?.trim()) {
    this.toast.show('Titlul quiz-ului este obligatoriu!', 'error');
    return;
  }
  if (!quizData.courseId) {
    this.toast.show('Selectează un curs!', 'error');
    return;
  }

  if (quizData.scheduledAt) {
    const now = new Date();
    const scheduled = new Date(quizData.scheduledAt);

    if (scheduled <= now) {
      this.toast.show('Data trebuie să fie în viitor.', 'error');
      return;
    }
  }

  const payload = {
    title: quizData.title.trim(),
    description: quizData.description?.trim() || '',
    courseId: quizData.courseId,
    isPublished: this.quizId ? !!quizData.isPublished : false,
    scheduledAt: quizData.scheduledAt || null,
    closedAt: quizData.closedAt || null
  };

  if (this.quizId) {
    this.quizService.updateQuiz(this.quizId, payload).subscribe({
      next: () => {
        this.toast.show('Quiz actualizat!', 'success');
        this.router.navigate(['/teacher/quizzes']);
      },
      error: err => {
        console.error(err);
        const details = Array.isArray(err?.error?.missingItems) ? ` ${err.error.missingItems.join(' ')}` : '';
        this.toast.show((err?.error?.message || 'Eroare la actualizarea quiz-ului.') + details, 'error');
      }
    });
  } else {
    this.quizService.createQuiz(payload).subscribe({
      next: (res) => {
        this.toast.show('Quiz creat ca draft! Acum poți adăuga întrebări și apoi îl publici din administrare.', 'success');
        this.router.navigate([`/teacher/quiz/${res.id}/manage`]);
      },
      error: err => {
        console.error("Eroare la crearea quiz-ului:", err);
        this.toast.show(err?.error?.message || 'Eroare la crearea quiz-ului.', 'error');
      }
    });
  }
}



  updateTitle(value: string) {
    this.quiz.update(q => ({ ...q, title: value }));
  }

  updateDescription(value: string) {
    this.quiz.update(q => ({ ...q, description: value }));
  }

  updateIsPublished(value: boolean) {
    this.quiz.update(q => ({ ...q, isPublished: value }));
  }

  updateCourse(value: number) {
    this.quiz.update(q => ({ ...q, courseId: value }));
  }

  updateScheduledAt(value: string) {
    this.quiz.update(q => ({ ...q, scheduledAt: value }));
  }

  updateClosedAt(value: string) {
    this.quiz.update(q => ({ ...q, closedAt: value }));
  }

}
