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
  submit() {
    if (this.scheduleForm.invalid) return;

    const payload = {
      courseId: this.course!.Id,
      dayOfWeek: this.scheduleForm.value.dayOfWeek, // <- important
      startTime: this.scheduleForm.value.startTime,
      endTime: this.scheduleForm.value.endTime,
      // location: this.scheduleForm.value.location || '', // opțional
    };

    this.courseScheduleService.addCourseSchedule(payload).subscribe({
      next: () => {
        alert('Curs programat cu succes!');
        this.router.navigate(['/teacher/my-classes']);
        this.courseScheduleService.clearSelectedCourse();
      },
      error: err => {
        console.error(err);
        alert('A apărut o eroare la programarea cursului.');
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

}
