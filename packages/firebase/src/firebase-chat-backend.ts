import { ChatSource, ChatMessage, Vote, Injectable, filterObject, ChatSourceOptions } from "@banta/common";
import { ChatBackend, Notification } from "@banta/common";
import { DataStore } from "@astronautlabs/datastore";
import { FirebaseChatSource } from "./firebase-chat-source";
import { AuthenticationProvider, NotificationsProvider, UpvoteNotification } from "@banta/common";
import { Counter } from "@banta/common";
import { FirebaseStoreRef } from "./firebase-store-ref";
import { Observable, Subject, ReplaySubject } from "rxjs";

@Injectable()
export class FirebaseChatBackend implements ChatBackend {
    constructor(
        protected auth : AuthenticationProvider,
        protected notif : NotificationsProvider,
        protected storeRef : FirebaseStoreRef
    ) {
        this.datastore = this.storeRef.store;

        this._notificationsChanged.next(this.notif.current);
        this.notif.received.subscribe(notif => {
            this._newNotification.next(notif);
            this._notificationsChanged.next(this.notif.current);
        });
    }

    private _notificationsChanged = new ReplaySubject<Notification[]>(1);
    private _newNotification = new Subject<Notification>();

    get notificationsChanged() : Observable<Notification[]> {
        return this._notificationsChanged;
    }
    get newNotification() : Observable<Notification> {
        return this._newNotification;
    }

    protected datastore : DataStore;
    //private firestore : firebaseAdmin.firestore.Firestore;

    async getSourceForTopic(topicId: string, options?: ChatSourceOptions): Promise<ChatSource> {
        return await this.getSourceForCollection(topicId, `/bantaTopics/${topicId}`, options);
    }

    async getSourceForThread(topicId : string, id : string, options?: ChatSourceOptions): Promise<ChatSource> {
        return await this.getSourceForCollection(topicId, `/bantaTopics/${topicId}/messages/${id}`, options);
    }

    protected async getSourceForCollection(identifier : string, collectionPath : string, options: ChatSourceOptions): Promise<ChatSource> {
        return new FirebaseChatSource(identifier, this.auth, this.notif, collectionPath, options);
    }

    async refreshMessage(message: ChatMessage): Promise<ChatMessage> {
        let result = await this.datastore.read<ChatMessage>(`/bantaTopics/${message.topicId}/messages/${message.id}`);

        if (!result)
            return message;
        
        return result;
    }

    async getSubMessage(topicId : string, parentMessageId : string, messageId : string): Promise<ChatMessage> {
        return await this.datastore.read<ChatMessage>(
            `/bantaTopics/${topicId}/messages/${parentMessageId}/messages/${messageId}`
        );
    }

    async getMessage(topicId : string, messageId : string): Promise<ChatMessage> {
        return await this.datastore.read<ChatMessage>(
            `/bantaTopics/${topicId}/messages/${messageId}`
        );
    }

    async upvoteMessage(topicId: string, messageId: string, submessageId: string, vote : Vote): Promise<void> {
        let message : ChatMessage;
        if (submessageId)
            message = await this.getSubMessage(topicId, messageId, submessageId);
        else
            message = await this.getMessage(topicId, messageId);

        await this.datastore.transact(async txn => {

            let path = `/bantaTopics/${topicId}/messages/${messageId}`;
            if (submessageId) {
                path = `/bantaTopics/${topicId}/messages/${messageId}/messages/${submessageId}`
            }

            let existingVote = await txn.read(`${path}/upvotes/${vote.id}`);

            if (existingVote) {
                console.log(`Vote already exists`);
                return;
            }

            await Promise.all([
                txn.set(
                    `${path}/upvotes/${vote.id}`, 
                    vote
                ),
                txn.set(
                    `${path}/counters/upvotes`, 
                    <Counter>{ value: this.datastore.sentinels.increment(1) }
                ),
                txn.update(
                    `${path}`, 
                    <Partial<ChatMessage>>{ upvotes: this.datastore.sentinels.increment(1) }
                )
            ]);
        });

        if (vote.user) {
            await this.notif.send(<UpvoteNotification>{
                recipientId: message.user.id,
                type: 'upvote',
                message,
                user: vote.user
            })
        }
    }

    watchMessage(message: ChatMessage, handler: (message: ChatMessage) => void): () => void {
        if (!message || !message.id) {
            return;
        }

        let path = `/bantaTopics/${message.topicId}/messages/${message.id}`;

        if (message.parentMessageId)
            path = `/bantaTopics/${message.topicId}/messages/${message.parentMessageId}/messages/${message.id}`;

        let subscription = this.datastore.watch<ChatMessage>(path).subscribe(x => handler(x));
        return () => subscription.unsubscribe();
    }

    async modifyMessage(message : Partial<ChatMessage>): Promise<void> {
        let path : string;
        
        if (message.parentMessageId)
            path = `/bantaTopics/${message.topicId}/messages/${message.parentMessageId}/messages/${message.id}`;
        else
            path = `/bantaTopics/${message.topicId}/messages/${message.id}`;

        await this.datastore.update(path, {
            ...filterObject(message, [
                'message', 'hidden'
            ]),
            updatedAt: Date.now()
        });
    }

    async getSourceCountForTopic(topicId: string) {
        let data = await this.datastore.read<{ id?: string, value: number }>(
            `/bantaTopics/${topicId}/counters/messages`
        );

        return data.value;
    }
}