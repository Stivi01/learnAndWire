import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Module } from '../../core/services/module';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-module-form',
  imports: [CommonModule,ReactiveFormsModule],
  standalone: true,
  templateUrl: './module-form.html',
  styleUrl: './module-form.scss',
})
export class ModuleForm {
courseId!: number;
  modules: any[] = [];
  moduleForm!: FormGroup;
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private moduleService: Module,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.courseId = Number(this.route.snapshot.queryParamMap.get('courseId'));
    if (!this.courseId) {
      this.error = 'Nu s-a găsit ID-ul cursului!';
      return;
    }

    this.moduleForm = this.fb.group({
      title: ['', Validators.required],
      orderIndex: [1, [Validators.required, Validators.min(1)]],
    });

    this.loadModules();
  }

  loadModules() {
    this.loading = true;
    this.moduleService.getModulesByCourse(this.courseId).subscribe({
      next: modules => {
        this.modules = modules;
        this.loading = false;
      },
      error: err => {
        console.error(err);
        this.error = 'Nu s-au putut încărca modulele.';
        this.loading = false;
      }
    });
  }

  addModule() {
    if (this.moduleForm.invalid) return;

    const newModule = {
      ...this.moduleForm.value,
      courseId: this.courseId
    };

    this.moduleService.createModule(newModule).subscribe({
      next: module => {
        this.modules.push(module);
        this.moduleForm.reset({ orderIndex: this.modules.length + 1 });
      },
      error: err => console.error(err)
    });
  }

  editLessons(module: any) {
    this.router.navigate(['/teacher/lesson-form'], { queryParams: { moduleId: module.id } });
  }
}
