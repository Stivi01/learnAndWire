import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { CourseInvitation, CourseInvitationData } from '../../core/services/course-invitation';
import { NotificationService, StudentNotificationsResponse } from '../../core/services/notification';

@Component({
  selector: 'app-my-enrollments',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './my-enrollments.html',
  styleUrl: './my-enrollments.scss',
})
export class MyEnrollments implements OnInit {
  notifications = signal<StudentNotificationsResponse | null>(null);
  loading = signal(true);
  error = signal('');

  constructor(
    private notificationService: NotificationService,
    private invitationService: CourseInvitation
  ) {}

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
    this.loading.set(true);
    this.notificationService.getNotifications().subscribe({
      next: data => {
        this.notifications.set(data);
        this.loading.set(false);
      },
      error: err => {
        console.error(err);
        this.error.set('Nu s-au putut încărca notificările.');
        this.loading.set(false);
      }
    });
  }

  get invitationItems() {
    return this.notifications()?.invitations ?? [];
  }

  get exclusionItems() {
    return this.notifications()?.exclusions ?? [];
  }

  get quizItems() {
    return this.notifications()?.quizzes ?? [];
  }

  get moduleItems() {
    return this.notifications()?.modules ?? [];
  }

  get lessonItems() {
    return this.notifications()?.lessons ?? [];
  }

  get homeworkItems() {
    return this.notifications()?.homeworks ?? [];
  }

  get hasNotifications() {
    return (
      this.invitationItems.length > 0 ||
      this.exclusionItems.length > 0 ||
      this.quizItems.length > 0 ||
      this.moduleItems.length > 0 ||
      this.lessonItems.length > 0 ||
      this.homeworkItems.length > 0
    );
  }

  respond(invId: number, accept: boolean) {
    this.invitationService.respond(invId, accept).subscribe({
      next: () => this.loadNotifications(),
      error: err => console.error(err)
    });
  }
}
