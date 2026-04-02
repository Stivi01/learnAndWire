import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CourseInvitation } from '../../core/services/course-invitation';
import { StudentProfileData, User } from '../../core/services/user';
import { Course } from '../../core/services/course';
import { ToastService } from '../../core/services/toast';

@Component({
  selector: 'app-invite-students',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  standalone: true,
  templateUrl: './invite-students.html',
  styleUrl: './invite-students.scss',
})
export class InviteStudents implements OnInit {
  courses = signal<any[]>([]);
  selectedCourse: any = null;
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
    private inviteService: CourseInvitation,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadCourses();
    this.loadStudents();
  }

  loadCourses() {
    this.loadingCourses.set(true);
    this.error.set('');

    this.courseService.getMyCourses().subscribe({
      next: (data) => {
        const publishedCourses = data.filter((course: any) => course.IsPublished);

        this.courses.set(publishedCourses);
        this.selectedCourse = publishedCourses.length > 0 ? publishedCourses[0] : null;

        if (!publishedCourses.length) {
          this.error.set('Poți invita studenți doar la cursuri publicate. Publică mai întâi un curs.');
        }

        this.loadingCourses.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading courses:', err);
        this.error.set('Nu s-au putut încărca cursurile profesorului.');
        this.loadingCourses.set(false);
      }
    });
  }

  loadStudents() {
    this.loadingStudents.set(true);
    this.userService.getStudents().subscribe({
      next: (data) => {
        this.students.set(data);
        this.filteredStudents.set(data);
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

  private canSendInvitations(): boolean {
    if (!this.selectedCourse) {
      this.toastService.show('Selectează un curs publicat.', 'error');
      return false;
    }

    if (!this.selectedCourse.IsPublished) {
      this.toastService.show('Poți invita studenți doar la cursuri publicate.', 'error');
      return false;
    }

    return true;
  }

  sendSingleInvitation(studentId: number) {
    if (!this.canSendInvitations()) {
      return;
    }

    this.inviteService.inviteStudents(this.selectedCourse.Id, [studentId]).subscribe({
      next: () => this.toastService.show('Invitația a fost trimisă!', 'success'),
      error: (err) => {
        console.error(err);
        const message = err?.error?.message || 'Eroare la trimiterea invitației.';
        this.toastService.show(message, 'error');
      }
    });
  }

  sendBulkInvitations() {
    if (!this.canSendInvitations()) {
      return;
    }

    const list = this.selectedStudents();
    if (!list.length) {
      this.toastService.show('Selectează cel puțin un student.', 'info');
      return;
    }

    this.inviteService.inviteStudents(this.selectedCourse.Id, list).subscribe({
      next: () => {
        this.toastService.show('Invitațiile au fost trimise!', 'success');
        this.selectedStudents.set([]);
      },
      error: (err) => {
        console.error(err);
        const message = err?.error?.message || 'Eroare la trimiterea invitațiilor.';
        this.toastService.show(message, 'error');
      }
    });
  }
}
