import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LessonResource } from './lesson-resource';

describe('LessonResource', () => {
  let component: LessonResource;
  let fixture: ComponentFixture<LessonResource>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LessonResource]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LessonResource);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
