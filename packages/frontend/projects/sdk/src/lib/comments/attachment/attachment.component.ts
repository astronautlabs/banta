import { Component, ElementRef, Output, ViewChild } from '@angular/core';
import { CDNProvider, ChatMessageAttachment } from '@banta/common';
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
  _addedAttachment = new Subject<ChatMessageAttachment>();

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
      let publicURL: string;
      
      try {
        publicURL = await this.cdnProvider.uploadImage(file);
      } catch (e) {
        console.error(`[Banta] Caught an error while uploading image to CDN:`);
        console.error(e);
        alert(`Failed to upload image. Please try again later.`);
        return;
      }

      // If no URL was returned, then an error must have occurred. Presumably the CDN
      // provider has conveyed an error to the user.
      if (!publicURL)
        return;
      
      this._addedAttachment.next({
        type: file.type,
        url: publicURL
      })
    }

  }

}
