import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuizListTeacher } from './quiz-list-teacher';

describe('QuizListTeacher', () => {
  let component: QuizListTeacher;
  let fixture: ComponentFixture<QuizListTeacher>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizListTeacher]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuizListTeacher);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
