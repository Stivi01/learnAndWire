import { Component, computed, signal } from '@angular/core';
import { QuizData } from '../../core/models/quiz.model';
import { Quiz } from '../../core/services/quiz';
import { AuthService } from '../../core/services/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-teacher-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './teacher-calendar.html',
  styleUrl: './teacher-calendar.scss',
})
export class TeacherCalendar {
  quizzes = signal<QuizData[]>([]);
  selectedDate = signal<Date>(new Date());
  currentMonth = signal<Date>(new Date());

  // Zilele lunii curente pentru grid
  calendarDays = computed(() => {
    const date = this.currentMonth();
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const days = [];
    // Padding pentru începutul săptămânii
    for (let i = 0; i < start.getDay(); i++) days.push(null);
    // Zilele propriu-zise
    for (let d = 1; d <= end.getDate(); d++) days.push(new Date(date.getFullYear(), date.getMonth(), d));
    
    return days;
  });

  // Quiz-urile pentru ziua selectată
  quizzesForSelectedDate = computed(() => {
    const sel = this.selectedDate();
    return this.quizzes().filter(q => {
      if (!q.scheduledAt) return false;
      const d = new Date(q.scheduledAt);
      return d.getDate() === sel.getDate() && 
             d.getMonth() === sel.getMonth() && 
             d.getFullYear() === sel.getFullYear();
    });
  });

  constructor(private quizService: Quiz) {}

  ngOnInit() {
    // Înlocuiește cu ID-ul real al profesorului din AuthService
    this.quizService.getQuizzesByTeacher(1).subscribe(data => {
      this.quizzes.set(data);
    });
  }

  selectDate(day: Date | null) {
    if (day) this.selectedDate.set(day);
  }

  hasQuiz(day: Date | null): boolean {
    if (!day) return false;
    return this.quizzes().some(q => {
      const d = new Date(q.scheduledAt!);
      return d.toDateString() === day.toDateString();
    });
  }

  isToday(day: Date | null): boolean {
    return day?.toDateString() === new Date().toDateString();
  }

  isSelected(day: Date | null): boolean {
    return day?.toDateString() === this.selectedDate().toDateString();
  }

  changeMonth(offset: number) {
    const current = this.currentMonth();
    this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }
}

