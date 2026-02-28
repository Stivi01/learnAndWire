import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LessonEdit } from './lesson-edit';

describe('LessonEdit', () => {
  let component: LessonEdit;
  let fixture: ComponentFixture<LessonEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LessonEdit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LessonEdit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
