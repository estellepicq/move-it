import { NgModule } from '@angular/core';
import { MoveItDirective } from './move-it.directive';
import { SizeItDirective } from './size-it.directive';

@NgModule({
  imports: [
  ],
  declarations: [
    MoveItDirective,
    SizeItDirective
  ],
  exports: [
    MoveItDirective,
    SizeItDirective
  ]
})
export class MoveItModule { }
