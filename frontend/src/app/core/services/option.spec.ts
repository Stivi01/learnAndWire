import { TestBed } from '@angular/core/testing';

import { Option } from './option';

describe('Option', () => {
  let service: Option;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Option);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
