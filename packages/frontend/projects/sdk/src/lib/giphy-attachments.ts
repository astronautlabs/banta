import { ChatMessage, ChatMessageAttachment } from "@banta/common";
import { AttachmentFragment, AttachmentResolver } from "./attachment-scraper";

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