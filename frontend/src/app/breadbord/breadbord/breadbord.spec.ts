import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Breadbord } from './breadbord';

describe('Breadbord', () => {
  let component: Breadbord;
  let fixture: ComponentFixture<Breadbord>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Breadbord]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Breadbord);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
