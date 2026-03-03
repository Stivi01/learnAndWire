import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentListTeacher } from './student-list-teacher';

describe('StudentListTeacher', () => {
  let component: StudentListTeacher;
  let fixture: ComponentFixture<StudentListTeacher>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentListTeacher]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentListTeacher);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
