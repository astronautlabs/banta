import { Component, ElementRef, Input, Output, ViewChild } from '@angular/core';
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

    //#region Properties

    private _addedAttachment = new Subject<ChatMessageAttachment>();
    private _attachmentError = new Subject<ChatMessageAttachment>();

    //#endregion
    //#region Inputs

    @Input() disabled = false;

    //#endregion
    //#region Outputs

    @Output() get addedAttachment() { return this._addedAttachment.asObservable(); }
    @Output() get attachmentError() { return this._attachmentError.asObservable(); }

    //#endregion
    //#region UI Bindings

    @ViewChild('fileUpload', { static: false }) fileInput: ElementRef<HTMLInputElement>;

    //#endregion

    show() { this.fileInput.nativeElement.click(); }

    async fileChange(event: Event): Promise<void> {
        const element = (event.currentTarget as HTMLInputElement);
        if (element.files.length) {
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
                alert(e.message);

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