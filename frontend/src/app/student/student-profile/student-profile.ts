import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StudentProfileData, User } from '../../core/services/user';

@Component({
  selector: 'app-student-profile',
  imports: [CommonModule,FormsModule],
  standalone: true,
  templateUrl: './student-profile.html',
  styleUrl: './student-profile.scss',
})
export class StudentProfile {
private userService = inject(User);

  profile = signal<StudentProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    academicYear: 0
  });

  isLoading = signal(true);
  successMessage = signal('');
  errorMessage = signal('');

  constructor() {
    this.loadProfile();
  }

  loadProfile() {
    this.userService.getProfile().subscribe({
      next: (data) => {
        this.profile.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Eroare la încărcarea profilului.');
        this.isLoading.set(false);
      }
    });
  }

  saveProfile() {
    this.userService.updateProfile(this.profile()).subscribe({
      next: () => {
        this.successMessage.set('Profilul a fost actualizat cu succes!');
      },
      error: () => {
        this.errorMessage.set('Eroare la actualizarea profilului.');
      }
    });
  }
}
