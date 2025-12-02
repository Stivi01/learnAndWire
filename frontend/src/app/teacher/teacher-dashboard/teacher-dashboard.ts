import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Navbar } from '../../shared/components/navbar/navbar';

@Component({
  selector: 'app-teacher-dashboard',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './teacher-dashboard.html',
  styleUrl: './teacher-dashboard.scss',
})
export class TeacherDashboard {
  role: 'Student' | 'Profesor' | null = 'Profesor';

}
