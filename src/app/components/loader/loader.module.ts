import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {LoaderComponent} from "./loader.component";
import {NgPrimeModule} from "../../pages/ng-prime.module";



@NgModule({
  declarations: [LoaderComponent],
  exports:[LoaderComponent],
  imports: [
    CommonModule,
      NgPrimeModule,

  ]
})
export class LoaderModule { }
