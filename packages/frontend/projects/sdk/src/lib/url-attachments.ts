import { Injectable } from "@angular/core";
import { ChatMessage, ChatMessageAttachment } from "@banta/common";
import { AttachmentFragment, AttachmentResolver, AttachmentScraper } from "./attachment-scraper";
import { ChatBackendBase } from "./chat-backend-base";

const URL_REGEX = new RegExp('(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?', 'ig');

export class UrlAttachmentScraper implements AttachmentScraper {
    findFragments(message: ChatMessage): AttachmentFragment[] {
        // If a message already has a URL attachment, don't add another one.
        if (message.attachments && message.attachments.filter(x => x.type === 'url').length > 0)
            return null;

        return (Array.from(message.message.match(URL_REGEX) ?? []))
            .reduce((a, item) => (a.includes(item) ? undefined : a.push(item), a), [])
            .map(url => ({ 
                text: url, 
                offset: message.message.indexOf(url),
                type: 'url'
            }))
        ;
    }
}

@Injectable()
export class UrlAttachmentResolver implements AttachmentResolver {
    constructor(private backend: ChatBackendBase) {
    }

    async resolveFragment(message: ChatMessage, fragment: AttachmentFragment): Promise<ChatMessageAttachment> {
        if (fragment.type !== 'url')
            return null;

        let urlCard = await this.backend.getCardForUrl(fragment.text);
        if (urlCard) {
            return {
                type: 'card',
                url: fragment.text,
                card: urlCard,
                style: 'block'
            }
        }
    }

}