import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth';
import { User } from '../../core/services/user';
import { Teacher } from '../../core/models/teacher.model';
import { Quiz } from '../../core/services/quiz';

interface Event {
  title: string;
  date: string;
  time: string;
  imageUrl: string;
}

interface Project {
  title: string;
  imageUrl: string;
}

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
export class StudentDashboard {
  private auth = inject(AuthService);
  private userService = inject(User);
  private quizService = inject(Quiz);

  // USER
  userName = signal('');

  teachers = signal<Teacher[]>([]);
  displayLimit = 4;
  selectedTeacher = signal<Teacher | null>(null);
  isModalOpen = signal(false);
  // GAUGES
  attendance = signal(60);
  homework = signal(90);
  rating = signal(75);



  // EVENTS
  upcomingQuizzes = signal<any[]>([]);

  quizEvents = computed(() => 
    this.upcomingQuizzes().map(q => {
      const dateObj = new Date(q.scheduledAt);

      return {
        courseTitle: q.courseTitle,
        title: q.title,
        date: dateObj.toLocaleDateString('ro-RO'),
        time: dateObj.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
        emoji: this.getQuizEmoji(q.title)
      };
    })
  );

  getQuizEmoji(title: string): string {
    const t = title.toLowerCase();

    if (t.includes('math')) return '📐';
    if (t.includes('code') || t.includes('c++') || t.includes('program')) return '💻';
    if (t.includes('robot')) return '🤖';
    if (t.includes('test')) return '📝';
    if (t.includes('exam')) return '📚';

    return '🧠'; // default smart fallback
  }

  eventDisplayLimit = 4;

  visibleQuizEvents = computed(() =>
    this.quizEvents().slice(0, this.eventDisplayLimit)
  );

  hasMoreQuizEvents = computed(() =>
    this.quizEvents().length > this.eventDisplayLimit
  );

  isAllEventsModalOpen = signal(false);

  // CALENDAR
  currentMonth = signal(new Date());
  days: number[] = [];
  selectedDay = signal<number | null>(null);
  weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  // LECȚII
  dailyLessons = signal<Lesson[]>([
    { day: 18, title: 'Robotics lesson', time: '13:30' },
    { day: 19, title: 'Electronics lesson', time: '16:00' },
    { day: 20, title: 'C++ lesson', time: '17:30' },
  ]);

  visibleTeachers = computed(() => 
    this.teachers().slice(0, this.displayLimit)
  );

  hasMoreTeachers = computed(() => 
    this.teachers().length > this.displayLimit
  );

  isAllTeachersModalOpen = signal(false);

  constructor() {
    const user = this.auth.getUser();
    if (user) this.userName.set(`${user.firstName} ${user.lastName}`);
    this.generateCalendar(this.currentMonth());

    // Setăm prima zi cu lecții ca selectată
    const firstLessonDay = this.dailyLessons()[0]?.day;
    if (firstLessonDay) this.selectedDay.set(firstLessonDay);
    this.loadTeachers();

    this.loadUpcomingQuizzes();
  }

  loadTeachers() {
    this.userService.getLinkedTeachers().subscribe({
      next: (items) => {
        console.log('Raw teachers from API:', items); // Debug API data
        const mapped = items.map(t => ({
          id: t.id,
          fullName: t.fullName,
          email: t.email,
          role: t.role, // Poți schimba
          avatarUrl: t.avatarUrl || 'assets/avatar-default.png',
          phone: t.phone,
          course: t.course
        }));

        console.log('Mapped teachers:', mapped); // Debug mapped data
        this.teachers.set(mapped);
      },
      error: () => console.error("Failed to load teachers.")
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

  generateCalendar(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const lastDate = new Date(year, month + 1, 0).getDate();

    this.days = [];

    // convertim ca luni=0
    const emptyDays = (firstDay + 6) % 7;
    for (let i = 0; i < emptyDays; i++) this.days.push(0);

    for (let i = 1; i <= lastDate; i++) this.days.push(i);
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

  lessonsForSelectedDay(): Lesson[] {
    if (!this.selectedDay()) return [];
    return this.dailyLessons().filter(l => l.day === this.selectedDay());
  }

  dayHasLesson(d: number): boolean {
    if (d === 0) return false; // zilele goale
    return this.dailyLessons().some(l => l.day === d);
  }

  gaugeStyle(value: number, color = '#FFB86B') {
    return getGaugeStyle(value, color);
  }

  loadUpcomingQuizzes() {
    this.quizService.getStudentAvailableQuizzes().subscribe({
      next: (quizzes) => {
        const now = new Date();

        const upcoming = quizzes
          .filter(q => q.scheduledAt && new Date(q.scheduledAt) > now)
          .sort((a, b) => 
            new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
          );

        this.upcomingQuizzes.set(upcoming);
      },
      error: () => console.error('Failed to load quizzes')
    });
  }
}
