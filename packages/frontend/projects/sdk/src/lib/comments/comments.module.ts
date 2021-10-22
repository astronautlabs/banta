import { NgModule } from '@angular/core';
import { CommentComponent } from './comment/comment.component';
import { CommentViewComponent } from './comment-view/comment-view.component';
import { BantaCommentsComponent } from './banta-comments/banta-comments.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BantaCommonModule } from '../common/common.module';
import { LiveCommentComponent } from './live-comment.component';
import { EmojiModule } from '../emoji';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TextFieldModule } from '@angular/cdk/text-field';
import { CommentFieldComponent } from './comment-field/comment-field.component';

const COMPONENTS = [
    CommentComponent,
    CommentViewComponent,
    BantaCommentsComponent,
    LiveCommentComponent,
    CommentFieldComponent
];

@NgModule({
    declarations: COMPONENTS,
    imports: [
        CommonModule,
        TextFieldModule,
        FormsModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatMenuModule,
        MatProgressSpinnerModule,
        BantaCommonModule,
        EmojiModule
    ],
    exports: COMPONENTS
})
export class CommentsModule {
}