import { UrlCard } from './url-card';
import { User } from './user';

export interface ChatMessageAttachment {
    type: string;
    url?: string;
    style?: 'block' | 'inline';
    card?: UrlCard;
    transientState?: Record<string,any>;
    userState?: Record<string,any>;
}

/**
 * State for a ChatMessage that is specific to the current user.
 * - This should not be persisted when sending messages
 * - This should be filled by the backend based on the current user when retrieving messages
 */
export interface ChatMessageUserState {
    liked?: boolean;
}

export interface ChatMessage {
    /**
     * The UUID of this message.
     */
    id?: string;

    /**
     * The user who sent this message.
     */
    user: User;

    /**
     * The topic ID of the conversation that this message 
     * is a part of.
     */
    topicId?: string;

    /**
     * The URL where this comment was sent from.
     */
    url?: string;

    /**
     * The parent message of this message, if this 
     * is a reply.
     */
    parentMessageId?: string;

    /**
     * When this message was sent.
     */
    sentAt: number;

    /**
     * When this message was last updated.
     */
    updatedAt?: number;

    /**
     * Whether this comment should be shown to users.
     * This can be set to true by moderation tooling as well as 
     * when the user deletes their own message. Otherwise
     * it defaults to false.
     */
    hidden?: boolean;

    /**
     * Whether this comment was deleted by the author.
     * If this is true, then `hidden` should also be true.
     */
    deleted?: boolean;

    /**
     * The message content itself.
     */
    message: string;

    /**
     * Number of submessages this message has
     */
    submessageCount?: number;
    submessages?: ChatMessage[];

    /**
     * A place to store arbitrary metadata that is not used by Banta core 
     * (ie additional functionality, plugins, or host-specific data).
     */
    metadata?: Record<string, any>;

    /**
     * Number of likes this message has.
     */
    likes: number;

    attachments?: ChatMessageAttachment[]

    /**
     * Information specific to the current user.
     * This information will be discarded when recording a message.
     */
    userState?: ChatMessageUserState;

    /**
     * A place to put arbitrary metadata for this message. This is used in the 
     * UI. Backends should filter this field out when persisting messages and 
     * return the field as an empty array when retrieving messages.
     */
    transientState?: Record<string, any>;

    /**
     * A log of the edits made to this chat message. 
     */
    edits?: ChatMessageEdit[];

    /**
     * The mentions within the text which should be linked.
     */
    mentionLinks?: ChatMessageMention[];

    pagingCursor?: string;
}

export interface ChatMessageMention {
    text: string;
    link: string;
    external: boolean;
}

export interface ChatMessageEdit {
    newText: string;
    previousText: string;
    newAttachments: ChatMessageAttachment[];
    previousAttachments: ChatMessageAttachment[];
    createdAt: number;

    /**
     * The user who edited this message, if it was not the message author themselves.
     */
    user?: User;
}
