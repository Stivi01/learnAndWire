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
    private quizService: Quiz
  ) {}

  ngOnInit() {
  this.quizId = Number(this.route.snapshot.paramMap.get('quizId'));
  const qId = this.route.snapshot.paramMap.get('id');

  this.questionId = qId ? Number(qId) : null;
  this.isEdit = this.questionId !== null;

  this.quizService.getQuizFull(this.quizId).subscribe(res => {
    if (res.quiz.IsPublished) {
      alert('Quiz-ul este publicat și nu mai poate fi modificat');
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

  if (!q.questionText) {
    alert('Textul întrebării este obligatoriu!');
    return;
  }

  if (this.questionId !== null) {
    // UPDATE
    this.quizService.updateQuestion(this.questionId, q).subscribe({
      next: () => {
        alert('Întrebare actualizată!');
        this.router.navigate([`/teacher/quiz/${this.quizId}/manage`]);
      }
    });
  } else {
    // ADD
    this.quizService.addQuestion(this.quizId!, q).subscribe({
      next: () => {
        alert('Întrebare adăugată!');
        this.router.navigate([`/teacher/quiz/${this.quizId}/manage`]);
      }
    });
  }
}


}
