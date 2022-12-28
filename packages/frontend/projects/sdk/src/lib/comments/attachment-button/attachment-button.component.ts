import { Component, ElementRef, Output, ViewChild } from '@angular/core';
import { CDNProvider, ChatMessageAttachment } from '@banta/common';
import { Subject } from 'rxjs';

@Component({
  selector: 'banta-attachment-button',
  templateUrl: './attachment-button.component.html',
  styleUrls: ['./attachment-button.component.scss']
})
export class AttachmentButtonComponent {

  constructor(
    private cdnProvider: CDNProvider,
  ) {
  }

  private _addedAttachment = new Subject<ChatMessageAttachment>();
  private _attachmentError = new Subject<ChatMessageAttachment>();

  @ViewChild('fileUpload', { static: false }) fileInput: ElementRef;

  @Output() get addedAttachment() { return this._addedAttachment.asObservable(); }
  @Output() get attachmentError() { return this._attachmentError.asObservable(); }

  show() {
    (this.fileInput.nativeElement as HTMLInputElement).click();
  }

  async fileChange(event: Event): Promise<void> {
    const element = (event.currentTarget as HTMLInputElement);
    if (element.files.length) {
      console.log('[Banta] File Added to comment');
      const file = element.files[0];
      let publicURL: string;
      
      let attachment: ChatMessageAttachment = {
        type: file.type,
        url: undefined,
        transientState: {
          uploading: true,
          error: false,
          errorMessage: undefined
        }
      }

      this._addedAttachment.next(attachment);

      try {
        publicURL = await this.cdnProvider.uploadImage(file);
      } catch (e) {
        attachment.transientState.error = true;
        attachment.transientState.errorMessage = "Failed to upload";

        console.error(`[Banta] Caught an error while uploading image to CDN:`);
        console.error(e);
        alert(`Failed to upload image. Please try again later.`);

        this._attachmentError.next(attachment);
        return;
      }

      // If no URL was returned, then an error must have occurred. Presumably the CDN
      // provider has conveyed an error to the user.
      if (!publicURL)
        return;
      
      attachment.url = publicURL;
      attachment.transientState = undefined;
    }

  }

}
