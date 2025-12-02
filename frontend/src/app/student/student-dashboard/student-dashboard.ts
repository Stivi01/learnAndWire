import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth';

interface Teacher {
  name: string;
  role: string;
  avatarUrl: string;
}

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

  // USER
  userName = signal('');

  // GAUGES
  attendance = signal(60);
  homework = signal(90);
  rating = signal(75);

  // TEACHERS
  teachers = signal<Teacher[]>([
    { name: 'Olivia Miller', role: 'mentor', avatarUrl: 'https://placehold.co/40x40/B39DDB/ffffff?text=OM' },
    { name: 'Liam Garcia', role: 'teacher', avatarUrl: 'https://placehold.co/40x40/81C784/ffffff?text=LG' },
    { name: 'Jackson Lopez', role: 'teacher', avatarUrl: 'https://placehold.co/40x40/FF8A65/ffffff?text=JL' },
  ]);

  // EVENTS
  events = signal<Event[]>([
    { title: 'The main event in your life', date: '12 May 2025', time: '13:00', imageUrl: 'https://placehold.co/48x48/A48DAE/ffffff?text=E1' },
    { title: 'Webinar of new tools in Minecraft', date: '16 May 2025', time: '18:00', imageUrl: 'https://placehold.co/48x48/64B5F6/ffffff?text=E2' },
    { title: 'Robotics Workshop', date: '22 May 2025', time: '10:00', imageUrl: 'https://placehold.co/48x48/FFD54F/ffffff?text=E3' },
  ]);

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

  constructor() {
    const user = this.auth.getUser();
    if (user) this.userName.set(`${user.firstName} ${user.lastName}`);
    this.generateCalendar(this.currentMonth());

    // Setăm prima zi cu lecții ca selectată
    const firstLessonDay = this.dailyLessons()[0]?.day;
    if (firstLessonDay) this.selectedDay.set(firstLessonDay);
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
}
