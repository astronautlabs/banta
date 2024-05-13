import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { NotFoundComponent } from './not-found.component';
import { SourceComponent } from './source/source.component';
import { TryComponent } from './try/try.component';
import { DevComponent } from './dev/dev.component';
import { TryChatComponent } from './try-chat/try-chat.component';

const routes: Routes = [
  { path: '',             component: HomeComponent },
  { path: 'source',       component: SourceComponent },
  { path: 'try',          component: TryComponent },
  { path: 'try-chat',          component: TryChatComponent },
  { path: 'dev',          component: DevComponent },
  { path: '**',           component: NotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
