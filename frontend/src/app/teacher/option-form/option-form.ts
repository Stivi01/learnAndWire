import { CommonModule } from '@angular/common';
import { Component, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuizOption } from '../../core/models/quiz.model';
import { ActivatedRoute, Router } from '@angular/router';
import { Quiz } from '../../core/services/quiz';
import { firstValueFrom, map } from 'rxjs';

@Component({
  selector: 'app-option-form',
  imports: [CommonModule,FormsModule],
  standalone: true,
  templateUrl: './option-form.html',
  styleUrl: './option-form.scss',
})
export class OptionForm {
  public questionId: number | null = null;

  public options: WritableSignal<Partial<QuizOption>[]> = signal([]);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizService: Quiz
  ) {}

  ngOnInit() {
    this.questionId = +this.route.snapshot.params['questionId'];
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
  console.log('💡 Valid options to save:', validOptions);

  if (!validOptions.length) {
    alert('Trebuie să completați cel puțin o opțiune!');
    return;
  }

  try {
    await Promise.all(validOptions.map(o => {
      const payload = {
        optionText: o.optionText!,
        isCorrect: o.isCorrect ? 1 : 0
      };
      console.log('➡️ Sending payload for option', o.id, payload);

      if (o.id) {
        console.log('🔹 Update option with id:', o.id);
        return firstValueFrom(this.quizService.updateOption(o.id, payload).pipe(
          map(res => console.log('✅ Update response:', res))
        ));
      } else {
        console.log('🔹 Add new option for questionId:', this.questionId);
        return firstValueFrom(this.quizService.addOption(this.questionId!, payload).pipe(
          map(res => console.log('✅ Add response:', res))
        ));
      }
    }));

    alert('Opțiunile au fost salvate!');
    this.loadOptions(); // reîncărcăm cu id-urile generate

  } catch (err) {
    console.error('❌ Error saving options:', err);
    alert('Eroare la salvarea opțiunilor.');
  }
}




}
