import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { NotFoundComponent } from './not-found.component';
import { SourceComponent } from './source/source.component';
import { TryComponent } from './try/try.component';
import { DemoComponent } from './demo.component';
import { FeaturesComponent, PricingComponent } from '@astronautlabs/chassis';

const routes: Routes = [
  { path: '',             component: HomeComponent },
  { path: 'features',     component: FeaturesComponent },
  { path: 'pricing',      component: PricingComponent },
  { path: 'demo/:name',   component: DemoComponent },
  { path: 'source',       component: SourceComponent },
  { path: 'try',          component: TryComponent },
  { path: '**',           component: NotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }