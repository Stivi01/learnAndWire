import { TestBed } from '@angular/core/testing';

import { Module } from './module';

describe('Module', () => {
  let service: Module;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Module);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
