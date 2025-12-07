import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OptionForm } from './option-form';

describe('OptionForm', () => {
  let component: OptionForm;
  let fixture: ComponentFixture<OptionForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OptionForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OptionForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
