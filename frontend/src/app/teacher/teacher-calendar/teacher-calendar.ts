import { Component, computed, signal } from '@angular/core';
import { QuizData } from '../../core/models/quiz.model';
import { Quiz } from '../../core/services/quiz';
import { AuthService } from '../../core/services/auth';
import { CommonModule } from '@angular/common';
import { CourseSchedules } from '../../core/services/course-schedules';

@Component({
  selector: 'app-teacher-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './teacher-calendar.html',
  styleUrl: './teacher-calendar.scss',
})
export class TeacherCalendar {
  quizzes = signal<QuizData[]>([]);
  schedules = signal<any[]>([]);
  selectedDate = signal<Date>(new Date());
  currentMonth = signal<Date>(new Date());
  rawSchedules: any[] = [];

  // Zilele lunii curente pentru grid
  calendarDays = computed(() => {
    const date = this.currentMonth();
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const days = [];
    let startDay = start.getDay(); // 0=Dum
  startDay = startDay === 0 ? 6 : startDay - 1; // transformăm în Luni=0

  for (let i = 0; i < startDay; i++) days.push(null);

  for (let d = 1; d <= end.getDate(); d++) {
    days.push(new Date(date.getFullYear(), date.getMonth(), d));
  }
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

  schedulesForSelectedDate = computed(() => {
    const sel = this.selectedDate();
    return this.schedules().filter(s => {
      if (!s.Date) return false;
      const d = new Date(s.Date);
      return d.toDateString() === sel.toDateString();
    });
  });

  constructor(private quizService: Quiz, private courseScheduleService: CourseSchedules, private auth: AuthService) {}

  ngOnInit() {
    const user = this.auth.currentUserValue;

    if (!user) {
      console.error('No logged user');
      return;
    }

    this.quizService.getQuizzesByTeacher(user.id).subscribe(data => {
      this.quizzes.set(data);
    });

    this.courseScheduleService.getCoursesWithSchedules().subscribe(data => {
      this.rawSchedules = data;
      this.loadSchedules(data);
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

  hasSchedule(day: Date | null): boolean {
    if (!day) return false;
    return this.schedules().some(s => {
      // s.Date este deja Date
      return (s.Date as Date).toDateString() === day.toDateString();
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

    // 🔥 REGENERĂ cursurile pentru noua lună
    this.loadSchedules(this.rawSchedules);
  }

  private getDatesForDayInMonth(dayOfWeek: number, month: number, year: number): Date[] {
    const dates: Date[] = [];
    const lastDay = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(year, month, d);
      date.setHours(12,0,0,0); // fix timezone
      const jsDay = date.getDay(); // 0=Duminică ... 6=Sâmbătă
      const mappedDay = jsDay === 0 ? 7 : jsDay; // 1=Luni ... 7=Duminică
      if (mappedDay === dayOfWeek) dates.push(date);
    }

    return dates;
  }

  private parseTimeToDate(timeISO: string, day: Date): Date {
    const t = new Date(timeISO);
    const d = new Date(day); // ziua cursului
    d.setHours(t.getUTCHours(), t.getUTCMinutes(), t.getUTCSeconds(), 0);
    return d;
  }

  private loadSchedules(data: any[]) {
    const month = this.currentMonth().getMonth();
    const year = this.currentMonth().getFullYear();

    const schedulesWithDates = data.flatMap((s: any) => {
      if (!s.IsActive) return [];
      const dates = this.getDatesForDayInMonth(s.DayOfWeek, month, year);

      return dates.map(date => ({
        ...s,
        Date: date,
        StartTimeLocal: this.parseTimeToDate(s.StartTime, date),
        EndTimeLocal: this.parseTimeToDate(s.EndTime, date),
      }));
    });

    this.schedules.set(schedulesWithDates);
  }
}

