import { Injectable } from "@alterior/di";
import { ChatMessage, User } from "@banta/common";
import { Subject } from "rxjs";
import * as mongodb from 'mongodb';
import * as ioredis from 'ioredis';
import IORedis from 'ioredis';
import { PubSubManager } from "./pubsub";
import { v4 as uuid } from 'uuid';

export interface ChatEvent {
    type : 'post' | 'edit' | 'like' | 'unlike' | 'delete';
}

export interface PostMessageEvent extends ChatEvent {
    type : 'post';
    message : ChatMessage;
}

export interface EditMessageEvent extends ChatEvent {
    type : 'edit';
    message : ChatMessage;
}

export interface DeleteMessageEvent extends ChatEvent {
    type : 'delete';
    message : ChatMessage;
}

export interface LikeEvent extends ChatEvent {
    type: 'like';
    message : ChatMessage;
    user: User;
}

export interface UnlikeEvent extends ChatEvent {
    type: 'unlike';
    message : ChatMessage;
    user: User;
}

export interface Like {
    messageId: string;
    userId: string;
    createdAt: number;
    liked: boolean;
}

/**
 * Information about a chat topic. These are made automatically during the operation of Banta.
 */
export interface Topic {
    // CAUTION: This object is sent directly to the client in the REST API.
    id: string;
    createdAt: number;
    description?: string;
    url?: string;
    messageCount: number;
}

export interface AuthorizableAction {
    action: 'viewTopic' | 'postMessage' | 'reply' | 'editMessage' | 'likeMessage' | 'unlikeMessage' | 'deleteMessage';

    /**
     * If true, this is a precheck: the user has not yet asked to perform the action.
     * You might want to use this to pass back a user readable error message instead of a
     * an application-readable `app-handle|...` message.
     */
    precheck?: boolean;
    topic?: Topic;
    parentMessage?: ChatMessage;
    message?: ChatMessage;
}

export type ValidateToken = (token: string) => Promise<User>;

/**
 * Should throw if user is not allowed to do something. The error will be shown to the user.
 */
export type AuthorizeAction = (user: User, token: string, action: AuthorizableAction) => void;

export interface ChatOptions {
    dbUrl?: string;
    dbName?: string;
    validateToken?: ValidateToken;
    authorizeAction?: AuthorizeAction;
}

@Injectable()
export class ChatService {
    constructor(
    ) {
        this.mongoClient = new mongodb.MongoClient(process.env.BANTA_DB_URL || process.env.MONGO_URL || 'mongodb://localhost:27017');
        this.db = this.mongoClient.db(process.env.BANTA_DB_NAME || 'banta');
        this.redis = new IORedis(Number(process.env.REDIS_PORT ?? 6379), process.env.REDIS_HOST ?? 'localhost', {
            password: process.env.REDIS_PASSWORD,
        });
        this.pubsubs = new PubSubManager(this.redis);
    }

    readonly redis: ioredis.Redis;
    readonly mongoClient: mongodb.MongoClient;
    readonly db: mongodb.Db;
    readonly pubsubs: PubSubManager;

    /**
     * Handle validation of a token sent by the client, and resolution of that token into a User object.
     * Pluggable so that particular sites can modify.
     * 
     * @param token 
     * @returns 
     */
    validateToken: ValidateToken = async (token: string) => { 
        if (process.env.IS_DEMO) {
            console.log(`[!!] Demo authentication for token '${token}'`);
            return {
                id: 'abc',
                displayName: 'Bob',
                username: 'bob',
                tag: 'El Heffe'
            }
        }
        throw new Error(`The Banta integration must specify validateToken()`); 
    };

    /**
     * Check if a user is allowed to perform a specific action or a class of actions.
     * Should be provided by the site integrating Banta. If the user is not allowed,
     * then an error should be thrown.
     */
    authorizeAction: AuthorizeAction = () => {};

    /**
     * @internal
     */
    doAuthorizeAction: AuthorizeAction = async (user: User, token: string, action: AuthorizableAction) => {
        try {
            await this.authorizeAction(user, token, action);
        } catch (e) {
            throw new Error(`permission-denied|${e.message}`);
        }
    }

    /**
     * Transform the message at the moment before it is posted or edited.
     * Any property of the message can be edited, some useful ideas:
     * - Replacing bad words
     * - Hiding at time of post (hidden = true)
     */
    transformMessage: (message: ChatMessage, action: 'post' | 'edit', previousMessage?: string) => Promise<void>;

    /**
     * Check whether authorizeAction() throws with the given arguments.
     * Provides a way to do a soft permission check.
     * 
     * @param user 
     * @param token 
     * @param action 
     * @returns 
     */
    async checkAuthorization(user: User, token: string, action: AuthorizableAction) {
        try {
            await this.doAuthorizeAction(user, token, action);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * The MongoDB `messages` collection
     */
    get messages() { return this.db.collection<ChatMessage>('messages'); }

    /**
     * The MongoDB `likes` collection
     */
    get likes() { return this.db.collection<Like>('likes'); }

    /**
     * The MongoDB `topics` collection
     */
    get topics() { return this.db.collection<Topic>('topics'); }

    private _events = new Subject<ChatEvent>();

    /**
     * Listen for events as they happen within the chat service.
     */
    get events() {
        return this._events;
    }

    /**
     * Get or create a topic with the given identifier.
     * @param id 
     * @returns 
     */
    async getOrCreateTopic(topicOrId: Topic | string): Promise<Topic> {
        if (typeof topicOrId === 'object')
            return topicOrId;
        
        let id = <string>topicOrId;
        await this.topics.updateOne({ id }, {
            $setOnInsert: {
                id,
                createdAt: Date.now()
            }
        }, { upsert: true });

        return await this.topics.findOne({ id });
    }

    /**
     * Post a new ChatMessage to a topic (or a thread)
     * @param message 
     * @returns 
     */
    async postMessage(message : ChatMessage) {
        message.id = uuid();
        message.hidden = false;

        if (!message.user || !message.user.id)
            throw new Error(`Message must include a valid user reference`);
            
        let parentMessage: ChatMessage;
        
        if (message.parentMessageId) {
            parentMessage = await this.getMessage(message.parentMessageId, false);
            if (!parentMessage)
                throw new Error(`No such parent message with ID '${message.parentMessageId}'`);
        }

        if (this.transformMessage)
            await this.transformMessage(message, 'post');

        // Definitely keeping this message at this point.

        await this.messages.insertOne(message);
        
        // Post actions
        
        if (!message.hidden)
            await this.modifyTopicMessageCount(message.topicId, +1);

        // Update the parent's submessage count, if needed

        if (parentMessage)
            await this.modifySubmessageCount(parentMessage, +1);

        this.notifyMessageChange(message);
        this._events.next(<PostMessageEvent>{ type: 'post', message });

        return message;
    }

    /**
     * Efficiently modify the `messageCount` counter on the given Topic.
     * 
     * @param messageOrId The message to modify
     * @param delta The delta to apply to the likes counter.
     * @returns 
     */
    async modifyTopicMessageCount(topicOrId: Topic | string, delta: number) {
        let topic = await this.getOrCreateTopic(topicOrId);
        topic.messageCount += delta;
        await this.topics.updateOne({ id: topic.id }, { $inc: { messageCount: delta }});
    }

    /**
     * Efficiently modify the `submessageCount` counter on the given ChatMessage.
     * 
     * @param messageOrId The message to modify
     * @param delta The delta to apply to the likes counter.
     * @returns 
     */
    async modifySubmessageCount(messageOrId: ChatMessage | string, delta: number) {
        let message = await this.getMessage(messageOrId, true);
        message.submessageCount = (message.submessageCount || 0) + delta;
        this.messages.updateOne({ id: message.id }, { $inc: { submessageCount: 1 } });
        this.notifyMessageChange(message);
    }

    /**
     * Efficiently modify the `likes` counter on the given ChatMessage.
     * 
     * @param messageOrId The message to modify
     * @param delta The delta to apply to the likes counter.
     * @returns 
     */
    async modifyMessageLikesCount(messageOrId: string | ChatMessage, delta: number) {
        let message = await this.getMessage(messageOrId, true);
        message.likes += delta;
        await this.messages.updateOne({ id: message.id }, { $inc: { likes: delta } });
        this.notifyMessageChange(message);
        return message;
    }

    /**
     * Notify all interested clients that the given message has created/updated.
     * @param message 
     */
    notifyMessageChange(message: ChatMessage) {
        this.pubsubs.publish(message.topicId, { message });
    }

    /**
     * Modify the hidden status of the given ChatMessage.
     * @param messageId 
     * @param hidden 
     * @returns 
     */
    async setMessageHiddenStatus(messageOrId: ChatMessage | string, hidden: boolean) {
        let message = await this.getMessage(messageOrId, true);
        if (message.hidden === hidden || message.deleted)
            return;
        
        // Update the message itself to reflect the new status.
        this.messages.updateOne({ id: message.id }, { $set: { hidden }});
        message.hidden = hidden;

        // Address the effect this operation will have on cached message counters.

        let affectedMessages: number;
        if (message.parentMessageId) {
            // If this is a submessage, assume that this operation affects a maximum of one message since 
            // nesting is only supported 1-level deep.
            affectedMessages = 1;

            // Update the parent message's submessage count.
            await this.modifySubmessageCount(message.parentMessageId, hidden ? -1 : 1);

            // We also need to check if the parent message is already hidden, if so then this operation 
            // does not affect the topic's message counter at all.
            let parentMessage = await this.getMessage(message.parentMessageId, false);
            let parentHidden: boolean = parentMessage ? parentMessage?.hidden : true;
            if (parentHidden)
                affectedMessages = 0;
        } else {
            // If this is a top-level message, count the visible subchildren to determine how many messages will no longer
            // be visible.
            affectedMessages = 1 + await this.countVisibleSubMessages(message.id);
        }

        // Update the topic's message counter, if necessary

        if (affectedMessages !== 0) {
            await this.modifyTopicMessageCount(
                message.topicId, 
                (hidden ? -1 : 1) * affectedMessages
            );
        }

        // Notify all listeners of the change to this method.

        this.notifyMessageChange(message);
    }

    /**
     * Count how many submessages are visible for the given message.
     * @param parentMessageId The parent message to check
     * @returns The number of actual visible submessages
     */
    async countVisibleSubMessages(parentMessageId: string): Promise<number> {
        return await this.messages.countDocuments({
            parentMessageId,
            $or: [
                { hidden: true },
                { hidden: undefined }
            ]
        })
    }

    /**
     * Edit the content of the message. No permissioning is applied here.
     * @param message 
     * @param newText 
     */
    async editMessage(messageOrId: string | ChatMessage, newText: string) {
        let message = await this.getMessage(messageOrId, true);
        let previousText = message.message;
        message.message = newText;

        if (this.transformMessage)
            this.transformMessage(message, 'edit', previousText);

        let edits = message.edits || [];
        edits.push({
            createdAt: Date.now(),
            previousText,
            newText
        });

        message.edits = edits;
        await this.messages.updateOne({ id: message.id }, {
            $set: {
                message: newText,
                edits: edits
            }
        });

        message.message = newText;
        this.pubsubs.publish(message.topicId, { message });
    }

    /**
     * Called when the author of a message is deleting a message.
     * Not to be confused with deletion for moderation, that should be done with 
     * setMessageHiddenStatus() directly. Note though that this method uses 
     * setMessageHiddenStatus() in its implementation.
     * 
     * @param messageOrId 
     */
    async deleteMessage(messageOrId: ChatMessage | string) {
        let message = await this.getMessage(messageOrId, true);
        await this.setMessageHiddenStatus(message.id, true);

        message.deleted = true;
        await this.messages.updateOne({ id: message.id }, { $set: { deleted: true }});
        
        this._events.next(<DeleteMessageEvent>{
            type: 'delete',
            message
        });
    }

    /**
     * Mark a message as liked by the given user, if it is not already liked.
     * @param message 
     * @param user 
     * @returns 
     */
    async like(message : ChatMessage, user : User) {
        if (!message)
            throw new Error(`Message cannot be null`);

        let like = await this.likes.findOne({ messageId: message.id, userId: user.id });
        if (like) 
            return;

        await this.likes.updateOne({ messageId: message.id, user: user.id }, {
            $setOnInsert: {
                liked: true,
                createdAt: Date.now(),
                messageId: message.id, 
                userId: user.id
            }
        }, { upsert: true });

        await this.modifyMessageLikesCount(message, +1);
        await this.pubsubs.publish(message.topicId, { like });
        this._events.next(<LikeEvent>{ type: 'like', message, user });
    }

    /**
     * Mark a message as not liked by a user, if it is currently liked.
     * @param message 
     * @param user 
     * @returns 
     */
    async unlike(message : ChatMessage, user : User) {
        if (!message)
            throw new Error(`Message cannot be null`);

        let like = await this.likes.findOne({ messageId: message.id, userId: user.id });
        if (!like)
            return;

        await this.likes.deleteOne({ messageId: message.id, userId: user.id });

        this.modifyMessageLikesCount(message, -1);
        this.pubsubs.publish(message.topicId, {
            like: {
                ...like,
                liked: false
            }
        });
        this._events.next(<UnlikeEvent>{ type: 'unlike', message, user });
    }

    /**
     * Get a specific message by ID.
     * @param messageOrId The ID of the message. Can also be a ChatMessage itself, for convenient calling (it will be
     *                    immediately returned)
     * @param throwIfMissing If true, throw an error if the message could not be found. Otherwise returns null.
     * @returns 
     */
    async getMessage(messageOrId: ChatMessage | string, throwIfMissing = false) {
        if (typeof messageOrId !== 'string')
            return messageOrId;

        let id = <string>messageOrId;
        let message = await this.messages.findOne({ id });

        if (throwIfMissing && !message)
            throw new Error(`No such message with ID '${id}'`);
        
        return message;
    }

    /**
     * Get a topic by ID.
     * @param topicOrId The ID of the topic. Can also be a Topic itself, for convenient calling (it will be 
     *                  immediately returned)
     * @param throwIfMissing If true, throw an error if the message could not be found. Otherwise returns null.
     * @returns 
     */
    async getTopic(topicOrId: string | Topic, throwIfMissing = false) {
        if (typeof topicOrId !== 'string')
            return topicOrId;

        let id = <string>topicOrId;
        let topic = await this.topics.findOne({ id });
        
        if (throwIfMissing && !topic)
            throw new Error(`No such topic with ID '${id}'`);
        
        return topic;
    }
}