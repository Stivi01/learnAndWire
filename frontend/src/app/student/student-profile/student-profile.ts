import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StudentProfileData, User } from '../../core/services/user';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-student-profile',
  imports: [CommonModule,FormsModule],
  standalone: true,
  templateUrl: './student-profile.html',
  styleUrl: './student-profile.scss',
})
export class StudentProfile {
private userService = inject(User);
private authService = inject(AuthService);

  profile = signal<StudentProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    academicYear: 0,
    avatar: ''
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
        console.log("Avatar value from server:", data.avatar); // <--- ADAUGĂ ACEASTA
        // fallback avatar
      //  if (!data.avatar || data.avatar === 'null') {
      //    data.avatar = 'assets/avatar-default.png';
      //  }
        this.profile.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Eroare la încărcarea profilului.');
        this.isLoading.set(false);
      }
    });
  }

  uploadAvatar(event: any) {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('avatar', file);

  this.userService.uploadAvatar(formData).subscribe({
    next: (res) => {
      this.profile.set({ ...this.profile(), avatar: res.avatar });
      this.authService.updateUserAvatar(res.avatar || '');
      this.successMessage.set('Avatar actualizat!');
    },
    error: () => {
      this.errorMessage.set('Eroare la încărcarea avatarului.');
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
