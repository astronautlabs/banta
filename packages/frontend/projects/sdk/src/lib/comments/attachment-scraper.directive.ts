import { Directive, ElementRef, Input, Output } from "@angular/core";
import { ChatMessage, ChatMessageAttachment } from "@banta/common";
import { Subject } from "rxjs";
import { AttachmentFragment } from "../attachment-scraper";
import { ChatBackendBase } from "../chat-backend-base";

interface AttachmentFragmentState {
    fragment: AttachmentFragment;
    resolution: Promise<ChatMessageAttachment>;
}

@Directive({
    selector: '[attachmentScraper]'
})
export class AttachmentScraperDirective {
    constructor(
        private elementRef: ElementRef<HTMLTextAreaElement>,
        private chatBackend: ChatBackendBase
    ) {
    }

    @Input() attachments: ChatMessageAttachment[] = [];
    @Output() attachmentsChange = new Subject<ChatMessageAttachment[]>();
    ngOnInit() {
        if (typeof window === 'undefined')
            return;
        
        this.element.addEventListener('keydown', () => {
            clearTimeout(this.scrapeTimeout);
            this.scrapeTimeout = setTimeout(() => this.scrape(), this.scrapeDebounce);
        });
    }

    get element() {
        return this.elementRef?.nativeElement;
    }

    get text() {
        return this.element.value;
    }


    private scrapeTimeout;
    private scrapeDebounce = 1500;
    private fragments = new Map<string, AttachmentFragmentState>();
    private scrape() {
        let message: ChatMessage = {
            likes: 0,
            message: this.text,
            sentAt: undefined,
            user: null,
            attachments: this.attachments
        };

        let foundFragments: string[] = [];

        for (let scraper of this.chatBackend.attachmentScrapers) {
            let fragments = scraper.findFragments(message);
            if (!fragments) {
                console.error(`Attachment fragment scraper ${scraper.constructor.name} is implemented incorrectly: Returned null instead of array`);
                continue;
            }
            for (let fragment of fragments) {
                foundFragments.push(fragment.text);
                if (!this.fragments.has(fragment.text)) {
                    this.fragments.set(fragment.text, {
                        fragment,
                        resolution: undefined
                    });
                }
            }
        }

        // Remove fragments that are no longer in the message.
        let removedFragments: string[] = [];
        for (let [key] of this.fragments) {
            if (!foundFragments.includes(key))
                removedFragments.push(key);
        }
        for (let removedFragment of removedFragments) {
            this.fragments.delete(removedFragment);
        }

        // Process any fragments that are not yet resolved (or being 
        // resolved)

        for (let [key, state] of this.fragments) {
            if (state.resolution)
                continue;

            state.resolution = new Promise(async (resolve, reject) => {
                for (let resolver of this.chatBackend.attachmentResolvers) {
                    try {
                        let attachment = await resolver.resolveFragment(message, state.fragment);
                        if (attachment) {
                            console.dir(attachment);
                            this.attachments.push(attachment);
                            this.attachmentsChange.next(this.attachments.slice());
                            resolve(attachment);
                            break;
                        }
                    } catch (e) {
                        console.error(`Caught error during attachment resolver ${resolver.constructor.name}:`);
                        console.error(e);
                        continue;
                    }
                }
            });
        }
    }

}