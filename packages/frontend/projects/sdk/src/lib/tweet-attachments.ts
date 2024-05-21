import { ChatMessage, ChatMessageAttachment } from "@banta/common";
import { AttachmentFragment, AttachmentResolver } from "./attachment-scraper";

export class TweetAttachmentResolver implements AttachmentResolver {
    async resolveFragment(message: ChatMessage, fragment: AttachmentFragment): Promise<ChatMessageAttachment> {
        if (fragment.type === 'url' && (fragment.text.startsWith('https://twitter.com/') || fragment.text.startsWith('https://x.com/'))) {
            return {
                type: 'tweet',
                url: fragment.text,
                style: 'block'
            };
        }

        return null;
    }
}