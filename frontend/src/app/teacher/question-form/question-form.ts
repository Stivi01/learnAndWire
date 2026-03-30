import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuizQuestion } from '../../core/models/quiz.model';
import { ActivatedRoute, Router } from '@angular/router';
import { Quiz } from '../../core/services/quiz';
import { forkJoin, map } from 'rxjs';
import { ToastService } from '../../core/services/toast';

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
  isEdit = false;
  question = signal<Partial<QuizQuestion>>({
    questionText: '',
    questionType: 'single',
    points: 1
  });
  loading = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizService: Quiz,
    private toast:ToastService
  ) {}

  ngOnInit() {
  this.quizId = Number(this.route.snapshot.paramMap.get('quizId'));
  const qId = this.route.snapshot.paramMap.get('id');

  this.questionId = qId ? Number(qId) : null;
  this.isEdit = this.questionId !== null;

  this.quizService.getQuizFull(this.quizId).subscribe(res => {
    if (res.quiz.IsPublished) {
      this.toast.show('Quiz-ul este publicat și nu mai poate fi modificat.', 'info');
      this.router.navigate([`/teacher/quiz/${this.quizId}/manage`]);
      return;
    }

    if (this.isEdit) {
      this.loadQuestion();
    }
  });
}


loadQuestion() {
  if (this.quizId === null || this.questionId === null) return;

  this.loading.set(true);

  this.quizService.getQuestions(this.quizId).subscribe({
    next: qs => {
      const q = qs.find(q => q.id === this.questionId);
      if (!q) {
        console.error('Întrebarea nu există în quiz-ul acesta');
        this.loading.set(false);
        return;
      }

      console.log('Întrebarea încărcată:', q); // debug
      this.question.set({ ...q }); // <-- folosim spread pentru siguranță
      this.loading.set(false);
    },
    error: err => {
      console.error(err);
      this.loading.set(false);
    }
  });
}


  saveQuestion() {
  const q = this.question();

  if (!q.questionText || !q.questionText.trim()) {
    this.toast.show('Textul întrebării este obligatoriu!', 'error');
    return;
  }

  if (!q.points || q.points < 1) {
    this.toast.show('Întrebarea trebuie să aibă cel puțin 1 punct!', 'error');
    return;
  }

  if (this.isEdit) {
    this.quizService.updateQuestion(this.questionId!, q).subscribe({
      next: () => {
        this.toast.show('Întrebare actualizată!', 'success');
        this.router.navigate([`/teacher/quiz/${this.quizId}/manage`]);
      },
      error: () => this.toast.show('Eroare la actualizarea întrebării!', 'error')
    });
  } else {
    this.quizService.addQuestion(this.quizId!, q).subscribe({
      next: () => {
        this.toast.show('Întrebare adăugată!', 'success');
        this.router.navigate([`/teacher/quiz/${this.quizId}/manage`]);
      },
      error: () => this.toast.show('Eroare la adăugarea întrebării!', 'error')
    });
  }
}



}
