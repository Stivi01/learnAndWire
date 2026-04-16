import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnDestroy } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { StudentProfileData, User } from '../../core/services/user';
import { AuthService } from '../../core/services/auth';
import { ToastService } from '../../core/services/toast';
import { RecoveryCodesSettings } from '../../shared/components/recovery-codes-settings/recovery-codes-settings';
import { ChangePasswordSettings } from '../../shared/components/change-password-settings/change-password-settings';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-teacher-profile',
  imports: [CommonModule, FormsModule, RecoveryCodesSettings, ChangePasswordSettings],
  standalone: true,
  templateUrl: './teacher-profile.html',
  styleUrl: './teacher-profile.scss',
})
export class TeacherProfile implements OnDestroy {
  private userService = inject(User);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private destroy$ = new Subject<void>();

  profile = signal<StudentProfileData>({
    id: 0,
    firstName: '',
    lastName: '',
    email: '',
    academicYear: 0,
    avatar: '',
    phone: '',   // Adăugat pentru siguranță
    address: ''  // Adăugat pentru siguranță
  });

  isLoading = signal(true);

  constructor() {
    this.loadProfile();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProfile() {
    this.userService.getProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          console.log("Avatar value from server:", data.avatar);
          this.profile.set(data);
          this.isLoading.set(false);
        },
        error: (err) => {
          // Don't show error toast for 401 (token expired/invalidated) - interceptor handles logout
          if (err.status !== 401) {
            this.toastService.show('Eroare la încărcarea profilului.', 'error');
          }
          this.isLoading.set(false);
        }
      });
  }

  uploadAvatar(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    this.userService.uploadAvatar(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.profile.set({ ...this.profile(), avatar: res.avatar });
          this.authService.updateUserAvatar(res.avatar || '');
          this.toastService.show('Avatar actualizat!', 'success');
          this.loadProfile();
        },
        error: () => {
          this.toastService.show('Eroare la încărcarea avatarului.', 'error');
        }
      });
  }

  // Opțional, poți primi form-ul aici ca parametru pentru o extra-verificare
  saveProfile(form?: NgForm) {
    if (form && form.invalid) {
      this.toastService.show('Te rugăm să corectezi erorile din formular.', 'error');
      return;
    }

    this.userService.updateProfile(this.profile())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.show('Profilul a fost actualizat cu succes!', 'success');
          this.loadProfile();
        },
        error: () => {
          this.toastService.show('Eroare la actualizarea profilului.', 'error');
        }
      });
  }
}
