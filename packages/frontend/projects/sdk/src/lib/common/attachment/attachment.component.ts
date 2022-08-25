import { Component, HostBinding, Input, Output } from "@angular/core";
import { ChatMessageAttachment } from "@banta/common";
import { Subject } from "rxjs";

@Component({
    selector: 'banta-attachment',
    templateUrl: './attachment.component.html',
    styleUrls: ['./attachment.component.scss']
})
export class BantaAttachmentComponent {
    @Input() attachment: ChatMessageAttachment;
    @Input() loading = false;
    @Input() editing = false;
    @Input() loadingMessage: string = 'Please wait...';
    @Input() error = false;
    @Input() errorMessage: string = 'An error has occurred';
    @Output() removed = new Subject<void>();
    @Output() activated = new Subject<void>();
    activate() {
        this.activated.next();
    }

    remove() {
        this.removed.next();
    }

    get isError() {
        return this.error || this.attachment?.transientState?.error;
    }

    get theErrorMessage() {
        return this.errorMessage || this.attachment?.transientState?.errorMessage;
    }

    @HostBinding('class.loading')
    get isLoading() {
        return this.loading || !this.attachment || this.attachment.transientState?.loading || !this.attachment.url;
    }

    get isImageAttachment() {
        if (this.attachment.type.startsWith('image/'))
            return true;
        return false;
    }
}