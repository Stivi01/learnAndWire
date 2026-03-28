import { TestBed } from '@angular/core/testing';

import { CourseSchedules } from './course-schedules';

describe('CourseSchedules', () => {
  let service: CourseSchedules;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CourseSchedules);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
