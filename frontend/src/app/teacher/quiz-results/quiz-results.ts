import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Quiz } from '../../core/services/quiz';

@Component({
  selector: 'app-quiz-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quiz-results.html',
  styleUrl: './quiz-results.scss',
})
export class QuizResults implements OnInit {
  groupedResults = signal<any[]>([]);
  loading = signal(true);

  constructor(private quizService: Quiz) {}

  ngOnInit(): void {
    this.loadResults();
  }

  loadResults() {
    this.quizService.getTeacherAllResults().subscribe({
      next: (data) => {
        this.groupedResults.set(this.groupByQuiz(data));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  // Funcție pentru gruparea datelor
  private groupByQuiz(data: any[]) {
    const groups = data.reduce((acc, obj) => {
      const key = obj.quizTitle + obj.courseTitle; // Cheie unică per quiz
      if (!acc[key]) {
        acc[key] = {
          quizTitle: obj.quizTitle,
          courseTitle: obj.courseTitle,
          maxScore: obj.maxScore,
          students: [],
          isOpen: false // Controlăm dropdown-ul din frontend
        };
      }
      acc[key].students.push(obj);
      return acc;
    }, {});

    return Object.values(groups);
  }

  toggleQuiz(quiz: any) {
    quiz.isOpen = !quiz.isOpen;
  }
}
