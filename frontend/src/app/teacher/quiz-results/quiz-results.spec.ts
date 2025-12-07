import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuizResults } from './quiz-results';

describe('QuizResults', () => {
  let component: QuizResults;
  let fixture: ComponentFixture<QuizResults>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizResults]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuizResults);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
