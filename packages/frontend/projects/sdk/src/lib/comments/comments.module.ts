import { NgModule } from '@angular/core';
import { CommentComponent } from './comment/comment.component';
import { CommentViewComponent } from './comment-view/comment-view.component';
import { BantaCommentsComponent } from './banta-comments/banta-comments.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BantaCommonModule } from '../common';
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
import {MatTooltipModule} from '@angular/material/tooltip';
import {CommentSortComponent} from "./comment-sort/comment-sort.component";
import {MatSelectModule} from "@angular/material/select";
import { AttachmentButtonComponent } from './attachment-button/attachment-button.component';
import { BantaReplySendOptionsDirective } from './reply-send-options.directive';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { AttachmentScraperDirective } from './attachment-scraper.directive';

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
    MatProgressSpinnerModule,
    BantaCommonModule,
    EmojiModule,
    MatTooltipModule,
    MatSelectModule,
    OverlayModule,
    PortalModule
  ],
    exports: COMPONENTS
})
export class CommentsModule {
}
