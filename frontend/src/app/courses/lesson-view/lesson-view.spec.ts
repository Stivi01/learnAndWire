import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LessonView } from './lesson-view';

describe('LessonView', () => {
  let component: LessonView;
  let fixture: ComponentFixture<LessonView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LessonView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LessonView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
