import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuizOption } from '../../core/models/quiz.model';
import { ActivatedRoute, Router } from '@angular/router';
import { Quiz } from '../../core/services/quiz';

@Component({
  selector: 'app-option-form',
  imports: [CommonModule,FormsModule],
  standalone: true,
  templateUrl: './option-form.html',
  styleUrl: './option-form.scss',
})
export class OptionForm {
  questionId: number | null = null;
  optionId: number | null = null;
  option = signal<Partial<QuizOption>>({ optionText: '', isCorrect: false });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizService: Quiz
  ) {}

  ngOnInit() {
    this.questionId = +this.route.snapshot.params['questionId'];
    this.optionId = this.route.snapshot.params['optionId'] ? +this.route.snapshot.params['optionId'] : null;

    if (this.optionId) this.loadOption();
  }

  loadOption() {
    this.quizService.getOptions(this.questionId!).subscribe({
      next: opts => {
        const opt = opts.find(o => o.id === this.optionId);
        if (opt) this.option.set(opt);
      },
      error: err => console.error(err)
    });
  }

  saveOption() {
    const o = this.option();
    if (!o.optionText) {
      alert('Textul opțiunii este obligatoriu!');
      return;
    }

    this.quizService.addOption(this.questionId!, o).subscribe({
      next: () => {
        alert(this.optionId ? 'Opțiune actualizată!' : 'Opțiune adăugată!');
        this.router.navigate([`/teacher/questions/${this.questionId}/options`]);
      },
      error: err => console.error(err)
    });
  }
}
