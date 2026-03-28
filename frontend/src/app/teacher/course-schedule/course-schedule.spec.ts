import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CourseSchedule } from './course-schedule';

describe('CourseSchedule', () => {
  let component: CourseSchedule;
  let fixture: ComponentFixture<CourseSchedule>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CourseSchedule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CourseSchedule);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
