import { BehaviorSubject, Observable } from 'rxjs';
import { ChatMessage, Vote, CommentsOrder, Notification, User } from '@banta/common';
import { ChatSourceBase } from './chat-source-base';
import { AttachmentResolver, AttachmentScraper } from './attachment-scraper';

export interface ChatSourceOptions {
    sortOrder: CommentsOrder;
}

export abstract class ChatBackendBase {
    constructor() {
    }
    
    abstract getSourceForTopic(topicId : string, options?: ChatSourceOptions) : Promise<ChatSourceBase>;
    abstract getSourceForThread(topicId : string, messageId : string, options?: ChatSourceOptions) : Promise<ChatSourceBase>;
    abstract getSourceCountForTopic(topicId: string): Promise<number>
    abstract refreshMessage(message : ChatMessage): Promise<ChatMessage>;
    abstract getMessage(topicId : string, messageId : string): Promise<ChatMessage>;
    abstract getSubMessage(topicId : string, parentMessageId : string, messageId : string): Promise<ChatMessage>;
    abstract watchMessage(message : ChatMessage, handler : (message : ChatMessage) => void) : () => void;
    abstract getCardForUrl(url: string);
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