import { BehaviorSubject, Observable } from 'rxjs';
import { ChatMessage, Vote, CommentsOrder, Notification, User, UrlCard, FilterMode, Topic } from '@banta/common';
import { ChatSourceBase } from './chat-source-base';
import { AttachmentResolver, AttachmentScraper } from './attachment-scraper';

export interface ChatSourceOptions {
    sortOrder?: CommentsOrder;
    filterMode?: FilterMode;

    /**
     * How many messages should be loaded initially?
     */
    initialMessageCount?: number;
    metadata?: Record<string, any>;
}

export abstract class ChatBackendBase {
    constructor() {
    }
    
    abstract getSourceForTopic(topicId : string, options?: ChatSourceOptions) : Promise<ChatSourceBase>;
    abstract getSourceForThread(topicId : string, messageId : string, options?: ChatSourceOptions) : Promise<ChatSourceBase>;

    /**
     * Get the count of the given topic
     * @param topicId 
     * @returns 
     */
    abstract getSourceCountForTopic(topicId: string): Promise<number>;

    /**
     * Get the count of the given topics. 
     * @param topicId Topics to count messages on. Maximum of 1000.
     * @returns 
     */
    abstract getSourceCountForTopics(topicIds: string[]): Promise<Record<string, number>>;

    /**
     * Get information about the given topic. 
     * @param topicId 
     * @returns The topic object, or undefined if no such topic was found.
     */
    abstract getTopic(topicId: string): Promise<Topic | undefined>;

    /**
     * Get information about the given topics
     * @param topicIds The topic IDs to look up. Maximum of 1000.
     * @returns An array of matching topic objects.
     */
    abstract getTopicsById(topicIds: string[]): Promise<Topic[]>;

    /**
     * Get a set of messages from the given topic.
     * @param topicId 
     * @returns 
     */
    abstract getMessages(
        topicId: string, 
        sort?: CommentsOrder, 
        filter?: FilterMode, 
        offset?: number, 
        limit?: number
    ): Promise<ChatMessage[]>;

    /**
     * Get a set of messages from the given topic.
     * @param topicId 
     * @returns 
     */
    abstract getReplies(
        parentMessageId: string,
        sort?: CommentsOrder, 
        filter?: FilterMode, 
        offset?: number, 
        limit?: number
    ): Promise<ChatMessage[]>;

    abstract refreshMessage(message : ChatMessage): Promise<ChatMessage>;
    abstract getMessage(topicId : string, messageId : string): Promise<ChatMessage>;
    abstract getSubMessage(topicId : string, parentMessageId : string, messageId : string): Promise<ChatMessage>;
    abstract watchMessage(message : ChatMessage, handler : (message : ChatMessage) => void) : () => void;
    abstract getCardForUrl(url: string): Promise<UrlCard>;
    readonly notificationsChanged : Observable<Notification[]>;
    readonly newNotification : Observable<Notification>;
    
    private _userChanged = new BehaviorSubject<User>(null);
    private _user : User;
    
    get userChanged() : Observable<User> {
        return this._userChanged;
    }
    
    set user(user : User) {
        this._user = user;
        this._userChanged.next(user);
    }

    get user() {
        return this._user;
    }
    
    private _attachmentScrapers: AttachmentScraper[] = [];
    private _attachmentResolvers: AttachmentResolver[] = [];

    registerAttachmentScraper(scraper: AttachmentScraper) {
        this._attachmentScrapers.push(scraper);
    }

    registerAttachmentResolver(resolver: AttachmentResolver) {
        this._attachmentResolvers.push(resolver);
    }

    get attachmentScrapers() {
        return this._attachmentScrapers.slice();
    }

    get attachmentResolvers() {
        return this._attachmentResolvers.slice();
    }
}