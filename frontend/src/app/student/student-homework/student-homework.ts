import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Homework } from '../../core/services/homework';
import { ToastService } from '../../core/services/toast';
import { HomeworkItem } from '../../core/models/homework.model';

@Component({
  selector: 'app-student-homework',
  imports: [CommonModule, FormsModule, RouterModule],
  standalone: true,
  templateUrl: './student-homework.html',
  styleUrl: './student-homework.scss',
})
export class StudentHomework {
  homeworks = signal<HomeworkItem[]>([]);
  loading = signal(true);
  submitting = signal(false);
  selectedFiles: { [homeworkId: number]: File[] } = {};

  constructor(
    private homeworkService: Homework,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadHomeworks();
  }

  loadHomeworks() {
    this.homeworkService.getStudentHomeworks().subscribe({
      next: (data) => {
        this.homeworks.set(data || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        if (err.status !== 401) {
          this.toast.show('Nu s-au putut încărca temele tale.', 'error');
        }
        this.loading.set(false);
      }
    });
  }

  onFileChange(homeworkId: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    this.selectedFiles[homeworkId] = files;
  }

  submitClassic(homework: HomeworkItem) {
    const files = this.selectedFiles[homework.id] || [];
    if (files.length === 0) {
      this.toast.show('Alege cel puțin un fișier PDF/DOC/DOCX.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('submissionType', 'classic');
    files.forEach((file) => formData.append('files', file));

    this.submitting.set(true);
    this.homeworkService.submitHomework(homework.id, formData).subscribe({
      next: () => {
        this.toast.show('Tema a fost trimisă.', 'success');
        this.selectedFiles[homework.id] = [];
        this.loadHomeworks();
        this.submitting.set(false);
      },
      error: (err) => {
        console.error(err);
        if (err.status !== 401) {
          this.toast.show(err.error?.message || 'Eroare la trimiterea temei.', 'error');
        }
        this.submitting.set(false);
      }
    });
  }

  submitBreadbord(homework: HomeworkItem) {
    const files = this.selectedFiles[homework.id] || [];
    if (files.length === 0) {
      this.toast.show('Alege fișierul SVG exportat din Breadbord.', 'error');
      return;
    }

    const invalidFile = files.some(file => !file.name.toLowerCase().endsWith('.svg'));
    if (invalidFile) {
      this.toast.show('Încărcați doar fișiere SVG pentru tema breadbord.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('submissionType', 'breadbord');
    files.forEach((file) => formData.append('files', file));

    this.submitting.set(true);
    this.homeworkService.submitHomework(homework.id, formData).subscribe({
      next: () => {
        this.toast.show('Tema breadbord a fost trimisă.', 'success');
        this.selectedFiles[homework.id] = [];
        this.loadHomeworks();
        this.submitting.set(false);
      },
      error: (err) => {
        console.error(err);
        if (err.status !== 401) {
          this.toast.show(err.error?.message || 'Eroare la trimiterea temei.', 'error');
        }
        this.submitting.set(false);
      }
    });
  }

  openBreadbord() {
    this.router.navigate(['/breadbord']);
  }

  formatDate(value?: string | null) {
    return value ? new Date(value).toLocaleString() : '-';
  }

  getSelectedFileNames(homeworkId: number) {
    const files = this.selectedFiles[homeworkId] || [];
    return files.map(file => file.name).join(', ');
  }
}
