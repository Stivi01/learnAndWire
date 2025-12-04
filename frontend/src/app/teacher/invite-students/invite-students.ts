import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CourseInvitation } from '../../core/services/course-invitation';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-invite-students',
  imports: [CommonModule,ReactiveFormsModule],
  standalone: true,
  templateUrl: './invite-students.html',
  styleUrl: './invite-students.scss',
})
export class InviteStudents implements OnInit{
  courseId!: number;
  students = signal<{ id: number; name: string }[]>([]); // aici poți încărca lista de studenți
  selectedStudents = signal<number[]>([]);
  form!: FormGroup;
  loading = signal(false);
  error = signal('');
  success = signal('');

  constructor(
    private invitationService: CourseInvitation,
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    this.courseId = +this.route.snapshot.queryParamMap.get('courseId')!;
    this.form = this.fb.group({});

    // Simulăm studenți - în realitate, îi iei din backend
    this.students.set([
      { id: 1, name: 'Ana Popescu' },
      { id: 2, name: 'Ion Ionescu' },
      { id: 3, name: 'Maria Georgescu' }
    ]);
  }

  toggleStudent(studentId: number) {
    const arr = this.selectedStudents();
    if (arr.includes(studentId)) {
      this.selectedStudents.set(arr.filter(x => x !== studentId));
    } else {
      this.selectedStudents.set([...arr, studentId]);
    }
  }

  sendInvitations() {
    if (this.selectedStudents().length === 0) return;

    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    this.invitationService.inviteStudents(this.courseId, this.selectedStudents())
      .subscribe({
        next: res => { this.success.set('Invitațiile au fost trimise!'); this.loading.set(false); },
        error: err => { this.error.set('Eroare la trimiterea invitațiilor.'); this.loading.set(false); }
      });
  }
}
