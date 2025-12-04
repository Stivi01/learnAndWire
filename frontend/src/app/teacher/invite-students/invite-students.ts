import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CourseInvitation } from '../../core/services/course-invitation';
import { ActivatedRoute, Router } from '@angular/router';
import { StudentProfileData, User } from '../../core/services/user';
import { Course } from '../../core/services/course';

@Component({
  selector: 'app-invite-students',
  imports: [CommonModule,ReactiveFormsModule,FormsModule],
  standalone: true,
  templateUrl: './invite-students.html',
  styleUrl: './invite-students.scss',
})
export class InviteStudents implements OnInit{
  courses = signal<any[]>([]);
  selectedCourse: any = null; // pentru debug / selectat manual
  students = signal<StudentProfileData[]>([]);
  filteredStudents = signal<StudentProfileData[]>([]);
  selectedStudents = signal<number[]>([]);
  filterYear = signal<number | null>(null);
  academicYears = signal<number[]>([1, 2, 3, 4]);

  success = signal('');
  error = signal('');
  loadingCourses = signal(false);
  loadingStudents = signal(false);

  constructor(
    private courseService: Course,
    private userService: User,
    private inviteService: CourseInvitation
  ) {}

  ngOnInit() {
    this.loadCourses();
    this.loadStudents();
  }

  /** -------------------------
   *  LOAD COURSES (profesor logat)
   * ------------------------- */
  loadCourses() {
  this.loadingCourses.set(true);
  this.courseService.getMyCourses().subscribe({
    next: (data) => {
      console.log('Courses loaded:', data);
      this.courses.set(data);
      if (data.length > 0) this.selectedCourse = data[0];
      this.loadingCourses.set(false);
    },
    error: (err) => {
      console.error('❌ Error loading courses:', err);
      this.error.set('Nu s-au putut încărca cursurile profesorului.');
      this.loadingCourses.set(false);
    }
  });
}

  /** -------------------------
   *  LOAD STUDENTS
   * ------------------------- */
  loadStudents() {
    this.loadingStudents.set(true);
    this.userService.getStudents()
      .subscribe({
        next: (data) => {
          this.students.set(data);
          this.filteredStudents.set(data);
          console.log('✅ Students loaded:', data);
          this.loadingStudents.set(false);
        },
        error: (err) => {
          console.error('❌ Error loading students:', err);
          this.error.set('Nu s-au putut încărca studenții.');
          this.loadingStudents.set(false);
        }
      });
  }

  applyFilter() {
    const year = this.filterYear();
    if (!year) {
      this.filteredStudents.set(this.students());
      return;
    }

    this.filteredStudents.set(
      this.students().filter(s => s.academicYear == year)
    );
  }

  toggleStudent(studentId: number) {
    const current = this.selectedStudents();
    if (current.includes(studentId)) {
      this.selectedStudents.set(current.filter(x => x !== studentId));
    } else {
      this.selectedStudents.set([...current, studentId]);
    }
  }

  /** -------------------------
   *  INVITATIONS
   * ------------------------- */
  sendSingleInvitation(studentId: number) {
    if (!this.selectedCourse) {
      this.error.set('Nu a fost selectat niciun curs.');
      return;
    }

    this.inviteService.inviteStudents(this.selectedCourse.Id, [studentId])
      .subscribe({
        next: () => this.success.set('Invitația a fost trimisă!'),
        error: (err) => {
          console.error(err);
          this.error.set('Eroare la trimiterea invitației.');
        }
      });
  }

  sendBulkInvitations() {
    if (!this.selectedCourse) {
      this.error.set('Nu a fost selectat niciun curs.');
      return;
    }

    const list = this.selectedStudents();
    if (!list.length) return;

    this.inviteService.inviteStudents(this.selectedCourse.Id, list)
      .subscribe({
        next: () => {
          this.success.set('Invitațiile au fost trimise!');
          this.selectedStudents.set([]);
        },
        error: (err) => {
          console.error(err);
          this.error.set('Eroare la trimiterea invitațiilor.');
        }
      });
  }
}
