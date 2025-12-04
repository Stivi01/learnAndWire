import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Course } from '../../core/services/course';
import { AuthService } from '../../core/services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-course-form',
  imports: [ReactiveFormsModule],
  standalone: true,
  templateUrl: './course-form.html',
  styleUrl: './course-form.scss',
})
export class CourseForm implements OnInit{
  courseForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private courseService: Course,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.courseForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      thumbnailUrl: [''],
      isPublished: [false]
    });
  }

  onSubmit() {
    if (this.courseForm.invalid) return;

    const token = this.authService.getToken(); // preia token din localStorage

    const headers = {
      Authorization: `Bearer ${token}`
    };

    const userId = this.authService.currentUserValue?.id;

    const courseData = {
      ...this.courseForm.value,
      createdBy: userId
    };

    this.courseService.createCourse(courseData, headers).subscribe({
      next: (res) => {
        const courseId = res.id;
        alert('Curs creat cu succes!');
        this.router.navigate(['/teacher/module-form'], {
            queryParams: { courseId }
  });      },
      error: (err) => {
        console.error(err);
        alert('Eroare la crearea cursului.');
      }
    });
  }
}
