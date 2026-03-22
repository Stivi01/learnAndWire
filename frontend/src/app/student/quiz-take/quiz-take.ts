import { Component, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Quiz } from '../../core/services/quiz';
import { ToastService } from '../../core/services/toast';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-quiz-take',
  imports: [CommonModule,RouterModule,FormsModule],
  standalone: true,
  templateUrl: './quiz-take.html',
  styleUrl: './quiz-take.scss',
})
export class QuizTake {
  quiz = signal<any>(null);
  questions = signal<any[]>([]);
  loading = signal(true);
  error = signal('');
  submitting = signal(false);

  // Aici stocăm răspunsurile. Cheia este questionId, valoarea este optionId (pentru Single Choice) sau un array de optionId (pentru Multiple)
  answers = signal<{ [questionId: number]: any }>({});

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizService: Quiz,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    const quizId = Number(this.route.snapshot.paramMap.get('id'));
    if (quizId) {
      this.loadQuiz(quizId);
    } else {
      this.error.set('ID-ul quiz-ului este invalid.');
      this.loading.set(false);
    }
  }

  loadQuiz(id: number) {
    this.quizService.getStudentQuizToTake(id).subscribe({
      next: (data) => {
        this.quiz.set(data.quiz);
        this.questions.set(data.questions);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set(err.error?.message || 'Eroare la încărcarea testului.');
        this.loading.set(false);
      }
    });
  }

  // Metodă unificată: orice click adaugă sau scoate opțiunea din array
  onOptionSelect(questionId: number, optionId: number) {
    const currentAnswers = { ...this.answers() };
    
    // Luăm lista de opțiuni bifate la această întrebare (sau un array gol dacă nu e niciuna)
    let selectedOptions = currentAnswers[questionId] || [];
    
    if (selectedOptions.includes(optionId)) {
      // Dacă opțiunea era deja bifată, o eliminăm (debifare)
      selectedOptions = selectedOptions.filter((id: number) => id !== optionId);
    } else {
      // Dacă nu era bifată, o adăugăm în listă
      selectedOptions.push(optionId);
    }

    currentAnswers[questionId] = selectedOptions;
    this.answers.set(currentAnswers);
  }

  // Metodă simplificată pentru a verifica dacă o opțiune e bifată
  isOptionSelected(questionId: number, optionId: number): boolean {
    const answer = this.answers()[questionId];
    
    if (!answer) return false;

    // Deoarece acum toate răspunsurile noastre sunt salvate ca Array-uri
    if (Array.isArray(answer)) {
      return answer.includes(optionId);
    }
    
    // Fallback de siguranță în caz că a rămas un număr agățat prin memorie
    return answer === optionId;
  }

  submitQuiz() {
    this.submitting.set(true);
    
    // Obiectul tău frumos formatat { 1: [2], 2: [6] }
    const payload = this.answers(); 
    
    // Preluăm ID-ul testului
    const currentQuizId = this.quiz().Id;

    this.quizService.submitQuiz(currentQuizId, payload).subscribe({
      next: (res: any) => {
        // Oprim loading-ul
        this.submitting.set(false);
        
        // Afișăm nota într-un toast verde de succes
        this.toastService.show(
          `Felicitări! Ai obținut ${res.score} din ${res.maxScore} puncte.`, 
          'success'
        );
        
        // După 2 secunde, îl întoarcem pe student la lista de teste
        setTimeout(() => {
          this.router.navigate(['/student/quizzes']);
        }, 2000);
      },
      error: (err) => {
        console.error("Eroare la submit:", err);
        this.toastService.show(
          err.error?.message || 'A apărut o eroare la salvarea testului.', 
          'error'
        );
        this.submitting.set(false);
      }
    });
  }
}
