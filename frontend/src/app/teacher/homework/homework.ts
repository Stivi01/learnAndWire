import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Course } from '../../core/services/course';
import { Homework as HomeworkService } from '../../core/services/homework';
import { ToastService } from '../../core/services/toast';
import { HomeworkItem } from '../../core/models/homework.model';
import { formatRomanianDateTime } from '../../shared/utils/date-utils';

@Component({
  selector: 'app-homework',
  imports: [CommonModule, FormsModule],
  standalone: true,
  templateUrl: './homework.html',
  styleUrl: './homework.scss',
})
export class Homework {
  private backendBaseUrl = 'http://localhost:3000';
  courses = signal<any[]>([]);
  homeworks = signal<HomeworkItem[]>([]);
  selectedHomework: HomeworkItem | null = null;
  submissions = signal<any[]>([]);
  loading = signal(false);
  selectedCourseId: number | null = null;
  title = '';
  description = '';
  homeworkType: 'classic' | 'breadbord' = 'classic';
  dueAt = '';
  maxPoints = 100;
  instructionsFile: File | null = null;

  constructor(
    private courseService: Course,
    private homeworkService: HomeworkService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.loadCourses();
    this.loadHomeworks();
  }

  loadCourses() {
    this.loading.set(true);
    this.courseService.getMyCourses().subscribe({
      next: (courses) => {
        this.courses.set(courses || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        if (err.status !== 401) {
          this.toast.show('Nu s-au putut încărca cursurile.', 'error');
        }
        this.loading.set(false);
      }
    });
  }

  loadHomeworks() {
    this.homeworkService.getTeacherHomeworks().subscribe({
      next: (data) => {
        this.homeworks.set(data || []);
      },
      error: (err) => {
        console.error(err);
        if (err.status !== 401) {
          this.toast.show('Nu s-au putut încărca temele create.', 'error');
        }
      }
    });
  }

  onFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    this.instructionsFile = target.files && target.files.length ? target.files[0] : null;
  }

  createHomework() {
    if (!this.selectedCourseId || !this.title.trim() || !this.dueAt) {
      this.toast.show('Completează titlul, materia și termenul limită.', 'error');
      return;
    }

    const course = this.courses().find(c => c.Id === this.selectedCourseId);
    if (!course) {
      this.toast.show('Materia selectată nu a fost găsită.', 'error');
      return;
    }

    if (this.homeworkType === 'breadbord' && !/IEM|METC/i.test(course.Title)) {
      this.toast.show('Tema breadbord este permisă doar pentru materii IEM sau METC.', 'error');
      return;
    }

    if (!Number.isInteger(this.maxPoints) || this.maxPoints < 1 || this.maxPoints > 1000) {
      this.toast.show('Punctajul temei trebuie să fie un număr între 1 și 1000.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('courseId', String(this.selectedCourseId));
    formData.append('title', this.title.trim());
    formData.append('type', this.homeworkType);
    formData.append('description', this.description.trim());
    formData.append('dueAt', this.dueAt);
    formData.append('maxPoints', String(this.maxPoints));

    if (this.instructionsFile) {
      formData.append('instructions', this.instructionsFile);
    }

    this.homeworkService.createHomework(formData).subscribe({
      next: () => {
        this.toast.show('Tema a fost creată cu succes.', 'success');
        this.title = '';
        this.description = '';
        this.dueAt = '';
        this.maxPoints = 100;
        this.instructionsFile = null;
        this.homeworkType = 'classic';
        this.selectedCourseId = null;
        this.loadHomeworks();
      },
      error: (err) => {
        console.error(err);
        this.toast.show(err.error?.message || 'Eroare la crearea temei.', 'error');
      }
    });
  }

  selectHomework(homework: HomeworkItem) {
    this.selectedHomework = homework;
    this.loadSubmissions(homework.id);
  }

  loadSubmissions(homeworkId: number) {
    this.homeworkService.getHomeworkSubmissions(homeworkId).subscribe({
      next: (data) => {
        const normalized = (data || []).map(item => ({
          ...item,
          _grade: item.grade ?? null,
          comments: item.comments || '',
          maxPoints: item.maxPoints ?? 100
        }));
        this.submissions.set(normalized);
      },
      error: (err) => {
        console.error(err);
        if (err.status !== 401) {
          this.toast.show('Nu s-au putut încărca submisiile.', 'error');
        }
      }
    });
  }

  gradeSubmission(submissionId: number, gradeValue: string, comments: string) {
    const grade = Number(gradeValue);
    const submission = this.submissions().find(s => s.id === submissionId);
    const maxPoints = submission.maxPoints ?? this.selectedHomework?.maxPoints ?? 100;

    if (Number.isNaN(grade) || grade < 0 || grade > maxPoints) {
      this.toast.show(`Nota trebuie să fie un număr între 0 și ${maxPoints}.`, 'error');
      return;
    }

    this.homeworkService.gradeSubmission(submissionId, { grade, comments }).subscribe({
      next: () => {
        this.toast.show('Submisia a fost notată.', 'success');
        if (this.selectedHomework) {
          this.loadSubmissions(this.selectedHomework.id);
        }
      },
      error: (err) => {
        console.error(err);
        if (err.status !== 401) {
          this.toast.show(err.error?.message || 'Eroare la notarea temei.', 'error');
        }
      }
    });
  }

  getDownloadUrl(url?: string | null) {
    if (!url) {
      return '';
    }
    return url.startsWith('http') ? url : `${this.backendBaseUrl}${url}`;
  }

  formatDate(value?: string | null) {
    return formatRomanianDateTime(value);
  }

  getCourseTitle(courseId: number) {
    const course = this.courses().find(c => c.Id === courseId);
    return course ? course.Title : 'Nespecificat';
  }
}
