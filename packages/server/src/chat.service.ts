import { Injectable } from "@alterior/di";
import { ChatMessage, User } from "@banta/common";
import { Subject } from "rxjs";
import * as mongodb from 'mongodb';
import * as ioredis from 'ioredis';
import IORedis from 'ioredis';
import { PubSubManager } from "./pubsub";
import { v4 as uuid } from 'uuid';

export interface ChatEvent {
    type : 'post' | 'edit' | 'upvote';
}

export interface PostMessageEvent extends ChatEvent {
    type : 'post';
    message : ChatMessage;
}

export interface EditMessageEvent extends ChatEvent {
    type : 'edit';
    message : ChatMessage;
}

export interface UpvoteEvent extends ChatEvent {
    type: 'upvote';
    message : ChatMessage;
    user: User;
}

export interface Like {
    messageId: string;
    userId: string;
    createdAt: number;
    liked: boolean;
}

export interface Topic {
    id: string;
    createdAt: number;
    description?: string;
    url?: string;
    messageCount: number;
}

export interface AuthorizableAction {
    action: 'viewTopic' | 'postMessage' | 'reply' | 'editMessage' | 'likeMessage' | 'unlikeMessage';
    topic?: Topic;
    parentMessage?: ChatMessage;
    message?: ChatMessage;
}

export type ValidateToken = (token: string) => User;

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

    validateToken: ValidateToken = (token: string) => { 
        if (process.env.IS_DEMO) {
            console.log(`[!!] Demo authentication for token '${token}'`);
            return {
                id: 'abc',
                displayName: 'Bob',
                username: 'bob'
            }
        }
        throw new Error(`The Banta integration must specify validateToken()`); 
    };

    authorizeAction: AuthorizeAction = () => {};

    /**
     * Transform the message at the moment before it is posted or edited.
     * Any property of the message can be edited, some useful ideas:
     * - Replacing bad words
     * - Hiding at time of post (hidden = true)
     */
    transformMessage: (message: ChatMessage, action: 'post' | 'edit', previousMessage?: string) => void;

    checkAuthorization(user: User, token: string, action: AuthorizableAction) {
        try {
            this.authorizeAction(user, token, action);
            return true;
        } catch (e) {
            return false;
        }
    }

    get messages() { return this.db.collection<ChatMessage>('messages'); }
    get likes() { return this.db.collection<Like>('likes'); }
    get topics() { return this.db.collection<Topic>('topics'); }

    private _events = new Subject<ChatEvent>();

    get events() {
        return this._events;
    }

    async getOrCreateTopic(id: string) {
        await this.topics.updateOne({ id }, {
            $setOnInsert: {
                id,
                createdAt: Date.now()
            }
        }, { upsert: true });

        return await this.topics.findOne({ id });
    }

    async postMessage(message : ChatMessage) {
        message.id = uuid();
        message.hidden = false;

        if (!message.user || !message.user.id)
            throw new Error(`Message must include a valid user reference`);
            
        let parentMessage: ChatMessage;
        
        if (message.parentMessageId) {
            parentMessage = await this.getMessage(message.parentMessageId);
            if (!parentMessage)
                throw new Error(`No such parent message with ID '${message.parentMessageId}'`);
        }

        // Definitely keeping this message at this point.

        if (this.transformMessage)
            this.transformMessage(message, 'post');

        await this.messages.insertOne(message);
        this._events.next(<PostMessageEvent>{ type: 'post', message });

        if (parentMessage) {
            parentMessage.submessageCount = (parentMessage.submessageCount || 0) + 1;
            this.messages.updateOne({ id: parentMessage.id }, { $inc: { submessageCount: 1 } });
            this.pubsubs.publish(message.topicId, { message: parentMessage });
        }
        this.pubsubs.publish(message.topicId, { message });
        
        return message;
    }

    async editMessage(message: ChatMessage, newText: string) {
        let previousMessage = message.message;
        message.message = newText;

        if (this.transformMessage)
            this.transformMessage(message, 'edit', previousMessage);

        await this.messages.updateOne({ id: message.id }, {
            $set: {
                message: newText
            }
        });

        message.message = newText;
        this.pubsubs.publish(message.topicId, { message });
    }

    async like(message : ChatMessage, user : User) {
        if (!message)
            throw new Error(`Message cannot be null`);

        let like = await this.likes.findOne({ messageId: message.id, userId: user.id });
        if (like) 
            return;

        message.likes += 1;
        await this.messages.updateOne({ id: message.id }, { $inc: { likes: 1 } });
        this.pubsubs.publish(message.topicId, { message });

        console.log(`Saving a new like!`);
        await this.likes.updateOne({ messageId: message.id, user: user.id }, {
            $setOnInsert: {
                liked: true,
                createdAt: Date.now(),
                messageId: message.id, 
                userId: user.id
            }
        }, { upsert: true });
        
        this._events.next(<UpvoteEvent>{ type: 'upvote', message, user });
        this.pubsubs.publish(message.topicId, { like });
    }

    async unlike(message : ChatMessage, user : User) {
        if (!message)
            throw new Error(`Message cannot be null`);

        let like = await this.likes.findOne({ messageId: message.id, userId: user.id });
        if (!like)
            return;

        await this.likes.deleteOne({ messageId: message.id, userId: user.id });

        message.likes -= 1;
        await this.messages.updateOne({ id: message.id }, { $inc: { likes: -1 } });
        this.pubsubs.publish(message.topicId, { message });

        this._events.next(<UpvoteEvent>{ type: 'upvote', message, user });
        this.pubsubs.publish(message.topicId, {
            like: {
                ...like,
                liked: false
            }
        })
    }

    async getMessage(id: string) {
        return await this.messages.findOne({ id });
    }

    async getTopic(id: string) {
        return await this.topics.findOne({ id });
    }
}