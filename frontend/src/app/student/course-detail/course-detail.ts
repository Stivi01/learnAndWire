import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Course } from '../../core/services/course';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-course-detail',
  imports: [CommonModule,RouterModule],
  standalone: true,
  templateUrl: './course-detail.html',
  styleUrl: './course-detail.scss',
})
export class CourseDetail implements OnInit {
  course = signal<any | null>(null);
  loading = signal(true);
  error = signal('');
  
  // Aici vom stoca lecția pe care studentul a selectat-o pentru a o vizualiza
  selectedLesson = signal<any | null>(null);

  constructor(
    private route: ActivatedRoute,
    private courseService: Course
  ) {}

  ngOnInit() {
    // Ascultăm schimbările din URL pentru a lua ID-ul cursului
    this.route.paramMap.subscribe(params => {
      const courseId = Number(params.get('id'));
      if (courseId) {
        this.loadFullCourse(courseId);
      } else {
        this.error.set('ID-ul cursului este invalid.');
        this.loading.set(false);
      }
    });
  }

  loadFullCourse(id: number) {
    this.loading.set(true);
    
    // 👇 Aici am schimbat din getFullCourse în getStudentFullCourse 👇
    this.courseService.getStudentFullCourse(id).subscribe({
      next: (fullCourse) => {
        // Setăm modulele ca fiind deschise (expanded) implicit, pentru a vedea lecțiile
        if (fullCourse?.modules) {
          fullCourse.modules.forEach((mod: any) => mod.expanded = true);
        }
        this.course.set(fullCourse);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Eroare la încărcarea detaliilor cursului:', err);
        this.error.set('Nu am putut încărca structura cursului.');
        this.loading.set(false);
      }
    });
  }

  toggleModule(mod: any) {
    mod.expanded = !mod.expanded;
  }

  openLesson(lesson: any) {
    this.selectedLesson.set(lesson);
  }

  closeLesson() {
    this.selectedLesson.set(null);
  }
}
