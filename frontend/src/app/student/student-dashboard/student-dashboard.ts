import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';

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
  // --- MOCK DATA (Signals) ---
  userName = signal('Sophia');
  
  // STATS GAUGES (Procentaje)
  attendance = signal(60);
  homework = signal(90);
  rating = signal(75);

  // COMPUTED Styles for the Gauge Background (folosind conic-gradient)
  // Culorile sunt preluate din imagine: Roz pal, Turcoaz, Galben
  attendanceGaugeStyle = computed(() => getGaugeStyle(this.attendance(), '#F06292')); // Roz
  homeworkGaugeStyle = computed(() => getGaugeStyle(this.homework(), '#4DB6AC')); // Turcoaz
  ratingGaugeStyle = computed(() => getGaugeStyle(this.rating(), '#FFB74D')); // Galben-portocaliu

  // TEACHERS
  teachers = signal<Teacher[]>([
    { name: 'Olivia Miller', role: 'mentor', avatarUrl: 'https://placehold.co/40x40/B39DDB/ffffff?text=OM' },
    { name: 'Liam Garcia', role: 'teacher', avatarUrl: 'https://placehold.co/40x40/81C784/ffffff?text=LG' },
    { name: 'Jackson Lopez', role: 'teacher', avatarUrl: 'https://placehold.co/40x40/FF8A65/ffffff?text=JL' },
  ]);

  // UPCOMING EVENTS
  events = signal<Event[]>([
    { title: 'The main event in your life', date: '12 May 2025', time: '13:00', imageUrl: 'https://placehold.co/48x48/A48DAE/ffffff?text=E1' },
    { title: 'Webinar of new tools in Minecraft', date: '16 May 2025', time: '18:00', imageUrl: 'https://placehold.co/48x48/64B5F6/ffffff?text=E2' },
    // Am adaugat un al treilea eveniment pentru a umple spatiul
    { title: 'Robotics Workshop', date: '22 May 2025', time: '10:00', imageUrl: 'https://placehold.co/48x48/FFD54F/ffffff?text=E3' },
  ]);

  // DAILY LESSONS (SCHEDULE)
  dailyLessons = signal<Lesson[]>([
    { day: 18, title: 'Robotics lesson', time: '13:30' },
    { day: 19, title: 'Electronics lesson', time: '16:00' },
    { day: 20, title: 'C++ lesson', time: '17:30' },
  ]);
  
  // PROJECTS
  projects = signal<Project[]>([
    { title: 'Homework 15', imageUrl: 'https://placehold.co/320x160/D4C3E9/4B3C53?text=Robotics+Kit' },
    { title: 'Homework 16', imageUrl: 'https://placehold.co/320x160/C5E1A5/4B3C53?text=Circuit+Board' },
    // Un al treilea pentru a se potrivi mai bine in designul responsive
    { title: 'Homework 17', imageUrl: 'https://placehold.co/320x160/B3E5FC/4B3C53?text=3D+Printer' },
  ]);
  gaugeStyle(value: number, color = '#FFB86B') {
    const deg = (value / 100) * 360;
    return `conic-gradient(${color} 0deg ${deg}deg, rgba(255,255,255,0.08) ${deg}deg 360deg)`;
  }
}
