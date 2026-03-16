import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeacherCalendar } from './teacher-calendar';

describe('TeacherCalendar', () => {
  let component: TeacherCalendar;
  let fixture: ComponentFixture<TeacherCalendar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherCalendar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeacherCalendar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
