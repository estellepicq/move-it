import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { CustomDragDropComponent } from './custom-drag-drop/custom-drag-drop.component';
import { DraggableDirective } from './draggable.directive';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DashboardPageComponent } from './dashboard/dashboard-page/dashboard-page.component';

@NgModule({
  declarations: [
    AppComponent,
    CustomDragDropComponent,
    DraggableDirective,
    DashboardComponent,
    DashboardPageComponent,
  ],
  imports: [
    BrowserModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
