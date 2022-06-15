import { Component, ElementRef, Output, ViewChild } from '@angular/core';
import { CDNProvider, ChatMessageAttachments } from '@banta/common';
import { Subject } from 'rxjs';

@Component({
  selector: 'comment-attachments',
  templateUrl: './attachment.component.html',
  styleUrls: ['./attachment.component.css']
})
export class AttachmentComponent {

  constructor(
    private cdnProvider: CDNProvider,
  ) { }

  @ViewChild('fileUpload', { static: false }) fileInput: ElementRef;
  _addedAttachment = new Subject<ChatMessageAttachments>();

  @Output()
  get addedAttachment() {
    return this._addedAttachment.asObservable();
  }

  show() {
    (this.fileInput.nativeElement as HTMLInputElement).click();
  }

  async fileChange(event: Event): Promise<void> {
    const element = (event.currentTarget as HTMLInputElement);
    if (element.files.length) {
      console.log('[Banta] File Added to comment');
      const file = element.files[0];
      const publicURL = await this.cdnProvider.uploadImage(file);
      this._addedAttachment.next({
        type: file.type,
        url: publicURL
      })
    }

  }

}
