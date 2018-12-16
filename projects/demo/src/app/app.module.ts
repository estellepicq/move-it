import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { MoveItModule } from '../../../move-it/src/lib/move-it.module';

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
  ],
  imports: [
    BrowserModule,
    MoveItModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
