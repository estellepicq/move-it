import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { CustomDragDropComponent } from './custom-drag-drop/custom-drag-drop.component';
import { DraggableDirective } from './draggable.directive';

@NgModule({
  declarations: [
    AppComponent,
    CustomDragDropComponent,
    DraggableDirective,
  ],
  imports: [
    BrowserModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
