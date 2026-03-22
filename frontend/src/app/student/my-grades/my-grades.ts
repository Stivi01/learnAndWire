import { Component, signal } from '@angular/core';
import { Quiz } from '../../core/services/quiz';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-my-grades',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-grades.html',
  styleUrl: './my-grades.scss',
})
export class MyGrades {
  grades = signal<any[]>([]);
  loading = signal(true);

  constructor(private quizService: Quiz) {}

  ngOnInit() {
    this.quizService.getMyGrades().subscribe({
      next: (data) => {
        this.grades.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.loading.set(false);
      }
    });
  }
}
