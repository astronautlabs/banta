import { Component, ElementRef, HostBinding, Input, Output } from "@angular/core";
import { ChatMessageAttachment } from "@banta/common";
import { Subject } from "rxjs";

let TWITTER_LOADED = false;

@Component({
    selector: 'banta-attachment',
    templateUrl: './attachment.component.html',
    styleUrls: ['./attachment.component.scss']
})
export class BantaAttachmentComponent {
    constructor(
        private elementRef: ElementRef<HTMLElement>
    ) {

    }

    private _attachment: ChatMessageAttachment;
    @Input() get attachment() { return this._attachment; }
    set attachment(value) {
        this._attachment = value;
        this.checkLoad();
        this.loadPlatformSpecific();
    }
    
    @Input() loading = false;
    @Input() editing = false;
    @Input() loadingMessage: string = 'Please wait...';
    @Input() error = false;
    @Input() errorMessage: string = 'An error has occurred';
    @Output() removed = new Subject<void>();
    @Output() activated = new Subject<void>();
    @Output() loaded = new Subject<void>();

    private _viewLoaded = false;
    ngAfterViewInit() {
        this._viewLoaded = true;
        this.checkLoad();
    }

    private loadTwitterWidgets() {
        if (typeof window !== 'undefined')
            window['twttr']?.widgets.load();
    }

    private loadPlatformSpecific() {
        if (typeof window === 'undefined')
            return;
        
        if (this._attachment?.type === 'tweet') {
            if (!TWITTER_LOADED && document.querySelector('script[src="https://platform.twitter.com/widgets.js"]'))
                TWITTER_LOADED = true;

            if (typeof window !== 'undefined' && !TWITTER_LOADED) {
                TWITTER_LOADED = true;
                let script = document.createElement('script');
                script.src = 'https://platform.twitter.com/widgets.js';
                script.async = true;
                script.addEventListener('load', () => setTimeout(() => this.loadTwitterWidgets()));
                document.body.appendChild(script);
            } else {
                setTimeout(() => this.loadTwitterWidgets());
            }
        }
    }

    private checkLoad() {
        if (!this._attachment || !this._viewLoaded || !this.elementRef?.nativeElement)
            return;

        if (typeof window === 'undefined')
            this.loaded.next();
        else
            setTimeout(() => this.loaded.next(), 250);
    }

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
        return this.editing && (
            this.loading || !this.attachment || this.attachment.transientState?.loading 
            || !this.attachment.url
        );
    }

    get isImageAttachment() {
        return this.attachment?.type?.startsWith('image/');
    }

    get hasFrame() {
        if (!this.attachment)
            return false;

        return this.attachment.type === 'iframe' || (
            this.attachment.type === 'card' 
            && this.attachment.card?.player
        );
    }

    get frameUrl() {
        if (!this.attachment)
            return undefined;
        
        if (this.attachment.type === 'iframe') {
            return this.attachment.url;
        } else if (this.attachment.type === 'card') {
            return this.attachment.card.player;
        }
    }
}