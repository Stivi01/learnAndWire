import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { QuizOption, QuizQuestion } from '../../core/models/quiz.model';
import { ActivatedRoute, Router } from '@angular/router';
import { Quiz } from '../../core/services/quiz';
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

  loadQuiz() {
    this.loading.set(true);
    this.quizService.getQuizFull(this.quizId!).subscribe({
      next: data => {
        this.quiz.set(data.quiz);
        this.loading.set(false);
      },
      error: err => console.error(err)
    });
  }

  loadQuestions() {
    this.questions.set([]);

    this.quizService.getQuestions(this.quizId!).subscribe({
      next: qs => {
        qs.forEach(q => {
          this.quizService.getOptions(q.id).subscribe(opts => {
            this.questions.update(prev => [...prev, { ...q, options: opts }]);
          });
        });
      },
      error: err => console.error(err)
    });
  }

  goToAddQuestion() {
    if(this.quiz()?.IsPublished){
      this.toast.show('Quiz-ul este publicat si nu poti edita intrebarile!','info');
      return;
    }
    this.router.navigate([`/teacher/quiz/${this.quizId}/question/add`]);
  }

  goToEditQuestion(questionId: number) {
    if(this.quiz()?.IsPublished){
      this.toast.show('Quiz-ul este publicat si nu poti edita intrebarile!','info');
      return;
    }
    this.router.navigate([`/teacher/quiz/${this.quizId}/question/${questionId}`]);
  }

  goToOptions(questionId: number) {
    if(this.quiz()?.IsPublished){
      this.toast.show('Quiz-ul este publicat si nu poti edita intrebarile!','info');
      return;
    }
    this.router.navigate([`/teacher/questions/${questionId}/options`]);
  }

  publishQuiz() {
    this.quizService.publishQuiz(this.quizId!).subscribe({
      next: () => {
        alert("Quiz publicat!");
        this.quiz.update(q => ({ ...q, IsPublished: true }));
      },
      error: err => console.error(err)
    });
  }
}
