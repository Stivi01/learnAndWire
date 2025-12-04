import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyClassesStudent } from './my-classes-student';

describe('MyClassesStudent', () => {
  let component: MyClassesStudent;
  let fixture: ComponentFixture<MyClassesStudent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyClassesStudent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyClassesStudent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
