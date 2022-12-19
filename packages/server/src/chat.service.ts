import { Injectable } from "@alterior/di";
import { ChatMessage, UrlCard, User } from "@banta/common";
import { Subject } from "rxjs";
import * as mongodb from 'mongodb';
import * as ioredis from 'ioredis';
import IORedis from 'ioredis';
import { PubSubManager } from "./pubsub";
import { v4 as uuid } from 'uuid';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import sanitizeHtml from 'sanitize-html';
import { Logger } from '@alterior/logging';
import * as fs from 'fs';

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

const DEFAULT_COOLOFF_PERIOD = 10*1000;

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

export interface PersistedUrlCard {
    url: string;
    retrievedAt: number;
    statusCode: number;
    requestDuration: number;
    card: UrlCard;
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
            Array.from(message.message.match(/@[A-Za-z0-9-]+/g))
                .map(un => un.slice(1))
                .reduce((uniq, username) => uniq.concat(uniq.includes(username) ? [] : [username]), [])
                .map(un => ({ text: `@${un}`, link: linker(un), external: true }))
        ;
    };
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
    get messages() { return this.db.collection<ChatMessage>('messages'); }

    /**
     * The MongoDB `urlCards` collection
     */
    get urlCards() { return this.db.collection<PersistedUrlCard>('urlCards'); }

    /**
     * The MongoDB `origins` collection
     */
    get origins() { return this.db.collection<UrlOrigin>('origins'); }

    /**
     * The MongoDB `topics` collection
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

        // Make sure we strip the user's auth token, we never need that to be stored.
        if (message.user)
            delete message.user.token;

        if (!message.user || !message.user.id)
            throw new Error(`Message must include a valid user reference`);
            
        let parentMessage: ChatMessage;
        
        if (message.parentMessageId) {
            parentMessage = await this.getMessage(message.parentMessageId, false);
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
        
        await this.extractMentions(message);

        // Definitely keeping this message at this point.

        await this.messages.insertOne(message);
        
        setTimeout(async () => {
            // Update the parent's submessage count, if needed

            if (!message.hidden) {
                if (parentMessage)
                    await this.modifySubmessageCount(parentMessage, +1);
                await this.modifyTopicMessageCount(message.topicId, +1);
            }
        });

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
     * @param delta The delta to apply to the submessages counter.
     * @returns 
     */
    async modifySubmessageCount(messageOrId: ChatMessage | string, delta: number) {
        let message = await this.getMessage(messageOrId, true);
        message.submessageCount = (message.submessageCount || 0) + delta;
        this.messages.updateOne({ id: message.id }, { $inc: { submessageCount: delta } });
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

        await this.extractMentions(message);

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
        
        this._events.next(<EditMessageEvent>{
            type: 'edit',
            message
        });
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

    async getOrigin(origin: string) {
        return await this.origins.findOne({ origin });
    }

    async getUrlCard(url: string): Promise<UrlCard> {
        let urlCard = <PersistedUrlCard> await this.urlCards.findOne({ url });
        const URL_CARD_TIMEOUT = 1000 * 60 * 15;
        if (urlCard && urlCard.retrievedAt + URL_CARD_TIMEOUT > Date.now())
            return urlCard.card || null;

        let details = new URL(url);
        let originName = details.origin;
        let origin = <UrlOrigin> await this.getOrigin(originName);

        if (origin) {
            let lastFetchedAt = new Date(origin.lastFetchedAt).getTime();
            let noFetchesUntil = lastFetchedAt + origin.cooloffPeriodMS;
            let timeSinceLastFetch = Date.now() - lastFetchedAt;

            if (noFetchesUntil > Date.now()) {
                throw new Error(`Fetching from this origin is in cooloff (${origin.cooloffPeriodMS}ms)`);
            }

            // If we haven't seen the origin in a long time (30 days), go ahead and reset its cooloff period.
            if (timeSinceLastFetch > 1000*60*60*24*30) {
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
            origin.cooloffPeriodMS += 1000*60*5;
        }

        try {
            if (!response)
                throw new Error(`Failed to fetch URL`);

            // Cool-off period should approach the request duration if its not already larger.
            if (origin.cooloffPeriodMS < requestDuration) {
                origin.cooloffPeriodMS = (origin.cooloffPeriodMS*7 + (requestDuration + 1000)*3) / 10;
            }
            origin.lastFetchedAt = new Date().toISOString();
            origin.lastFetchedStatusCode = response.status;
            
            if (response.status >= 500) {
                origin.cooloffPeriodMS += 1000*60*15;
                Logger.current.error(
                    `Received server error ${response.status} while fetching URL card for '${url}'. `
                    + `Origin cooldown period will be extended by 15 minutes. New cooldown: ${origin.cooloffPeriodMS}ms`
                );
                throw new Error(`Received error ${response.status} while fetching URL card`);
            } else if (response.status == 420) {
                origin.cooloffPeriodMS += 1000*60*5;
                Logger.current.error(
                    `Received rate limit (${response.status}) while fetching URL card for '${url}'. `
                    + `Origin cooldown period will be extended by 5 minutes. New cooldown: ${origin.cooloffPeriodMS}`
                );
                throw new Error(`Received error ${response.status} while fetching URL card`);
            } else if (response.status === 401 || response.status === 403) {
                origin.cooloffPeriodMS += 1000*60*10;
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

                    fs.writeFileSync(`TEST.html`, text);

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
            await this.origins.updateOne({ origin: originName }, { $set: origin }, { upsert: true });

            if (urlCard) {
                await this.urlCards.replaceOne({ url }, urlCard, { upsert: true });
            } else {
                Logger.current.error(`No URL card was provided`);
            }
        }
    }
}