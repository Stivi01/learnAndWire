import { Component, signal } from '@angular/core';
import { QuizData } from '../../core/models/quiz.model';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Quiz } from '../../core/services/quiz';
import { AuthService } from '../../core/services/auth';
import { Router } from '@angular/router';

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

  constructor(private quizService: Quiz, private auth: AuthService, private router: Router) {}

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
      error: err => console.error("Error loading quizzes:", err)
    });
  }

  createQuiz() {
    this.editingQuiz.set({ title: '', description: '', isPublished: false });
    this.showModal.set(true);
  }

  editQuiz(quiz: QuizData) {
    this.editingQuiz.set({ ...quiz });
    this.showModal.set(true);
  }

  saveQuiz() {
  const quiz = this.editingQuiz();
  if (!quiz || !quiz.title) {
    alert("Titlul quiz-ului este obligatoriu!");
    return;
  }

  const payload = {
    title: quiz.title,
    description: quiz.description || '',
    isPublished: quiz.isPublished,
    courseId: quiz.courseId // opțional, dacă ai selectat curs
  };

  if (quiz.id) {
    this.quizService.updateQuiz(quiz.id, payload).subscribe({
      next: () => {
        alert("Quiz actualizat!");
        this.showModal.set(false);
        this.reloadQuizzes();
      },
      error: err => console.error(err)
    });
  } else {
    this.quizService.createQuiz(payload).subscribe({
      next: () => {
        alert("Quiz creat!");
        this.showModal.set(false);
        this.reloadQuizzes();
      },
      error: err => console.error(err)
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
}
