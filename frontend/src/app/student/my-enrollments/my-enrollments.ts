import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { CourseInvitation, CourseInvitationData } from '../../core/services/course-invitation';

@Component({
  selector: 'app-my-enrollments',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './my-enrollments.html',
  styleUrl: './my-enrollments.scss',
})
export class MyEnrollments implements OnInit{
  invitations = signal<CourseInvitationData[]>([]);
  loading = signal(true);
  error = signal('');

  constructor(private invitationService: CourseInvitation) {}

  ngOnInit() {
    this.loadInvitations();
  }

  loadInvitations() {
    this.loading.set(true);
    this.invitationService.getInvitations().subscribe({
      next: data => { this.invitations.set(data); this.loading.set(false); },
      error: err => { this.error.set('Nu s-au putut încărca invitațiile.'); this.loading.set(false); }
    });
  }

  respond(invId: number, accept: boolean) {
    this.invitationService.respond(invId, accept).subscribe({
      next: () => this.invitations.set(this.invitations().filter(i => i.Id !== invId)),
      error: err => console.error(err)
    });
  }
}
