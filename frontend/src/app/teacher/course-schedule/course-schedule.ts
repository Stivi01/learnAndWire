import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CourseSchedules } from '../../core/services/course-schedules';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-course-schedule',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './course-schedule.html',
  styleUrl: './course-schedule.scss',
})
export class CourseSchedule {
  course: any;
  scheduleForm: FormGroup;
  existingSchedule: any = null;
  hasSchedule = false;

  daysOfWeek = [
    { value: 1, label: 'Luni' },
    { value: 2, label: 'Marți' },
    { value: 3, label: 'Miercuri' },
    { value: 4, label: 'Joi' },
    { value: 5, label: 'Vineri' },
  ];

  constructor(
  private fb: FormBuilder,
  private router: Router,
  private courseScheduleService: CourseSchedules
) {
  this.course = this.courseScheduleService.getSelectedCourse();

  if (!this.course) {
    // dacă nu există curs selectat, redirecționăm la My Classes
    this.router.navigate(['/teacher/my-classes']);
  }

  this.scheduleForm = this.fb.group({
    dayOfWeek: [null, Validators.required],
    startTime: ['', Validators.required],
    endTime: ['', Validators.required],
    recurrence: ['weekly', Validators.required],
  });
}

  ngOnInit() {
    if (!this.course) return;

    this.courseScheduleService
      .getScheduleForCourse(this.course.Id)
      .subscribe({
        next: (data: any | null) => {

          if (!data) {
            this.hasSchedule = false;
            return;
          }

          this.existingSchedule = data;
          this.hasSchedule = true;

          this.scheduleForm.patchValue({
            dayOfWeek: data.dayOfWeek,
            startTime: this.formatTime(data.startTime),
            endTime: this.formatTime(data.endTime),
            recurrence: 'weekly'
          });
        },
        error: () => {
          console.error('Failed to load schedule');
          this.hasSchedule = false;
        }
      });
  }
  submit() {
  if (this.scheduleForm.invalid) return;

  const payload = {
    courseId: this.course!.Id,
    dayOfWeek: this.scheduleForm.value.dayOfWeek,
    startTime: this.scheduleForm.value.startTime,
    endTime: this.scheduleForm.value.endTime,
  };

  // 🔥 UPDATE sau CREATE
  const request = this.hasSchedule
    ? this.courseScheduleService.updateCourseSchedule(this.existingSchedule.id, payload)
    : this.courseScheduleService.addCourseSchedule(payload);

  request.subscribe({
    next: () => {
      alert(this.hasSchedule ? 'Programare actualizată!' : 'Curs programat!');
      this.router.navigate(['/teacher/my-classes']);
    },
    error: () => {
      alert('Eroare.');
    }
  });
}

  private getNextDateForDay(dayOfWeek: number): string {
    const today = new Date();
    const todayDay = today.getDay(); // 0 = Duminică, 1 = Luni, ..., 6 = Sâmbătă
    // În backend folosim 1=Luni ... 5=Vineri, deci ajustăm
    const offset = (dayOfWeek - todayDay + 7) % 7;
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + (offset === 0 ? 7 : offset)); // dacă azi e ziua, folosim săptămâna viitoare
    // Formatare YYYY-MM-DD pentru SQL Server
    return nextDate.toISOString().split('T')[0];
  }

  cancel() {
    this.router.navigate(['/teacher/my-classes']);
    this.courseScheduleService.clearSelectedCourse();
  }
  formatTime(time: string): string {
    if (!time) return '';

    // dacă vine ca ISO string (1970-01-01T08:00:00)
    if (time.includes('T')) {
      return time.split('T')[1].substring(0, 5); // 08:00
    }

    // dacă vine ca 08:00:00
    if (time.length >= 5) {
      return time.substring(0, 5); // 08:00
    }

    return time;
  }

}
