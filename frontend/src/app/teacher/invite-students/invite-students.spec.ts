import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InviteStudents } from './invite-students';

describe('InviteStudents', () => {
  let component: InviteStudents;
  let fixture: ComponentFixture<InviteStudents>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InviteStudents]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InviteStudents);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
