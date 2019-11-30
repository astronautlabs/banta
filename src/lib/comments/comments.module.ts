import { NgModule } from '@angular/core';
import { CommentComponent } from './comment/comment.component';
import { CommentViewComponent } from './comment-view/comment-view.component';
import { CommentsBoxComponent } from './comments-box/comments-box.component';
import { MaterialModule } from '../../material.module';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EngageCommonModule } from '../common/common.module';

const COMPONENTS = [
    CommentComponent,
    CommentViewComponent,
    CommentsBoxComponent
];

@NgModule({
    declarations: COMPONENTS,
    imports: [
        CommonModule,
        FormsModule,
        MaterialModule,
        EngageCommonModule
    ],
    exports: COMPONENTS
})
export class CommentsModule {
}