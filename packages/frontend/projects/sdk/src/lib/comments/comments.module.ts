import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { TextFieldModule } from '@angular/cdk/text-field';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from "@angular/material/select";
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { BantaCommonModule } from '../common';
import { EmojiModule } from '../emoji';
import { AttachmentButtonComponent } from './attachment-button/attachment-button.component';
import { AttachmentScraperDirective } from './attachment-scraper.directive';
import { BantaCommentsComponent } from './banta-comments/banta-comments.component';
import { CommentFieldComponent } from './comment-field/comment-field.component';
import { CommentSortComponent } from "./comment-sort/comment-sort.component";
import { CommentViewComponent } from './comment-view/comment-view.component';
import { CommentComponent } from './comment/comment.component';
import { LiveCommentComponent } from './live-comment.component';
import { BantaReplySendOptionsDirective } from './reply-send-options.directive';

const COMPONENTS = [
    CommentComponent,
    CommentViewComponent,
    BantaCommentsComponent,
    LiveCommentComponent,
    CommentFieldComponent,
    CommentSortComponent,
    AttachmentButtonComponent,
    BantaReplySendOptionsDirective,
    AttachmentScraperDirective
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
    MatDividerModule,
    MatProgressSpinnerModule,
    BantaCommonModule,
    EmojiModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatSelectModule,
    MatRadioModule,
    OverlayModule,
    PortalModule
  ],
    exports: COMPONENTS
})
export class CommentsModule {
}
