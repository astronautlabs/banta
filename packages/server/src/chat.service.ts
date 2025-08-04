import { inject, Injectable } from "@alterior/di";
import { Logger } from '@alterior/logging';
import { RolesService } from "@alterior/runtime";
import { ChatMessage, CommentsOrder, FilterMode, Topic, UrlCard, User } from "@banta/common";
import { JSDOM } from 'jsdom';
import { Subject } from "rxjs";
import { v4 as uuid } from 'uuid';
import { Cache } from "./cache";
import { InterServerCommunications } from "./inter-server-communications";

import createDOMPurify from 'dompurify';
import IORedis from 'ioredis';
import sanitizeHtml from 'sanitize-html';

import * as ioredis from 'ioredis';
import * as mongodb from 'mongodb';

export interface ChatEvent {
    type: 'post' | 'edit' | 'like' | 'unlike' | 'delete' | 'pin' | 'unpin';
}

export interface PostMessageEvent extends ChatEvent {
    type: 'post';
    message: ChatMessage;
}

export interface EditMessageEvent extends ChatEvent {
    type: 'edit';
    message: ChatMessage;
}

export interface PinMessageEvent extends ChatEvent {
    type: 'pin';
    message: ChatMessage;
}

export interface UnpinMessageEvent extends ChatEvent {
    type: 'unpin';
    message: ChatMessage;
}

export interface PinOptions {
    until?: number;
}

interface RecentMessagesCache {
    newest: ChatMessage[];
    ids: Set<string>;
}

export interface MessageQuery {
    topicId: string;
    parentMessageId?: string;
    sort?: CommentsOrder;
    filter?: FilterMode;
    offset?: number;
    limit?: number;
    userId?: string;
    pinned?: boolean;
}

const DEFAULT_COOLOFF_PERIOD = 10 * 1000;

export interface DeleteMessageEvent extends ChatEvent {
    type: 'delete';
    message: ChatMessage;
}

export interface LikeEvent extends ChatEvent {
    type: 'like';
    message: ChatMessage;
    user: User;
}

export interface UnlikeEvent extends ChatEvent {
    type: 'unlike';
    message: ChatMessage;
    user: User;
}

export interface Like {
    messageId: string;
    userId: string;
    createdAt: number;
    liked: boolean;
}

export interface PersistedUrlCard {
    url: string;
    retrievedAt: number;
    statusCode: number;
    requestDuration: number;
    card: UrlCard;
}

export interface AuthorizableAction {
    action: 'viewTopic' | 'postMessage' | 'reply' | 'editMessage' | 'likeMessage' | 'unlikeMessage' | 'deleteMessage' | 'pinMessage' | 'unpinMessage';

    /**
     * If true, this is a precheck: the user has not yet asked to perform the action.
     * You might want to use this to pass back a user readable error message instead of a
     * an application-readable `app-handle|...` message.
     */
    precheck?: boolean;
    topic?: Topic;
    parentMessage?: ChatMessage;
    message?: ChatMessage;

    /**
     * Information provided by the client via the subscribeToTopic() call. This is ignored by Banta.
     * It can be used to pass arbitrary context information about the client into a pluggable authorizdation
     * handler provided by the end application.
     */
    connectionMetadata?: Record<string, any>;
}

export type ValidateToken = (token: string) => Promise<User>;

/**
 * Should throw UnauthorizedError if user is not allowed to do something. The error will be shown to the user.
 */
export type AuthorizeAction = (user: User, token: string, action: AuthorizableAction) => void;

export interface ChatOptions {
    dbUrl?: string;
    dbName?: string;
    validateToken?: ValidateToken;
    authorizeAction?: AuthorizeAction;
}

/**
 * Represents a URL origin that we have fetched from (for URL resolution).
 * We need to keep track of this to implement polite link fetching.
 */
export interface UrlOrigin {
    origin: string;
    lastFetchedAt: string;
    lastFetchedUrl: string;
    lastFetchedStatusCode: number;

    cooloffPeriodMS: number;
}

/**
 * A function which scans the content of the given message and populates the mentionLinks attribute of that 
 * message.
 */
export type MentionExtractor = (message: ChatMessage) => Promise<void>;

/**
 * For use with the extractMentions option of ChatService, this simple mention linker 
 * will locate all "@" username references, call the passed linker function in order to 
 * determine URLs for those usernames, and populate mentionLinks with the result. If 
 * your platform requires more complex behavior (such as checking if the user exists
 * before creating the mention link), then you should implement your own mention 
 * linker from scratch.
 * 
 * @param linker A function which produces a URL for a given username (ie the profile page URL for the user or so)
 * @returns 
 */
export const simpleMentionExtractor = (linker: (username: string) => string): MentionExtractor => {
    return async (message: ChatMessage) => {
        message.mentionLinks =
            Array.from(message.message.match(/@[A-Za-z0-9-]+/g) ?? [])
                .map(un => un.slice(1))
                .reduce((uniq, username) => uniq.concat(uniq.includes(username) ? [] : [username]), [])
                .map(un => ({ text: `@${un}`, link: linker(un), external: true }))
            ;
    };
}

export interface ChatServerEvent {
    type: 'create' | 'update';
    originId: string;
    topicId: string;
    message?: ChatMessage;
    like?: Like;
}

export class UnauthorizedError extends Error {
}

@Injectable()
export class ChatService {
    private logger = inject(Logger);
    private roles = inject(RolesService);

    originId = uuid();

    constructor() {
        this.roles.registerRole({
            identifier: 'banta-chat',
            name: 'Banta Chat Services',
            summary: 'Acts as a Banta Chat Services cluster member',
            enabledByDefault: true,
            start: async () => this.start(),
            stop: async () => this.stop()
        })
    }

    private running = false;

    private start() {
        this.running = true;
        this.mongoClient = new mongodb.MongoClient(process.env.BANTA_DB_URL || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017');
        this.mongoClient.addListener('topologyClosed', () => {
            Logger.current.error(`MongoDB topology was closed. Exiting.`);
            process.exit(1);
        });
        this.mongoClient.addListener('error', ev => {
            Logger.current.error(`Exiting due to MongoDB error: ${ev.message}. Cause: ${String(ev.cause)}`);
            process.exit(1);
        });
        this.mongoClient.addListener('commandFailed', ev => {
            Logger.current.error(`Exiting due to MongoDB commandFailed: ${ev.failure.message}. Command: ${String(ev.commandName)}`);
            process.exit(1);
        });
        this.mongoClient.addListener('timeout', ev => {
            Logger.current.error(`Exiting due to MongoDB timeout: ${ev.failure.message}. Command: ${String(ev.commandName)}`);
            process.exit(1);
        });

        this.db = this.mongoClient.db(process.env.BANTA_DB_NAME || 'banta');

        this.redis = new IORedis(Number(process.env.REDIS_PORT ?? 6379), process.env.REDIS_HOST ?? 'localhost', {
            password: process.env.REDIS_PASSWORD,
        });

        this.redis.addListener('error', err => {
            Logger.current.error(`[Banta/ChatService] Redis error: ${err.stack || err.message || err}`);
        });

        
        this.isc = new InterServerCommunications(this.logger, this.redis);
        this.logger.info(`Connecting to Banta inter-server communication...`);
        this.isc.connect();
        this.isc.messages.subscribe(async event => {
            if (event.message) {
                this._messageChangedRemotely.next(event.message);
                await this.cacheMessage(event.message, event.type);
            }

            if (event.like)
                this._likeChangedRemotely.next({ ...event.like, topicId: event.topicId });
        });
    }

    private stop() {
        this.running = false;
        this.mongoClient.close();
        this.redis.disconnect();
        this.isc.disconnect();
    }

    private redis: ioredis.Redis;
    private mongoClient: mongodb.MongoClient;
    private db: mongodb.Db;
    private isc: InterServerCommunications<ChatServerEvent>;

    private _messageChangedRemotely = new Subject<ChatMessage>();
    readonly messageChangedRemotely = this._messageChangedRemotely.asObservable();
    
    private _likeChangedRemotely = new Subject<Like & { topicId: string }>();
    readonly likeChangedRemotely = this._likeChangedRemotely.asObservable();

    activeConnections: number = 0;

    private guardRunning() {
        if (!this.running)
            throw new Error(`Banta Chat Services must be running to perform this action.`);
    }

    getCacheStatus() {
        let entries = Array.from(this.recentMessageTopicCache.getInternalEntries().values());
        let messageCounts = entries.map(e => e.value.newest.length);

        return {
            topicCount: entries.length,
            messageCount: messageCounts.reduce((x, a) => x + a, 0),
            topics: Object.fromEntries(entries.map(e => [e.key, e.value.newest.length ]))
        };
    }

    /**
     * Handle validation of a token sent by the client, and resolution of that token into a User object.
     * Pluggable so that particular sites can modify.
     * 
     * @param token 
     * @returns 
     */
    validateToken: ValidateToken = async (token: string) => {
        throw new Error(`The Banta integration must specify validateToken()`);
    };

    /**
     * Check if a user is allowed to perform a specific action or a class of actions.
     * Should be provided by the site integrating Banta. If the user is not allowed,
     * then an error should be thrown. 
     * 
     * IMPORTANT: This function MUST throw UnauthorizedError when passed an action name that is not supported.
     * This will be tested when the server starts!
     */
    get authorizeAction() { return this._authorizeAction; }
    set authorizeAction(value) {
        this._authorizeAction = value;
        setTimeout(async () => {
            await this.shouldNeverAuthorize(undefined, undefined, { action: `${Math.random() * 10000 | 0}` as any });
            await this.shouldNeverAuthorize(undefined, `invalid token`, { action: `${Math.random() * 10000 | 0}` as any });
            await this.shouldNeverAuthorize(
                { displayName: 'Not a real user', username: '[not_a_real_user]', id: 'invalid_id' }, 
                `invalid token`, 
                { action: `${Math.random() * 10000 | 0}` as any }
            );
        });
    }
    private _authorizeAction: AuthorizeAction = () => { };

    private _testedAuthorizeAction = false;

    private async shouldNeverAuthorize(user: User, token: string, action: AuthorizableAction) {
        let passedNegativeCheck = false;
        try {
            await this.authorizeAction(user, token, action);
        } catch (e) {
            if (e instanceof UnauthorizedError) {
                passedNegativeCheck = true;
            } else {
                this.logger.error(`While testing authorizeAction for correct implementation, received error: ${e.stack}`);
            }
        }

        if (!passedNegativeCheck) {
            this.logger.error(
                `Error: Your authorizeAction() implementation must return UnauthorizedError if the passed ` 
                + `action is not recognized. This ensures that future Banta features will remain unavailable ` 
                + `until your implementation is updated. **As a safety precaution, Banta will now exit. ` 
                + `Please update your implementation!**`
            );
            process.exit(1);
        }
    }

    /**
     * @internal
     */
    doAuthorizeAction: AuthorizeAction = async (user: User, token: string, action: AuthorizableAction) => {
        try {
            await this.authorizeAction(user, token, action);
        } catch (e) {
            if (e instanceof UnauthorizedError) 
                throw new Error(`permission-denied|${e.message}`);

            this.logger.error(`Error occurred while authorizing action: ${JSON.stringify(action)}: ${e.stack || e || e.message}`);
            throw new Error(`permission-denied|Not available [500]`);
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
     * Extract username (and other) mentions from the text and sets mentionLinks to the ones that are found. A quick 
     * way to implement this is to use simpleMentionExtractor. On the frontend, Banta SDK will automatically hyperlink 
     * all matching mentions when displayed.
     */
    extractMentions: MentionExtractor;

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
    get messages() { this.guardRunning(); return this.db.collection<ChatMessage>('messages'); }

    /**
     * The MongoDB `urlCards` collection
     */
    private get urlCards() { this.guardRunning(); return this.db.collection<PersistedUrlCard>('urlCards'); }

    /**
     * The MongoDB `origins` collection
     */
    private get origins() { this.guardRunning(); return this.db.collection<UrlOrigin>('origins'); }

    /**
     * The MongoDB `topics` collection
     */
    private get likes() { this.guardRunning(); return this.db.collection<Like>('likes'); }

    /**
     * The MongoDB `topics` collection
     */
    private get topics() { this.guardRunning(); return this.db.collection<Topic>('topics'); }

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
        this.guardRunning(); 

        if (typeof topicOrId === 'object')
            return topicOrId;

        let id = <string>topicOrId;
        await this.updateOne(this.topics,
            { id },
            {
                $setOnInsert: {
                    id,
                    createdAt: Date.now()
                }
            },
            { upsert: true }
        );

        return await this.findOne(this.topics, { id });
    }

    private topicCache = new Cache<Topic>('topics', { timeToLive: 60_000, maxItems: 100 });

    /**
     * Get or create a topic with the given identifier, using a cache.
     * @param id 
     * @returns 
     */
    async getOrCreateTopicCached(topicOrId: Topic | string): Promise<Topic> {
        this.guardRunning(); 

        if (typeof topicOrId === 'object')
            return topicOrId;

        let id = <string>topicOrId;

        return await this.topicCache.fetch(id, async () => {
            await this.updateOne(this.topics,
                { id },
                {
                    $setOnInsert: {
                        id,
                        createdAt: Date.now()
                    }
                },
                { upsert: true }
            );
    
            return await this.findOne(this.topics, { id });
        });
    }

    /**
     * Post a new ChatMessage to a topic (or a thread)
     * @param message 
     * @returns 
     */
    async postMessage(message: ChatMessage) {
        this.guardRunning(); 

        if (!message.id) {
            message.id = uuid();
        } else {
            if (await this.findOne(this.messages, { id: message.id })) {
                throw new Error(`A message with this ID already exists.`);
            }
        }

        message.hidden = false;

        // Make sure we strip the user's auth token, we never need that to be stored.
        if (message.user)
            delete message.user.token;

        if (!message.user || !message.user.id)
            throw new Error(`Message must include a valid user reference`);

        let parentMessage: ChatMessage;

        if (message.parentMessageId) {
            parentMessage = await this.getUnpreparedMessage(message.parentMessageId, false);
            if (!parentMessage)
                throw new Error(`No such parent message with ID '${message.parentMessageId}'`);
        }

        ///////////////////////////////////////////////////////////////////////////////////////
        // SECURITY SENSITIVE /////////////////////////////////////////////////////////////////
        //     First, escape all HTML, then if sanitizeHtml misses anything, strip the remaining
        //     HTML away.
        let dom = new JSDOM('');
        let purifier = createDOMPurify(<any>dom.window);
        message.message = sanitizeHtml(message.message, { allowedTags: [], disallowedTagsMode: 'escape' })
        message.message = purifier.sanitize(message.message, { ALLOWED_TAGS: [] });
        //
        // SECURITY SENSITIVE /////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////

        if (this.transformMessage)
            await this.transformMessage(message, 'post');

        await this.extractMentions?.(message);

        // Definitely keeping this message at this point.

        await this.insertOne(this.messages, message);

        setTimeout(async () => {
            // Update the parent's submessage count, if needed

            if (!message.hidden) {
                if (parentMessage)
                    await this.modifySubmessageCount(parentMessage, +1);
                await this.modifyTopicMessageCount(message.topicId, +1);
            }

            // Update the parent's participant list, if needed
            if (parentMessage) {
                await this.updateOne(this.messages, { id: parentMessage.id }, {
                    $addToSet: {
                        participants: message.user.id
                    }
                });
                let updatedParentMessage = await this.getUnpreparedMessage(parentMessage.id, true);
                this.notifyMessageChange(updatedParentMessage, 'update');
            }
        });

        this.notifyMessageChange(message, 'create');
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
        this.guardRunning(); 

        let topic = await this.getOrCreateTopic(topicOrId);
        topic.messageCount += delta;
        await this.updateOne(this.topics, { id: topic.id }, { $inc: { messageCount: delta } });
    }

    /**
     * Efficiently modify the `submessageCount` counter on the given ChatMessage.
     * 
     * @param messageOrId The message to modify
     * @param delta The delta to apply to the submessages counter.
     * @returns 
     */
    async modifySubmessageCount(messageOrId: ChatMessage | string, delta: number) {
        this.guardRunning(); 

        let message = await this.getUnpreparedMessage(messageOrId, true);
        message.submessageCount = (message.submessageCount || 0) + delta;
        this.updateOne(this.messages, { id: message.id }, { $inc: { submessageCount: delta } });
        this.notifyMessageChange(message, 'update');
    }

    /**
     * Efficiently modify the `likes` counter on the given ChatMessage.
     * 
     * @param messageOrId The message to modify
     * @param delta The delta to apply to the likes counter.
     * @returns 
     */
    async modifyMessageLikesCount(messageOrId: string | ChatMessage, delta: number) {
        this.guardRunning(); 

        let message = await this.getUnpreparedMessage(messageOrId, true);
        message.likes += delta;
        await this.updateOne(this.messages, { id: message.id }, { $inc: { likes: delta } });
        this.notifyMessageChange(message, 'update');
        return message;
    }

    /**
     * Notify all interested clients that the given message has created/updated.
     * @param message 
     */
    notifyMessageChange(message: ChatMessage, type: 'create' | 'update') {
        this.guardRunning(); 

        this.cacheMessage(message, type);
        this.isc.send({ type, originId: this.originId, topicId: message.topicId, message });
    }

    /**
     * Modify the hidden status of the given ChatMessage.
     * @param messageId 
     * @param hidden 
     * @returns 
     */
    async setMessageHiddenStatus(messageOrId: ChatMessage | string, hidden: boolean) {
        this.guardRunning(); 

        let message = await this.getUnpreparedMessage(messageOrId, true);
        if (message.hidden === hidden || message.deleted)
            return;

        // Update the message itself to reflect the new status.
        this.updateOne(this.messages, { id: message.id }, { $set: { hidden } });
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
            let parentMessage = await this.getUnpreparedMessage(message.parentMessageId, false);
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

        this.notifyMessageChange(message, 'update');
    }

    /**
     * Count how many submessages are visible for the given message.
     * @param parentMessageId The parent message to check
     * @returns The number of actual visible submessages
     */
    async countVisibleSubMessages(parentMessageId: string): Promise<number> {
        this.guardRunning(); 

        return await this.messages.countDocuments({
            parentMessageId,
            $or: [
                { hidden: true },
                { hidden: undefined }
            ]
        })
    }

    async pinMessage(messageOrId: string | ChatMessage, options?: PinOptions) {
        let pinnedUntil = options?.until;

        if (pinnedUntil && typeof pinnedUntil !== 'number') {
            throw new Error(`options.until must be a number`);
        }

        this.guardRunning(); 

        let message = await this.getUnpreparedMessage(messageOrId, true);
        message.pinned = true;
        message.pinnedUntil = pinnedUntil;

        await this.updateOne(this.messages, { id: message.id }, {
            $set: {
                pinned: true,
                pinnedUntil
            }
        });

        this.isc.send({ type: 'update', originId: this.originId, topicId: message.topicId, message });
        this._events.next(<PinMessageEvent>{
            type: 'pin',
            message
        });

        return this.prepareMessage(message);
    }

    async unpinMessage(messageOrId: string | ChatMessage) {
        this.guardRunning(); 

        let message = await this.getUnpreparedMessage(messageOrId, true);
        message.pinned = false;

        await this.updateOne(this.messages, { id: message.id }, {
            $set: {
                pinned: false
            }
        });

        this.isc.send({ type: 'update', originId: this.originId, topicId: message.topicId, message });
        this._events.next(<UnpinMessageEvent>{
            type: 'unpin',
            message
        });

        return this.prepareMessage(message);
    }

    /**
     * Edit the content of the message. No permissioning is applied here.
     * @param message 
     * @param newText 
     */
    async editMessage(messageOrId: string | ChatMessage, newText: string) {
        this.guardRunning(); 

        let message = await this.getUnpreparedMessage(messageOrId, true);
        let previousText = message.message;
        message.message = newText;

        if (this.transformMessage)
            this.transformMessage(message, 'edit', previousText);

        await this.extractMentions?.(message);

        let edits = message.edits || [];
        edits.push({
            createdAt: Date.now(),
            previousText,
            newText,
            previousAttachments: undefined,
            newAttachments: undefined
        });

        message.edits = edits;
        await this.updateOne(this.messages, { id: message.id }, {
            $set: {
                message: newText,
                edits: edits
            }
        });

        message.message = newText;
        this.isc.send({ type: 'update', originId: this.originId, topicId: message.topicId, message });

        this._events.next(<EditMessageEvent>{
            type: 'edit',
            message
        });

        return this.prepareMessage(message);
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
        this.guardRunning(); 

        let message = await this.getUnpreparedMessage(messageOrId, true);
        await this.setMessageHiddenStatus(message.id, true);

        message.deleted = true;
        await this.updateOne(this.messages, { id: message.id }, { $set: { deleted: true } });

        this._events.next(<DeleteMessageEvent>{
            type: 'delete',
            message
        });
    }

    async getLike(userId: string, messageId: string) {
        this.guardRunning(); 

        return await this.findOne(this.likes, { messageId, userId });
    }

    /**
     * Mark a message as liked by the given user, if it is not already liked.
     * @param message 
     * @param user 
     * @returns 
     */
    async like(message: ChatMessage, user: User) {
        this.guardRunning(); 
        
        if (!message)
            throw new Error(`Message cannot be null`);

        let like = await this.getLike(user.id, message.id);
        if (like)
            return message;

        await this.dbOperation(`Insert/update like`, async () => {
            this.updateOne(this.likes,
                { messageId: message.id, user: user.id },
                {
                    $setOnInsert: {
                        liked: true,
                        createdAt: Date.now(),
                        messageId: message.id,
                        userId: user.id
                    }
                },
                { upsert: true }
            );
        });

        // Add user to likers array (both locally and in DB)
        // Important to do this before changing like count, so it gets synced to 
        // other servers correctly.

        if (!message.likers.includes(user.id))
            message.likers.push(user.id);

        // Update the likes count on the message for all clients and all servers
        await this.modifyMessageLikesCount(message, +1);
        this._events.next(<LikeEvent>{ type: 'like', message, user });

        setTimeout(() => {
            this.updateOne(this.messages, { id: message.id }, {
                $addToSet: {
                    likers: user.id
                }
            });
        });
        
        this.isc.send({ type: 'create', originId: this.originId, topicId: message.topicId, like });
        
        return message;
    }

    private async findOne<T>(collection: mongodb.Collection<T>, criteria: mongodb.Filter<T>) {
        return await this.dbOperation(`${collection.collectionName}.findOne(${JSON.stringify(criteria)})`, async () => {
            return await collection.findOne(criteria);
        });
    }

    private async updateOne<T>(
        collection: mongodb.Collection<T>,
        filter: mongodb.Filter<T>,
        update: Partial<T> | mongodb.UpdateFilter<T>,
        options?: mongodb.UpdateOptions
    ) {
        const label = `${collection.collectionName}.updateOne(`
            + `${JSON.stringify(filter)}, ${JSON.stringify(update)}, ${JSON.stringify(options)}`
            + `)`;
        return await this.dbOperation(label, () => {
            return collection.updateOne(filter, update, options);
        })
    }

    private async insertOne<T>(collection: mongodb.Collection<T>, record: mongodb.OptionalUnlessRequiredId<T>) {
        return await this.dbOperation(`${collection.collectionName}.insertOne(${JSON.stringify(record)})`, () => {
            return collection.insertOne(record);
        })
    }

    private async dbOperation<T extends Promise<any>>(label: string, handler: () => T): Promise<Awaited<T>> {
        try {
            return await handler();
        } catch (e) {
            let errorId = uuid();
            Logger.current.error(`Error occurred during database operation '${label}': ${e.message}. Stack: ${e.stack}. Error ID: ${errorId}`);
            throw new Error(`internal-error:disconnect-and-retry|${errorId}`);
        }
    }

    /**
     * Mark a message as not liked by a user, if it is currently liked.
     * @param message 
     * @param user 
     * @returns 
     */
    async unlike(message: ChatMessage, user: User) {
        this.guardRunning(); 

        if (!message)
            throw new Error(`Message cannot be null`);

        let like = await this.findOne(this.likes, { messageId: message.id, userId: user.id });
        if (!like)
            return message;

        await this.likes.deleteOne({ messageId: message.id, userId: user.id });

        // Remove user from likers array (locally and in DB) 
        // Important to do this first so it gets synced to other servers

        if (message.likers.includes(user.id))
            message.likers = message.likers.filter(x => x !== user.id);

        setTimeout(() => {
            this.updateOne(this.messages, { id: message.id }, {
                $pull: {
                    likers: user.id
                }
            });
        });

        // Update the message's likes count for all clients and servers

        this.modifyMessageLikesCount(message, -1);
        this.isc.send({
            type: 'update',
            originId: this.originId,
            topicId: message.topicId,
            like: {
                ...like,
                liked: false
            }
        });
        this._events.next(<UnlikeEvent>{ type: 'unlike', message, user });

        return message;
    }

    /**
     * Get a specific message by ID without preparing it for delivery to the client.
     * @param messageOrId The ID of the message. Can also be a ChatMessage itself, for convenient calling (it will be
     *                    immediately returned)
     * @param throwIfMissing If true, throw an error if the message could not be found. Otherwise returns null.
     * @returns 
     */
    async getUnpreparedMessage(messageOrId: ChatMessage | string, throwIfMissing = false) {
        this.guardRunning(); 

        if (typeof messageOrId !== 'string')
            return messageOrId;

        let id = <string>messageOrId;
        let message = await this.findOne(this.messages, { id });

        if (throwIfMissing && !message)
            throw new Error(`No such message with ID '${id}'`);

        return message;
    }

    /**
     * Get a specific message by ID and prepare it for delivery to the client. If you do not want the message to be 
     * prepared, instead use getUnpreparedMessage().
     * 
     * @param messageOrId The ID of the message. Can also be a ChatMessage itself, for convenient calling (it will be
     *                    immediately returned)
     * @param throwIfMissing If true, throw an error if the message could not be found. Otherwise returns null.
     * @returns 
     */
    async getMessage(messageOrId: ChatMessage | string, throwIfMissing = false) {
        this.guardRunning(); 

        return this.prepareMessage(await this.getUnpreparedMessage(messageOrId, throwIfMissing));
    }

    /**
     * Creates a MongoDB filter object for the given MessageQuery.
     * @param query 
     * @returns 
     */
    createMongoMessagesFilterForQuery(query: MessageQuery) {
        return this.createMongoMessagesFilter(query.topicId, query.parentMessageId, query.filter, query.userId, query.pinned);
    }

    /**
     * Creates a MongoDB filter object for the given set of parameters. This is necessary when querying the `messages`
     * collection directly. 
     * @param topicId The topic to filter for.
     * @param parentMessageId The parent message when searching for threaded replies. Can be undefined to only fetch top level messages.
     * @param filterMode The filter to apply to the results. If using MINE or MY_LIKES you must specify a userId for the results to make sense.
     * @param userId The viewing user. Can be undefined.
     * @returns 
     */
    createMongoMessagesFilter(
        topicId: string, 
        parentMessageId: string, 
        filterMode: FilterMode, 
        userId: string,
        pinned: boolean
    ): mongodb.Filter<ChatMessage> {
        let filter = <mongodb.Filter<ChatMessage>>{
            topicId: topicId,
            parentMessageId: parentMessageId,
            $or: [
                { hidden: undefined },
                { hidden: false }
            ]
        }

        // Pinning

        if (pinned === true) {
            filter = {
                $and: [
                    filter,
                    { 
                        pinned: true,
                        $or: [
                            { pinnedUntil: undefined },
                            { pinnedUntil: { $gt: Date.now() } }
                        ]
                    }
                ]
            }
        } else if (pinned === false) {
            filter = {
                $and: [
                    filter,
                    {
                        $or: [
                            { pinned: false },
                            { pinned: undefined }
                        ]
                    }
                ]
            }
        }

        // Filter modes

        if (filterMode === FilterMode.MINE && userId) {
            filter['user.id'] = userId;
        } else if (filterMode === FilterMode.THREADS && userId) {
            filter = {
                $and: [
                    filter,
                    {
                        $or: [
                            { 'user.id': userId },
                            { 'participants': userId }
                        ]
                    }
                ]
            }
        } else if (filterMode === FilterMode.MY_LIKES && userId) {
            filter.likers = userId;
        }

        return filter;
    }

    /**
     * Create a MongoDB sort (ie { field: 1 }) from the given sort enumeration.
     * @param order 
     * @returns 
     */
    createMongoSortFromOrder(order: CommentsOrder): any {
        if (order === CommentsOrder.NEWEST) {
            return { sentAt: -1 };
        } else if (order === CommentsOrder.LIKES) {
            return { likes: -1 }
        } else if (order === CommentsOrder.OLDEST) {
            return { sentAt: 1 }
        }

        return { sentAt: 1 };
    }
    /**
     * Retrieve a set of messages from the database based on the parameters of the supplied MessageQuery
     * without preparing them for delivery to the client (by removing private information and applying user-specific
     * information).
     * @param query 
     * @returns 
     */
    async getUnpreparedMessages(query: MessageQuery): Promise<ChatMessage[]> {
        this.guardRunning(); 

        query = {
            sort: CommentsOrder.NEWEST,
            filter: FilterMode.ALL,
            ...query
        };

        let messages = <ChatMessage[]>await this.messages
            .find(
                this.createMongoMessagesFilterForQuery(query),
                {
                    limit: query.limit ?? 20,
                    skip: query.offset ?? 0,
                    sort: this.createMongoSortFromOrder(query.sort)
                }
            )
            .toArray()
            ;

        messages = await Promise.all(messages.map(async (message, i) => {
            message.pagingCursor = String(i);
            return <ChatMessage>message;
        }));

        return messages;
    }

    /**
     * Retrieve a set of messages from the database based on the parameters of the supplied MessageQuery.
     * @param query 
     * @returns 
     */
    async getMessages(query: MessageQuery): Promise<ChatMessage[]> {
        this.guardRunning(); 

        let messages = await this.getUnpreparedMessages(query);
        return messages.map(message => this.prepareMessage(message, query.userId));
    }

    /**
     * Remove private information from the given message object and add user-specific state (such as whether 
     * the message was "liked") if userId is provided.
     * @param message 
     * @param userId 
     * @returns 
     */
    prepareMessage(message: ChatMessage, userId?: string) {
        if (!message)
            return undefined;
        
        message = {
            ...message,
            userState: {
                liked: false
            }
        };

        // Remove any private information from the user object
        // before sending to the chat participants.
        delete message.user?.token;
        delete message.user?.ipAddress;
        delete message.user?.userAgent;

        if (userId) {
            message.userState.liked = (message.likers || []).includes(userId);
        }

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
        this.guardRunning(); 

        if (typeof topicOrId !== 'string')
            return topicOrId;

        let id = <string>topicOrId;
        let topic = await this.findOne(this.topics, { id });

        if (throwIfMissing && !topic)
            throw new Error(`No such topic with ID '${id}'`);

        if (topic)
            delete topic._id;

        return topic;
    }

    async getOrigin(origin: string) {
        this.guardRunning(); 

        return await this.findOne(this.origins, { origin });
    }

    /**
     * Stores recently sent messages in an LRU cache so that we can read from it when getting existing 
     * messages during client start and also when fetching additional pages of messages during paging.
     */
    private recentMessageTopicCache = new Cache<RecentMessagesCache>('recentMessageTopics', { 
        timeToLive: 60*60*1000, 
        maxItems: 100, 
        evictionStrategy: 'lru',
        deepCopy: false 
    });

    maxCachedMessagesPerTopic = 1000;

    private async cacheMessage(message: ChatMessage, type: 'create' | 'update') {
        if (message.parentMessageId)
            return;

        let messageCache = await this.recentMessageTopicCache.fetch(message.topicId, async () => ({ newest: [], ids: new Set() }));
        if (messageCache.ids.has(message.id)) {
            messageCache.newest[messageCache.newest.findIndex(x => x.id === message.id)] = message;
        } else {
            // Only add this message to the cached set if it is being created.
            // Updated messages are handled above, and if an updated message has fallen out of 
            // the message cache, we don't want to add it in as if it is new.
            if (type === 'create') {
                messageCache.newest.unshift(message);
                messageCache.ids.add(message.id);
            }
        }

        this.trimRecentMessageCache(messageCache);
    }

    async cacheMessages(topicId: string, messages: ChatMessage[]) {
        if (!topicId)
            return;

        this.logger.info(`Caching ${messages.length} messages for topic '${topicId}'`);

        let messageCache = await this.recentMessageTopicCache.fetch(topicId, async () => ({ newest: [], ids: new Set() }));
        messageCache.newest = messages.slice();
        messageCache.ids.clear();
        for (let message of messages)
            messageCache.ids.add(message.id);
        
        this.trimRecentMessageCache(messageCache);
    }

    private trimRecentMessageCache(messageCache: RecentMessagesCache) {
        for (let removed of messageCache.newest.splice(this.maxCachedMessagesPerTopic)) {
            messageCache.ids.delete(removed.id);
        }
    }

    getCachedMessages(topicId: string, parentMessageId: string, offset = 0, limit = 0) {
        if (parentMessageId)
            return [];

        let cache = this.recentMessageTopicCache.get(topicId);
        if (cache) {
            let messages = cache.newest;
            if (offset && limit)
                messages = messages.slice(offset, offset + limit);
            else if (offset)
                messages = messages.slice(offset);
            else if (limit)
                messages = messages.slice(0, limit);
            else
                messages = messages.slice();

            return messages;
        }
        return [];
    }

    async getUrlCard(url: string): Promise<UrlCard> {
        this.guardRunning(); 

        let urlCard = <PersistedUrlCard>await this.findOne(this.urlCards, { url });
        const URL_CARD_TIMEOUT = 1000 * 60 * 15;
        if (urlCard && urlCard.retrievedAt + URL_CARD_TIMEOUT > Date.now())
            return urlCard.card || null;

        let details = new URL(url);
        let originName = details.origin;
        let origin = <UrlOrigin>await this.getOrigin(originName);

        if (origin) {
            let lastFetchedAt = new Date(origin.lastFetchedAt).getTime();
            let noFetchesUntil = lastFetchedAt + origin.cooloffPeriodMS;
            let timeSinceLastFetch = Date.now() - lastFetchedAt;

            if (noFetchesUntil > Date.now()) {
                throw new Error(`Fetching from this origin is in cooloff (${origin.cooloffPeriodMS}ms)`);
            }

            // If we haven't seen the origin in a long time (30 days), go ahead and reset its cooloff period.
            if (timeSinceLastFetch > 1000 * 60 * 60 * 24 * 30) {
                Logger.current.info(`Link Fetcher: Origin was last seen more than 30 days ago. Resetting cool-off period to default.`);
                origin.cooloffPeriodMS = DEFAULT_COOLOFF_PERIOD;
            }

        } else {
            origin = {
                origin: originName,
                lastFetchedAt: undefined,
                lastFetchedStatusCode: 0,
                lastFetchedUrl: undefined,
                cooloffPeriodMS: DEFAULT_COOLOFF_PERIOD
            }
        }

        origin.lastFetchedAt = new Date().toISOString();
        origin.lastFetchedUrl = url;

        let response: Response = null;
        let requestStartedAt = Date.now();
        let requestDuration = undefined;
        try {
            Logger.current.info(`Fetching URL card for '${url}'...`);
            response = await fetch(url, {
                headers: {
                    'User-Agent': 'Bantachat-Linkbot/1.0 (+https://bantachat.com)'
                }
            });
            requestDuration = Date.now() - requestStartedAt;
        } catch (e) {
            Logger.current.error(`Failed to connect to ${originName} while fetching URL card for '${url}': ${e.message}`);
            Logger.current.error(`Origin cooldown period will be extended by 5 minutes.`);
            origin.cooloffPeriodMS += 1000 * 60 * 5;
        }

        try {
            if (!response)
                throw new Error(`Failed to fetch URL`);

            // Cool-off period should approach the request duration if its not already larger.
            if (origin.cooloffPeriodMS < requestDuration) {
                origin.cooloffPeriodMS = (origin.cooloffPeriodMS * 7 + (requestDuration + 1000) * 3) / 10;
            }
            origin.lastFetchedAt = new Date().toISOString();
            origin.lastFetchedStatusCode = response.status;

            if (response.status >= 500) {
                origin.cooloffPeriodMS += 1000 * 60 * 15;
                Logger.current.error(
                    `Received server error ${response.status} while fetching URL card for '${url}'. `
                    + `Origin cooldown period will be extended by 15 minutes. New cooldown: ${origin.cooloffPeriodMS}ms`
                );
                throw new Error(`Received error ${response.status} while fetching URL card`);
            } else if (response.status == 420) {
                origin.cooloffPeriodMS += 1000 * 60 * 5;
                Logger.current.error(
                    `Received rate limit (${response.status}) while fetching URL card for '${url}'. `
                    + `Origin cooldown period will be extended by 5 minutes. New cooldown: ${origin.cooloffPeriodMS}`
                );
                throw new Error(`Received error ${response.status} while fetching URL card`);
            } else if (response.status === 401 || response.status === 403) {
                origin.cooloffPeriodMS += 1000 * 60 * 10;
                Logger.current.error(
                    `Received unauthorized response (${response.status}) while fetching URL card for '${url}'. `
                    + `Origin cooldown period will be extended by 10 minutes. New cooldown: ${origin.cooloffPeriodMS}`
                );
                throw new Error(`Received error ${response.status} while fetching URL card`);
            } else {
                // Successful request. Decay the cool-off period for this origin.
                origin.cooloffPeriodMS *= 0.9;

                if (response.status >= 400) {
                    Logger.current.info(`Link Fetcher: Received client-error status ${response.status} for '${url}'`);
                    urlCard = {
                        card: null,
                        requestDuration,
                        retrievedAt: Date.now(),
                        statusCode: response.status,
                        url
                    };

                    return null;
                } else {
                    Logger.current.info(`Link Fetcher: Successfully retrieved content (${response.status}) for '${url}'`);

                    let text = await response.text();
                    let dom = new JSDOM(text);
                    let doc = dom.window.document;
                    let head = doc.head;
                    let card: Partial<UrlCard> = {
                        url,
                        description: '',
                        retrievedAt: Date.now()
                    };

                    let title = doc.querySelector('title');
                    if (title) {
                        card.title = title.textContent;
                        console.log(`- Title: ${card.title}`);
                    }

                    let description = doc.querySelector('meta[name="description"]');
                    if (description)
                        card.description = description.getAttribute('content');

                    let twitterTitle = doc.querySelector('meta[name="twitter:title"]');
                    let twitterDescription = doc.querySelector('meta[name="twitter:description"]')
                    let twitterImage = doc.querySelector('meta[name="twitter:image"]');
                    let twitterPlayer = doc.querySelector('meta[name="twitter:player"]');
                    let twitterPlayerWidth = doc.querySelector('meta[name="twitter:player:width"]');
                    let twitterPlayerHeight = doc.querySelector('meta[name="twitter:player:height"]');

                    if (twitterTitle)
                        card.title = twitterTitle.getAttribute('content');
                    if (twitterDescription)
                        card.description = twitterDescription.getAttribute('content');
                    if (twitterImage)
                        card.image = twitterImage.getAttribute('content');
                    if (twitterPlayer)
                        card.player = twitterPlayer.getAttribute('content');
                    if (twitterPlayer && !isNaN(Number(twitterPlayerWidth.getAttribute('content'))))
                        card.playerWidth = Number(twitterPlayerWidth.getAttribute('content'));
                    if (twitterPlayer && !isNaN(Number(twitterPlayerHeight.getAttribute('content'))))
                        card.playerHeight = Number(twitterPlayerHeight.getAttribute('content'));

                    if (card.title && card.title.length > 280)
                        card.title = card.title.substring(0, 280) + '...';
                    if (card.description && card.description.length > 500)
                        card.description = card.description.substring(0, 500) + '...';

                    urlCard = {
                        requestDuration,
                        retrievedAt: Date.now(),
                        statusCode: response.status,
                        url,
                        card: <UrlCard>card // TODO card.title ? <UrlCard>card : null
                    };

                    return urlCard.card;
                }
            }
        } finally {
            await this.updateOne(this.origins, { origin: originName }, { $set: origin }, { upsert: true });

            if (urlCard) {
                await this.urlCards.replaceOne({ url }, urlCard, { upsert: true });
            } else {
                Logger.current.error(`No URL card was provided`);
            }
        }
    }
}