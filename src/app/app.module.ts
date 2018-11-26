import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { CustomDragDropComponent } from './custom-drag-drop/custom-drag-drop.component';
import { DraggableDirective } from './draggable.directive';
import { GridDirective } from './grid.directive';

@NgModule({
  declarations: [
    AppComponent,
    CustomDragDropComponent,
    DraggableDirective,
    GridDirective
  ],
  imports: [
    BrowserModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
