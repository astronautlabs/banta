import { NgModule } from '@angular/core';
import { CommentComponent } from './comment/comment.component';
import { CommentViewComponent } from './comment-view/comment-view.component';
import { CommentsBoxComponent } from './comments-box/comments-box.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EngageCommonModule } from '../common/common.module';
import { LiveCommentComponent } from './live-comment.component';
import { EmojiModule } from '../emoji';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

const COMPONENTS = [
    CommentComponent,
    CommentViewComponent,
    CommentsBoxComponent,
    LiveCommentComponent
];

@NgModule({
    declarations: COMPONENTS,
    imports: [
        CommonModule,
        FormsModule,
        MatIconModule,
        MatButtonModule,
        MatMenuModule,
        EngageCommonModule,
        EmojiModule
    ],
    exports: COMPONENTS
})
export class CommentsModule {
}