import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DragDropSandboxComponent } from './drag-drop-sandbox.component';

describe('DragDropSandboxComponent', () => {
  let component: DragDropSandboxComponent;
  let fixture: ComponentFixture<DragDropSandboxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DragDropSandboxComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DragDropSandboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
