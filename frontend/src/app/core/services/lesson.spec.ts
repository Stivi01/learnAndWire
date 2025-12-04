import { TestBed } from '@angular/core/testing';

import { Lesson } from './lesson';

describe('Lesson', () => {
  let service: Lesson;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Lesson);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
