import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuizData } from '../../core/models/quiz.model';
import { Quiz } from '../../core/services/quiz';
import { ActivatedRoute, Router } from '@angular/router';
import { Course, CourseItem } from '../../core/services/course';

@Component({
  selector: 'app-quiz-form',
  imports: [CommonModule,FormsModule],
  standalone: true,
  templateUrl: './quiz-form.html',
  styleUrl: './quiz-form.scss',
})
export class QuizForm {
  quizId: number | null = null;
  quiz = signal<Partial<QuizData>>({
    title: '',
    description: '',
    isPublished: false
  });

  courses = signal<CourseItem[]>([]);
  selectedCourse: CourseItem | null = null;
  loadingCourses = signal(false);

  constructor(
    private quizService: Quiz,
    private route: ActivatedRoute,
    private router: Router,
    private courseService: Course
  ) {}

  ngOnInit() {
    // Dacă există quizId în URL → edit
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.quizId = +params['id'];
        this.loadQuiz(this.quizId);
      }
    });
    this.loadCourses();
  }

  loadCourses() {
  this.loadingCourses.set(true);
  this.courseService.getMyCourses().subscribe({
    next: (data: any[]) => {
      // Mapăm datele la CourseItem
      const mapped: CourseItem[] = data.map(c => ({
        Id: c.Id ?? c.id ?? 0,
        Title: c.Title ?? c.title ?? '',
        Description: c.Description ?? c.description ?? '',
        CreatedAt: c.CreatedAt ?? c.createdAt ?? '',
        IsPublished: c.IsPublished ?? c.isPublished ?? false,
        modules: c.modules ?? []
      }));
      this.courses.set(mapped);

      if (mapped.length > 0) this.selectedCourse = mapped[0];
      this.loadingCourses.set(false);
    },
    error: (err) => {
      console.error('❌ Error loading courses for quiz:', err);
      alert('Nu s-au putut încărca cursurile profesorului.');
      this.loadingCourses.set(false);
    }
  });
}




  loadQuiz(id: number) {
    this.quizService.getQuizFull(id).subscribe({
      next: data => {
        this.quiz.set({
          title: data.quiz.Title,
          description: data.quiz.Description,
          isPublished: data.quiz.IsPublished,
        });

        // Setăm cursul selectat
        if (data.quiz.CourseId) {
          const match = this.courses().find(c => c.Id === data.quiz.CourseId);
          if (match) this.selectedCourse = match;
        }
      },
      error: err => console.error("Eroare la încărcarea quiz-ului:", err)
    });
  }

  saveQuiz() {
  const quizData = this.quiz();
  if (!quizData.title) {
    alert("Titlul quiz-ului este obligatoriu!");
    return;
  }
  if (!quizData.courseId) {
    alert("Selectează un curs!");
    return;
  }

  const payload = {
    title: quizData.title,
    description: quizData.description || '',
    courseId: quizData.courseId,
    isPublished: quizData.isPublished
  };

  if (this.quizId) {
    this.quizService.updateQuiz(this.quizId, payload).subscribe({
      next: () => {
        alert("Quiz actualizat!");
        this.router.navigate(['/teacher/quizzes']);
      },
      error: err => console.error(err)
    });
  } else {
    this.quizService.createQuiz(payload).subscribe({
      next: (res) => {
        alert("Quiz creat!");
        this.router.navigate([`/teacher/quiz/${res.id}/edit`]);
      },
      error: err => console.error("Eroare la crearea quiz-ului:", err)
    });
  }
}



  updateTitle(value: string) {
    this.quiz.update(q => ({ ...q, title: value }));
  }

  updateDescription(value: string) {
    this.quiz.update(q => ({ ...q, description: value }));
  }

  updateIsPublished(value: boolean) {
    this.quiz.update(q => ({ ...q, isPublished: value }));
  }

  updateCourse(value: number) {
    this.quiz.update(q => ({ ...q, courseId: value }));
  }

}
