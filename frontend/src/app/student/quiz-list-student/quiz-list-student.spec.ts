import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuizListStudent } from './quiz-list-student';

describe('QuizListStudent', () => {
  let component: QuizListStudent;
  let fixture: ComponentFixture<QuizListStudent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizListStudent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuizListStudent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
