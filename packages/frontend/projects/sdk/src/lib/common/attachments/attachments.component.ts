import { Component, Input, Output, ViewChild } from "@angular/core";
import { ChatMessageAttachment } from "@banta/common";
import { Subject } from "rxjs";
import { LightboxComponent } from "../lightbox/lightbox.component";

@Component({
    selector: 'banta-attachments',
    templateUrl: './attachments.component.html',
    styleUrls: ['./attachments.component.scss']
})
export class BantaAttachmentsComponent {
    @Input() attachments: ChatMessageAttachment[];
    @Input() editing = false;
    @ViewChild('lightbox') lightbox: LightboxComponent;
    @Output() remove = new Subject<ChatMessageAttachment>();

    removeAttachment(attachment: ChatMessageAttachment) {
        this.remove.next(attachment);
    }

    isImageAttachment(attachment: ChatMessageAttachment) {
        if (attachment.type.startsWith('image/'))
            return true;
        return false;
    }

    isCardAttachment(attachment: ChatMessageAttachment) {
        if (['card'].includes(attachment.type))
            return true;
        return false;
    }

    showLightbox(image: ChatMessageAttachment) {
        this.lightbox.open(
            image.url,
            this.attachments
                .filter(x => x.type === 'image/png')
                .map(x => x.url)
        )
    }

    get inlineAttachments() {
        return this.attachments.filter(x => x.type !== 'card' && (x.style === 'inline' || !x.style));
    }

    get blockAttachments() {
        return this.attachments.filter(x => x.style === 'block' || x.type === 'card');
    }
}