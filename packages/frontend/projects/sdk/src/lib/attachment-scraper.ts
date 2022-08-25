import { ComponentType } from '@angular/cdk/portal';
import { Injectable } from '@angular/core';
import { ChatMessage, ChatMessageAttachment } from '@banta/common';
import { ChatBackendBase } from './chat-backend-base';

export interface AttachmentFragment {
    text: string;
    offset: number;
    type: string;
}

export interface AttachmentScraper {
    findFragments(message: ChatMessage): AttachmentFragment[];
}

export interface AttachmentResolver {
    resolveFragment(message: ChatMessage, fragment: AttachmentFragment): Promise<ChatMessageAttachment>;
}

export interface AttachmentRenderer {
    attachment: ChatMessageAttachment;
}

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

export class GiphyAttachmentResolver implements AttachmentResolver {
    async resolveFragment(message: ChatMessage, fragment: AttachmentFragment): Promise<ChatMessageAttachment> {
        if (fragment.type === 'url' && fragment.text.startsWith('https://giphy.com/gifs')) {
            let gifId = /[^-\/]+$/.exec(fragment.text)?.toString();
            if (!gifId)
                return null;

            return {
                type: 'iframe',
                url: `https://giphy.com/embed/${gifId}`,
                style: 'inline'
            };
        }

        return null;
    }
}

export class YouTubeAttachmentResolver implements AttachmentResolver {
    async resolveFragment(message: ChatMessage, fragment: AttachmentFragment): Promise<ChatMessageAttachment> {
        if (fragment.type !== 'url')
            return null;

        let videoId: string;

        if (fragment.text.match(/https?:\/\/(www\.)?youtube.com\/watch\?v=/)) {
            let match = /watch\?v=([^&]+)/.exec(fragment.text);
            if (match) {
                videoId = match[1];
            }
        }

        if (videoId) {
            return {
                type: 'iframe',
                url: `https://www.youtube.com/embed/${videoId}`,
                style: 'block'
            };
        }
        return null;
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