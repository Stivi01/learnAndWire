import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuizManager } from './quiz-manager';

describe('QuizManager', () => {
  let component: QuizManager;
  let fixture: ComponentFixture<QuizManager>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizManager]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuizManager);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
