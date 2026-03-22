import { Component, signal } from '@angular/core';
import { Quiz } from '../../core/services/quiz';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ToastService } from '../../core/services/toast';

@Component({
  selector: 'app-quiz-list-student',
  imports: [CommonModule,RouterModule],
  standalone: true,
  templateUrl: './quiz-list-student.html',
  styleUrl: './quiz-list-student.scss',
})
export class QuizListStudent {
  quizzes = signal<any[]>([]);
  loading = signal(true);
  error = signal('');

  constructor(
    private quizService: Quiz,
    private router: Router,             // <-- Injectăm Router
    private toastService: ToastService  // <-- Injectăm ToastService
  ) {}

  ngOnInit() {
    this.loadQuizzes();
  }

  loadQuizzes() {
    this.loading.set(true);
    this.quizService.getStudentAvailableQuizzes().subscribe({
      next: (data) => {
        this.quizzes.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Eroare la preluarea quiz-urilor:', err);
        this.error.set('Nu am putut încărca lista de teste.');
        this.loading.set(false);
      }
    });
  }

  // --- METODA NOUĂ PENTRU VALIDARE START QUIZ ---
  startQuiz(quiz: any) {
    if (quiz.scheduledAt) {
      const now = new Date();
      const scheduledDate = new Date(quiz.scheduledAt);

      // Dacă data curentă este mai mică (mai devreme) decât data programată
      if (now < scheduledDate) {
        const formattedDate = scheduledDate.toLocaleString('ro-RO'); // Formatăm data frumos
        
        // Aici adaptezi în funcție de cum ai metoda în ToastService
        // Presupun că ai o metodă show() sau showError()
        this.toastService.show(`Testul nu a început încă! Este programat pentru ${formattedDate}.`, 'error');
        return; // Oprim execuția, nu îl lăsăm să intre
      }
    }

    // Dacă a trecut de validare (sau dacă testul nu are dată - opțional), navigăm către el
    this.router.navigate(['/student/quiz/take', quiz.id]);
  }
}
