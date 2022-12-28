import { ChatMessage, ChatMessageAttachment } from '@banta/common';

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