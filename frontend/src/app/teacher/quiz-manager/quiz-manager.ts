import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { QuizOption, QuizQuestion } from '../../core/models/quiz.model';
import { ActivatedRoute, Router } from '@angular/router';
import { Quiz, QuizPublishReadinessResponse } from '../../core/services/quiz';
import { ToastService } from '../../core/services/toast';

@Component({
  selector: 'app-quiz-manager',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './quiz-manager.html',
  styleUrl: './quiz-manager.scss',
})
export class QuizManager {
  quizId: number | null = null;
  quiz = signal<any>(null);
  questions = signal<(QuizQuestion & { options?: QuizOption[] })[]>([]);
  publishReadiness = signal<QuizPublishReadinessResponse | null>(null);
  loading = signal(true);

  constructor(
    private route: ActivatedRoute,
    private quizService: Quiz,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.quizId = +this.route.snapshot.params['id'];
    this.loadQuiz();
    this.loadQuestions();
  }

  get canPublish(): boolean {
    return !!this.publishReadiness()?.canPublish;
  }

  get publishChecklist() {
    const checks = this.publishReadiness()?.checks;
    return [
      { label: 'Titlul quiz-ului este completat', done: !!checks?.hasTitle },
      { label: 'Descrierea quiz-ului este completată', done: !!checks?.hasDescription },
      { label: 'Cursul asociat este publicat', done: !!checks?.coursePublished },
      { label: 'Data de susținere este setată', done: !!checks?.hasScheduledAt },
      { label: 'Data de susținere este în viitor', done: !!checks?.hasFutureSchedule },
      { label: 'Data limită este validă (dacă este setată)', done: !!checks?.hasValidClosedAt },
      { label: 'Există cel puțin o întrebare', done: !!checks?.hasQuestion },
      { label: 'Fiecare întrebare are minimum 2 opțiuni', done: !!checks?.everyQuestionHasEnoughOptions },
      { label: 'Fiecare întrebare are răspunsuri corecte valide', done: !!checks?.everyQuestionHasValidAnswers },
    ];
  }

  get missingPublishItems(): string[] {
    return this.publishReadiness()?.missingItems || [];
  }

  loadQuiz() {
    this.loading.set(true);
    this.quizService.getQuizFull(this.quizId!).subscribe({
      next: data => {
        this.quiz.set(data.quiz);
        this.loading.set(false);
        this.refreshPublishReadiness();
      },
      error: err => {
        console.error(err);
        this.loading.set(false);
      }
    });
  }

  refreshPublishReadiness() {
    this.quizService.getPublishReadiness(this.quizId!).subscribe({
      next: readiness => this.publishReadiness.set(readiness),
      error: err => console.error('Eroare la verificarea publicării quiz-ului:', err)
    });
  }

  loadQuestions() {
    this.questions.set([]);

    this.quizService.getQuestions(this.quizId!).subscribe({
      next: qs => {
        if (!qs.length) {
          this.refreshPublishReadiness();
          return;
        }

        qs.forEach(q => {
          this.quizService.getOptions(q.id).subscribe(opts => {
            this.questions.update(prev => [...prev, { ...q, options: opts }]);
          });
        });

        this.refreshPublishReadiness();
      },
      error: err => console.error(err)
    });
  }

  goToAddQuestion() {
    if (this.quiz()?.IsPublished) {
      this.toast.show('Quiz-ul este publicat și nu poți edita întrebările!', 'info');
      return;
    }
    this.router.navigate([`/teacher/quiz/${this.quizId}/question/add`]);
  }

  goToEditQuestion(questionId: number) {
    if (this.quiz()?.IsPublished) {
      this.toast.show('Quiz-ul este publicat și nu poți edita întrebările!', 'info');
      return;
    }
    this.router.navigate([`/teacher/quiz/${this.quizId}/question/${questionId}`]);
  }

  goToOptions(questionId: number) {
    if (this.quiz()?.IsPublished) {
      this.toast.show('Quiz-ul este publicat și nu poți edita întrebările!', 'info');
      return;
    }
    this.router.navigate([`/teacher/questions/${questionId}/options`]);
  }

  publishQuiz() {
    if (!this.canPublish) {
      this.toast.show(`Quiz-ul nu poate fi publicat încă. ${this.missingPublishItems.join(' ')}`, 'error');
      return;
    }

    this.quizService.publishQuiz(this.quizId!, true).subscribe({
      next: () => {
        this.toast.show('Quiz publicat!', 'success');
        this.quiz.update(q => ({ ...q, IsPublished: true }));
        this.refreshPublishReadiness();
      },
      error: err => {
        console.error(err);
        const missingItems = Array.isArray(err?.error?.missingItems)
          ? ` ${err.error.missingItems.join(' ')}`
          : '';
        this.toast.show((err?.error?.message || 'Eroare la publicarea quiz-ului.') + missingItems, 'error');
      }
    });
  }

  get totalPoints(): number {
    return this.questions().reduce((sum, q) => sum + (q.points || 0), 0);
  }
}

