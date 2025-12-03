import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LessonProgress } from './lesson-progress';

describe('LessonProgress', () => {
  let component: LessonProgress;
  let fixture: ComponentFixture<LessonProgress>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LessonProgress]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LessonProgress);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
