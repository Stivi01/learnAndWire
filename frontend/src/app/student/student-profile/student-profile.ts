import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StudentProfileData, User } from '../../core/services/user';
import { AuthService } from '../../core/services/auth';
import { ToastService } from '../../core/services/toast';

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
private toastService = inject(ToastService);

  profile = signal<StudentProfileData>({
    id:0,
    firstName: '',
    lastName: '',
    email: '',
    academicYear: 0,
    avatar: ''
  });

  isLoading = signal(true);

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
        this.toastService.show('Eroare la încărcarea profilului.', 'error');
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
      this.toastService.show('Avatar actualizat!', 'success');
      this.loadProfile(); // reload to get updatedAt
    },
    error: () => {
      this.toastService.show('Eroare la încărcarea avatarului.', 'error');
    }
  });
}


  saveProfile() {
    this.userService.updateProfile(this.profile()).subscribe({
      next: () => {
        this.toastService.show('Profilul a fost actualizat cu succes!', 'success');
        this.loadProfile(); // reload to get updatedAt
      },
      error: () => {
        this.toastService.show('Eroare la actualizarea profilului.', 'error');
      }
    });
  }
}
