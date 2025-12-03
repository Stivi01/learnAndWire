import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResourcesForm } from './resources-form';

describe('ResourcesForm', () => {
  let component: ResourcesForm;
  let fixture: ComponentFixture<ResourcesForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResourcesForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResourcesForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
