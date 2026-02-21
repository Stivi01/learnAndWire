import { CommonModule } from '@angular/common';
import { Component, Input, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuizOption } from '../../core/models/quiz.model';
import { ActivatedRoute, Router } from '@angular/router';
import { Quiz } from '../../core/services/quiz';
import { firstValueFrom, map } from 'rxjs';
import { ToastService } from '../../core/services/toast';

@Component({
  selector: 'app-option-form',
  imports: [CommonModule,FormsModule],
  standalone: true,
  templateUrl: './option-form.html',
  styleUrl: './option-form.scss',
})
export class OptionForm {
  @Input() questionType: 'single' | 'multiple' | 'open' = 'single';
  public questionId: number | null = null;

  public options: WritableSignal<Partial<QuizOption>[]> = signal([]);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizService: Quiz,
    private toast: ToastService
  ) {}

  ngOnInit() {
  this.questionId = +this.route.snapshot.params['questionId'];
  if (!this.questionId) return;

  this.quizService.getQuestionById(this.questionId).subscribe({
    next: q => {
      this.questionType = q.questionType;
      console.log('✅ Question type:', this.questionType);
    },
    error: err => {
      console.error(err);
      this.toast.show('Nu s-a putut încărca tipul întrebării', 'error');
    }
  });

  this.loadOptions();
}





  public loadOptions() {
    if (!this.questionId) return;

    this.quizService.getOptions(this.questionId).subscribe({
      next: (opts: Partial<QuizOption>[]) => {
        if (opts.length) {
          this.options.set(opts);
        } else {
          // dacă nu sunt opțiuni → 2 rânduri goale
          this.options.set([
            { optionText: '', isCorrect: false },
            { optionText: '', isCorrect: false },
          ]);
        }
      },
      error: err => console.error(err),
    });
  }

  public addOptionRow() {
    this.options.update(arr => [...arr, { optionText: '', isCorrect: false }]);
  }

  public removeOptionRow(index: number) {
    this.options.update(arr => arr.filter((_, i) => i !== index));
  }

   public async saveOptions() {
  if (!this.questionId) return;

  const validOptions = this.options().filter(o => o.optionText?.trim() !== '');
  if (!validOptions.length) {
    this.toast.show('Trebuie să completați cel puțin o opțiune!', 'error');
    return;
  }

  if (this.questionType === 'single') {
    const hasCorrect = validOptions.some(o => o.isCorrect);
    if (!hasCorrect) {
      this.toast.show('Trebuie să marchezi cel puțin o opțiune ca fiind corectă!', 'error');
      return;
    }
  }

  if (this.questionType === 'multiple') {
    const correctCount = validOptions.filter(o => o.isCorrect).length;
    if (correctCount < 2) {
      this.toast.show('Trebuie să marchezi cel puțin 2 opțiuni ca fiind corecte!', 'error');
      return;
    }
  }

  try {
    await Promise.all(validOptions.map(o => {
      const payload = { optionText: o.optionText!, isCorrect: o.isCorrect ? 1 : 0 };
      if (o.id) return firstValueFrom(this.quizService.updateOption(o.id, payload));
      else return firstValueFrom(this.quizService.addOption(this.questionId!, payload));
    }));

    this.toast.show('Opțiunile au fost salvate!', 'success');
    this.loadOptions();
  } catch (err) {
    console.error(err);
    this.toast.show('Eroare la salvarea opțiunilor!', 'error');
  }
}

}
