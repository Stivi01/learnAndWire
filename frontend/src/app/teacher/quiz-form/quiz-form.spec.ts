import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuizForm } from './quiz-form';

describe('QuizForm', () => {
  let component: QuizForm;
  let fixture: ComponentFixture<QuizForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuizForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
