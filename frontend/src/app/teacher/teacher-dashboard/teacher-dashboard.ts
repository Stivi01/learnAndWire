import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Navbar } from '../../shared/components/navbar/navbar';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-teacher-dashboard',
  imports: [CommonModule,RouterModule],
  standalone: true,
  templateUrl: './teacher-dashboard.html',
  styleUrl: './teacher-dashboard.scss',
})
export class TeacherDashboard {
  totalCourses = 12;
  pendingAssignments = 5;
  studentsEnrolled = 120;

  recentCourses = [
    { title: 'Angular Basics', description: 'Intro to Angular 17', createdAt: '2025-12-01' },
    { title: 'Advanced SQL', description: 'Queries and optimization', createdAt: '2025-11-25' },
  ];
}
