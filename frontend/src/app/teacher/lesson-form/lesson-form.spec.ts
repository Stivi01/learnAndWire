import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LessonForm } from './lesson-form';

describe('LessonForm', () => {
  let component: LessonForm;
  let fixture: ComponentFixture<LessonForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LessonForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LessonForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
