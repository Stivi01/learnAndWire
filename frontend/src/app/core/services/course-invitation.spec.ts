import { TestBed } from '@angular/core/testing';

import { CourseInvitation } from './course-invitation';

describe('CourseInvitation', () => {
  let service: CourseInvitation;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CourseInvitation);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
