import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuizQuestion } from '../../core/models/quiz.model';
import { ActivatedRoute, Router } from '@angular/router';
import { Quiz } from '../../core/services/quiz';
import { forkJoin, map } from 'rxjs';

@Component({
  selector: 'app-question-form',
  imports: [CommonModule,FormsModule],
  standalone: true,
  templateUrl: './question-form.html',
  styleUrl: './question-form.scss',
})
export class QuestionForm {
  quizId: number | null = null;
  questionId: number | null = null;
  question = signal<Partial<QuizQuestion>>({
    questionText: '',
    questionType: 'single',
    points: 1
  });
  loading = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizService: Quiz
  ) {}

  ngOnInit() {
    this.quizId = +this.route.snapshot.params['quizId'];
    this.questionId = this.route.snapshot.params['questionId'] ? +this.route.snapshot.params['questionId'] : null;

    if (this.questionId) {
      this.loadQuestion();
    }
  }

  loadQuestion() {
  if (!this.quizId || !this.questionId) return;

  this.loading.set(true);

  this.quizService.getQuestions(this.quizId).subscribe({
    next: qs => {
      const q = qs.find(q => q.id === this.questionId);
      if (q) {
        this.quizService.getOptions(q.id).subscribe({
          next: opts => this.question.set({ ...q, options: opts }),
          error: err => console.error(err),
          complete: () => this.loading.set(false)
        });
      } else {
        console.error('Întrebarea nu a fost găsită');
        this.loading.set(false);
      }
    },
    error: err => { console.error(err); this.loading.set(false); }
  });
}


  saveQuestion() {
    const q = this.question();
    if (!q.questionText) {
      alert('Textul întrebării este obligatoriu!');
      return;
    }

    if (this.questionId) {
      this.quizService.addQuestion(this.quizId!, q).subscribe({
        next: () => {
          alert('Întrebare actualizată!');
          this.router.navigate([`/teacher/quiz/${this.quizId}/manage`]);
        },
        error: err => console.error(err)
      });
    } else {
      this.quizService.addQuestion(this.quizId!, q).subscribe({
        next: () => {
          alert('Întrebare adăugată!');
          this.router.navigate([`/teacher/quiz/${this.quizId}/manage`]);
        },
        error: err => console.error(err)
      });
    }
  }
}
