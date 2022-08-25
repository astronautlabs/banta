import { ChatMessage, ChatMessageAttachment } from "@banta/common";
import { AttachmentFragment, AttachmentResolver } from "./attachment-scraper";

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
