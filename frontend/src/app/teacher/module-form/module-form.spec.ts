import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModuleForm } from './module-form';

describe('ModuleForm', () => {
  let component: ModuleForm;
  let fixture: ComponentFixture<ModuleForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModuleForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModuleForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
