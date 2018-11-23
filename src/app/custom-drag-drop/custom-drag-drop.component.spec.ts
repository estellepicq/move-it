import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomDragDropComponent } from './custom-drag-drop.component';

describe('CustomDragDropComponent', () => {
  let component: CustomDragDropComponent;
  let fixture: ComponentFixture<CustomDragDropComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CustomDragDropComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CustomDragDropComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
