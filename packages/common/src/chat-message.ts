import { User } from './user';

/**
 * State for a ChatMessage that is specific to the current user.
 * - This should not be persisted when sending messages
 * - This should be filled by the backend based on the current user when retrieving messages
 */
export interface ChatMessageUserState {
    liked? : boolean;
}

export interface ChatMessage {
    /**
     * The UUID of this message.
     */
    id? : string;

    /**
     * The user who sent this message.
     */
    user : User;

    /**
     * The topic ID of the conversation that this message 
     * is a part of.
     */
    topicId? : string;

    /**
     * The URL where this comment was sent from.
     */
    url? : string;

    /**
     * The parent message of this message, if this 
     * is a reply.
     */
    parentMessageId? : string;

    /**
     * When this message was sent.
     */
    sentAt : number;

    /**
     * When this message was last updated.
     */
    updatedAt? : number;

    /**
     * Whether this comment should be shown to users.
     * This can be set to true by moderation tooling, otherwise
     * it defaults to false.
     */
    hidden? : boolean;

    /**
     * The message content itself.
     */
    message : string;

    /**
     * Number of submessages this message has
     */
    submessageCount?: number;
    submessages? : ChatMessage[];

    /**
     * Number of upvotes this message has.
     */
    upvotes : number;

    /**
     * Information specific to the current user.
     * This information will be discarded when recording a message.
     */
    userState? : ChatMessageUserState;

    /**
     * A place to put arbitrary metadata for this message. This is used in the 
     * UI. Backends should filter this field out when persisting messages and 
     * return the field as an empty array when retrieving messages.
     */
    transientState? : Record<string,any>;
}
