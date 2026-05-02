import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { AuthService } from '../../core/services/auth';
import { User } from '../../core/services/user';
import { Teacher } from '../../core/models/teacher.model';
import { Quiz } from '../../core/services/quiz';
import { CourseSchedules } from '../../core/services/course-schedules';
import { Subject, catchError, of, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { parseLocalDateTime } from '../../shared/utils/date-utils';
import { Homework } from '../../core/services/homework';

interface Lesson {
  day: number;
  title: string;
  time: string;
}

// Funcție ajutătoare pentru a genera stilul conic-gradient pentru gauge-uri
function getGaugeStyle(percentage: number, color: string): string {
  const rotation = percentage * 3.6; // 360 degrees / 100
  return `conic-gradient(${color} 0% ${percentage}%, #d1d5db ${percentage}% 100%)`;
}

@Component({
  selector: 'app-student-dashboard',
  imports: [CommonModule],
  templateUrl: './student-dashboard.html',
  styleUrl: './student-dashboard.scss',
})
export class StudentDashboard implements OnDestroy {
  private auth = inject(AuthService);
  private userService = inject(User);
  private quizService = inject(Quiz);
  private homeworkService = inject(Homework);
  private courseScheduleService = inject(CourseSchedules);
  private router = inject(Router);

  private destroy$ = new Subject<void>();

  // USER
  userName = signal('');

  // TEACHERS
  teachers = signal<Teacher[]>([]);
  displayLimit = 4;
  selectedTeacher = signal<Teacher | null>(null);
  isModalOpen = signal(false);
  isAllTeachersModalOpen = signal(false);

  visibleTeachers = computed(() => this.teachers().slice(0, this.displayLimit));
  hasMoreTeachers = computed(() => this.teachers().length > this.displayLimit);

  // GAUGES
  attendance = signal(60);
  homework = signal(90);
  rating = signal(75);

  // EVENTS
  upcomingQuizzes = signal<any[]>([]);
  upcomingSchedules = signal<any[]>([]);
  upcomingHomeworks = signal<any[]>([]);

  quizEvents = computed(() =>
    this.upcomingQuizzes().map(q => {
      const dateObj = parseLocalDateTime(q.scheduledAt) || new Date(q.scheduledAt);
      return {
        courseTitle: q.courseTitle,
        title: q.title,
        date: dateObj.toLocaleDateString('ro-RO'),
        time: dateObj.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
        emoji: this.getQuizEmoji(q.title),
        timestamp: dateObj.getTime()
      };
    })
  );

  homeworkEvents = computed(() =>
    this.upcomingHomeworks().map(hw => {
      const dateObj = new Date(hw.dueAt);

      let status = '';
      if (hw.submissionId) status = '✔ Trimis';
      else if (hw.isLate) status = '❌ Nefinalizată la termen';
      else status = '⏳ În curs';

      return {
        courseTitle: hw.courseTitle,
        title: hw.title,
        date: dateObj.toLocaleDateString('ro-RO'),
        time: dateObj.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
        emoji: '📝',
        timestamp: dateObj.getTime(),
        status
      };
    })
  );

  allEvents = computed(() =>
    [
      ...this.quizEvents(),
      ...this.upcomingSchedules(),
      ...this.homeworkEvents()
    ].sort((a, b) => a.timestamp - b.timestamp)
  );

  homeworkCompletion = computed(() => {
    const hw = this.upcomingHomeworks();

    if (hw.length === 0) return 0;

    const submitted = hw.filter(h => h.submissionId).length;

    return Math.round((submitted / hw.length) * 100);
  });

  onTimeRate = computed(() => {
    const total = this.upcomingHomeworks().length;

    const onTime = this.upcomingHomeworks().filter(h =>
      h.submissionId && !h.isLate
    ).length;

    return Math.round((onTime / total) * 100);
  });

  averageGrade = computed(() => {
    const graded = this.upcomingHomeworks()
      .filter(h => h.grade != null && h.maxPoints != null);

    const total = graded.reduce((sum, h) => sum + h.grade, 0);
    const max = graded.reduce((sum, h) => sum + h.maxPoints, 0);

    return max === 0 ? 0 : Math.round((total / max) * 100);
  });

  pendingHomeworks = computed(() => {
    const now = new Date();

    return this.upcomingHomeworks().filter(h =>
      !h.submissionId && new Date(h.dueAt) >= now
    ).length;
  });

  overdueHomeworks = computed(() => {
    const now = new Date();

    return this.upcomingHomeworks().filter(h =>
      !h.submissionId && new Date(h.dueAt) < now
    ).length;
  });

  submittedHomeworks = computed(() => {
    return this.upcomingHomeworks().filter(h =>
      !!h.submissionId
    ).length;
  });

  studentPerformanceScore = computed(() => {
    const hw = this.upcomingHomeworks();

    if (!hw.length) return 0;

    // 1. completare teme
    const completion = hw.filter(h => h.submissionId).length / hw.length;

    // 2. punctualitate
    const onTime = hw.filter(h => h.submissionId && !h.isLate).length;
    const onTimeRate = hw.length ? onTime / hw.length : 0;

    // 3. note (dacă există)
    const graded = hw.filter(h => h.grade != null && h.maxPoints != null);

    let gradeRate = 0;
    if (graded.length) {
      const total = graded.reduce((sum, h) => sum + h.grade, 0);
      const max = graded.reduce((sum, h) => sum + h.maxPoints, 0);
      gradeRate = max ? total / max : 0;
    }

    // scor ponderat
    const score =
      completion * 0.4 +
      onTimeRate * 0.3 +
      gradeRate * 0.3;

    return Math.round(score * 100);
  });

  eventDisplayLimit = 4;
  visibleQuizEvents = computed(() => this.allEvents().slice(0, this.eventDisplayLimit));
  hasMoreQuizEvents = computed(() => this.allEvents().length > this.eventDisplayLimit);
  isAllEventsModalOpen = signal(false);

  // CALENDAR
  currentMonth = signal(new Date());
  days: number[] = [];
  selectedDay = signal<number | null>(null);
  weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  constructor() {
    const user = this.auth.getUser();
    if (user) this.userName.set(`${user.firstName} ${user.lastName}`);

    this.generateCalendar(this.currentMonth());
    this.loadTeachers();
    this.loadUpcomingQuizzes();
    this.loadStudentSchedules();
    this.loadUpcomingSchedules();
    this.loadStudentHomeworks();
  }

  // --- TEACHERS ---
  loadTeachers() {
    if (!this.auth.isLoggedIn()) return;

    this.userService.getLinkedTeachers().pipe(
      takeUntil(this.destroy$),
      catchError(err => {
        if (err.status === 401) {
          this.auth.logout();
          this.router.navigate(['/login']);
        }
        console.error('Failed to load teachers.', err);
        return of([]);
      })
    ).subscribe(items => {
      const mapped = items.map(t => ({
        id: t.id,
        fullName: t.fullName,
        email: t.email,
        role: t.role,
        avatarUrl: t.avatarUrl || 'assets/avatar-default.png',
        phone: t.phone,
        course: t.course
      }));
      this.teachers.set(mapped);
    });
  }

  openTeacherModal(t: Teacher) {
    this.selectedTeacher.set(t);
    this.isModalOpen.set(true);
  }

  closeTeacherModal() {
    this.isModalOpen.set(false);
    this.selectedTeacher.set(null);
  }

  // --- EVENTS ---
  getQuizEmoji(title: string): string {
    const t = title.toLowerCase();
    if (t.includes('math')) return '📐';
    if (t.includes('code') || t.includes('c++') || t.includes('program')) return '💻';
    if (t.includes('robot')) return '🤖';
    if (t.includes('test')) return '📝';
    if (t.includes('exam')) return '📚';
    return '🧠';
  }

  loadUpcomingQuizzes() {
    if (!this.auth.isLoggedIn()) return;

    this.quizService.getStudentAvailableQuizzes().pipe(
      takeUntil(this.destroy$),
      catchError(err => {
        if (err.status === 401) {
          this.auth.logout();
          this.router.navigate(['/login']);
        }
        console.error('Failed to load quizzes', err);
        return of([]);
      })
    ).subscribe(quizzes => {
      const now = new Date();
      const upcoming = quizzes
        .filter(q => q.scheduledAt && ((parseLocalDateTime(q.scheduledAt) || new Date(q.scheduledAt)) > now))
        .sort((a, b) => {
          const aDate = parseLocalDateTime(a.scheduledAt) || new Date(a.scheduledAt);
          const bDate = parseLocalDateTime(b.scheduledAt) || new Date(b.scheduledAt);
          return aDate.getTime() - bDate.getTime();
        });
      this.upcomingQuizzes.set(upcoming);
    });
  }

  loadStudentHomeworks() {
    if (!this.auth.isLoggedIn()) return;

    this.homeworkService.getStudentHomeworks().pipe(
      takeUntil(this.destroy$),
      catchError(err => {
        if (err.status === 401) {
          this.auth.logout();
          this.router.navigate(['/login']);
        }
        console.error('Failed to load homeworks', err);
        return of([]);
      })
    ).subscribe(data => {
      this.upcomingHomeworks.set(data);
    });
  }

  // --- CALENDAR & SCHEDULE ---
  generateCalendar(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const lastDate = new Date(year, month + 1, 0).getDate();

    this.days = [];
    const emptyDays = (firstDay + 6) % 7; // Luni=0
    for (let i = 0; i < emptyDays; i++) this.days.push(0);
    for (let i = 1; i <= lastDate; i++) this.days.push(i);

    // Selectăm ziua curentă dacă este luna curentă
    const today = new Date();
    if (today.getMonth() === month && today.getFullYear() === year) {
      this.selectedDay.set(today.getDate());
    } else {
      this.selectedDay.set(null);
    }
  }

  prevMonth() {
    const d = new Date(this.currentMonth());
    d.setMonth(d.getMonth() - 1);
    this.currentMonth.set(d);
    this.generateCalendar(d);
    this.selectedDay.set(null);
  }

  nextMonth() {
    const d = new Date(this.currentMonth());
    d.setMonth(d.getMonth() + 1);
    this.currentMonth.set(d);
    this.generateCalendar(d);
    this.selectedDay.set(null);
  }

  monthName(): string {
    return this.currentMonth().toLocaleString('ro-RO', { month: 'long', year: 'numeric' });
  }

  selectDay(day: number) {
    if (day !== 0) this.selectedDay.set(day);
  }

  // --- STUDENT SCHEDULES ---
  studentSchedules = signal<any[]>([]);

  lessonsForSelectedDay() {
    if (!this.selectedDay()) return [];
    return this.studentSchedules().filter(s => {
      const d = new Date(s.Date);
      return d.getDate() === this.selectedDay() && d.getMonth() === this.currentMonth().getMonth();
    });
  }

  dayHasSchedule(day: number): boolean {
    if (day === 0) return false;
    const date = new Date(this.currentMonth());
    date.setDate(day);
    const weekday = date.getDay();
    return this.studentSchedules().some(s => s.DayOfWeek === weekday);
  }

  gaugeStyle(value: number, color = '#FFB86B') {
    return getGaugeStyle(value, color);
  }

  loadStudentSchedules() {
    if (!this.auth.isLoggedIn()) return;

    this.courseScheduleService.getStudentSchedules().pipe(
      takeUntil(this.destroy$),
      catchError(err => {
        if (err.status === 401) {
          this.auth.logout();
          this.router.navigate(['/login']);
        }
        console.error('Failed to load student schedules', err);
        return of([]);
      })
    ).subscribe(data => {
      const month = this.currentMonth().getMonth();
      const year = this.currentMonth().getFullYear();
      const parsed = data.flatMap((s: any) => {
        const dates = this.getDatesForDayInMonth(s.DayOfWeek, month, year);
        return dates.map(date => ({
          ...s,
          Date: date,
          StartTimeLocal: this.parseTimeToDate(s.StartTime, date),
          EndTimeLocal: this.parseTimeToDate(s.EndTime, date),
        }));
      });
      this.studentSchedules.set(parsed);
    });
  }

  loadUpcomingSchedules() {
    if (!this.auth.isLoggedIn()) return;

    this.courseScheduleService.getUpcomingStudentSchedules().pipe(
      takeUntil(this.destroy$),
      catchError(err => {
        if (err.status === 401) {
          this.auth.logout();
          this.router.navigate(['/login']);
        }
        console.error('Failed to load upcoming schedules', err);
        return of([]);
      })
    ).subscribe(data => {
      const now = new Date();
      const parsed = data.map((s: any) => {
        const nextDate = this.getNextOccurrence(s.DayOfWeek, s.StartTime);
        return {
          courseTitle: s.CourseTitle,
          title: 'Curs',
          date: nextDate.toLocaleDateString('ro-RO'),
          time: nextDate.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
          emoji: '📘',
          timestamp: nextDate.getTime()
        };
      }).filter(e => e.timestamp > now.getTime()).sort((a, b) => a.timestamp - b.timestamp);
      this.upcomingSchedules.set(parsed);
    });
  }

  // --- HELPERS ---
  private parseTimeToDate(timeISO: string, day: Date): Date {
    const t = new Date(timeISO);
    const d = new Date(day);
    d.setHours(t.getUTCHours(), t.getUTCMinutes(), t.getUTCSeconds(), 0);
    return d;
  }

  goToHomeworks() {
    this.router.navigate(['/student/homeworks']);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getDatesForDayInMonth(dayOfWeek: number, month: number, year: number): Date[] {
    const dates: Date[] = [];
    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(year, month, d);
      date.setHours(12, 0, 0, 0);
      const jsDay = date.getDay();
      const mappedDay = jsDay === 0 ? 7 : jsDay; // 1=Monday
      if (mappedDay === dayOfWeek) dates.push(date);
    }
    return dates;
  }

  private getNextOccurrence(dayOfWeek: number, time: string): Date {
    const now = new Date();
    const result = new Date();
    const currentDay = now.getDay() === 0 ? 7 : now.getDay();
    let diff = dayOfWeek - currentDay;
    if (diff < 0) diff += 7;
    result.setDate(now.getDate() + diff);
    const t = new Date(time);
    result.setHours(t.getUTCHours(), t.getUTCMinutes(), 0, 0);
    if (result < now) result.setDate(result.getDate() + 7);
    return result;
  }
}
