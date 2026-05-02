import { Component, signal } from '@angular/core';
import { QuizData } from '../../core/models/quiz.model';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Quiz } from '../../core/services/quiz';
import { AuthService } from '../../core/services/auth';
import { Router } from '@angular/router';
import { ToastService } from '../../core/services/toast';
import { parseLocalDateTime } from '../../shared/utils/date-utils';
import { toDateTimeLocalString } from '../../shared/utils/date-utils';

@Component({
  selector: 'app-quiz-list-teacher',
  imports: [CommonModule,FormsModule,ReactiveFormsModule],
  standalone: true,
  templateUrl: './quiz-list-teacher.html',
  styleUrl: './quiz-list-teacher.scss',
})
export class QuizListTeacher {

  quizzes = signal<QuizData[]>([]);
  editingQuiz = signal<Partial<QuizData> | null>(null); // quizul curent din modal
  showModal = signal(false);

  constructor(
    private quizService: Quiz,
    private auth: AuthService,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const user = this.auth.getUser();
    if (!user) {
      console.error('Nu s-a putut obține profesorul logat');
      return;
    }
    this.loadQuizzes(user.id);
  }

  loadQuizzes(teacherId: number) {
    this.quizService.getQuizzesByTeacher(teacherId).subscribe({
      next: quizzes => this.quizzes.set(quizzes),
      error: err => {
        console.error('Error loading quizzes:', err);
        this.toast.show('Nu s-au putut încărca quiz-urile.', 'error');
      }
    });
  }

  goToCreateQuiz() {
    this.router.navigate(['/teacher/quiz-form']);
  }

  editQuiz(quiz: QuizData) {
  if (quiz.isPublished) {
    this.toast.show('Quiz-ul este publicat și nu mai poate fi editat.', 'info');
    return;
  }

  let scheduledAt: string | null = null;
  if (quiz.scheduledAt) {
    scheduledAt = toDateTimeLocalString(quiz.scheduledAt);
  }

  let closedAt: string | null = null;
  if (quiz.closedAt) {
    closedAt = toDateTimeLocalString(quiz.closedAt);
  }

  this.editingQuiz.set({ ...quiz, scheduledAt, closedAt });
  this.showModal.set(true);
}

  saveQuiz() {
  const quiz = this.editingQuiz();
  if (!quiz || !quiz.title?.trim()) {
    this.toast.show('Titlul quiz-ului este obligatoriu!', 'error');
    return;
  }

  const payload = {
    title: quiz.title.trim(),
    description: quiz.description?.trim() || '',
    isPublished: quiz.isPublished,
    courseId: quiz.courseId,
    scheduledAt: quiz.scheduledAt || null,
    closedAt: quiz.closedAt || null
  };

  if (quiz.id) {
    this.quizService.updateQuiz(quiz.id, payload).subscribe({
      next: () => {
        this.toast.show('Quiz actualizat!', 'success');
        this.showModal.set(false);
        this.reloadQuizzes();
      },
      error: err => {
        console.error(err);
        const details = Array.isArray(err?.error?.missingItems) ? ` ${err.error.missingItems.join(' ')}` : '';
        this.toast.show((err?.error?.message || 'Eroare la actualizarea quiz-ului.') + details, 'error');
      }
    });
  } else {
    this.quizService.createQuiz(payload).subscribe({
      next: () => {
        this.toast.show('Quiz creat!', 'success');
        this.showModal.set(false);
        this.reloadQuizzes();
      },
      error: err => {
        console.error(err);
        this.toast.show(err?.error?.message || 'Eroare la crearea quiz-ului.', 'error');
      }
    });
  }
}


  reloadQuizzes() {
    const user = this.auth.getUser();
    if (user) this.loadQuizzes(user.id);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingQuiz.set(null);
  }

  goToQuizManager(quizId: number) {
    this.router.navigate([`/teacher/quiz/${quizId}/manage`]);
  }

  calculateDuration(quiz: QuizData): string {
    if (!quiz.scheduledAt || !quiz.closedAt) {
      return '';
    }

    const start = parseLocalDateTime(quiz.scheduledAt) || new Date(quiz.scheduledAt);
    const end = parseLocalDateTime(quiz.closedAt) || new Date(quiz.closedAt);
    const diffMs = end.getTime() - start.getTime();

    if (diffMs <= 0) {
      return '';
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let duration = '';
    if (diffDays > 0) {
      duration += `${diffDays} zi${diffDays > 1 ? 'le' : ''}`;
    }
    if (diffHours > 0) {
      if (duration) duration += ', ';
      duration += `${diffHours} or${diffHours > 1 ? 'e' : 'ă'}`;
    }
    if (diffMinutes > 0 && diffDays === 0) {
      if (duration) duration += ', ';
      duration += `${diffMinutes} minut${diffMinutes > 1 ? 'e' : ''}`;
    }

    return duration ? `Durată: ${duration}` : '';
  }
}
