import { Injectable } from "@alterior/di";
import { ChatSource, ChatMessage, Vote } from "@banta/common";
import { ChatBackend, Notification } from "@banta/common";
import * as firebase from "firebase";
import { DataStore } from "@astronautlabs/datastore";
import { FirebaseChatSource } from "./firebase-chat-source";
import { AuthenticationProvider, NotificationsProvider, UpvoteNotification } from "@banta/common";
import { Counter } from "@banta/common";
import { FirebaseStoreRef } from "./firebase-store-ref";
import { Subject, ReplaySubject } from "rxjs";

@Injectable()
export class FirebaseChatBackend implements ChatBackend {
    constructor(
        protected auth : AuthenticationProvider,
        protected notif : NotificationsProvider,
        protected storeRef : FirebaseStoreRef
    ) {
        this.datastore = this.storeRef.store;

        this.notificationsChanged.next(this.notif.current);
        this.notif.received.subscribe(notif => {
            this.newNotification.next(notif);
            this.notificationsChanged.next(this.notif.current);
        });
    }

    notificationsChanged = new ReplaySubject<Notification[]>(1);
    newNotification = new Subject<Notification>();

    protected datastore : DataStore;
    //private firestore : firebaseAdmin.firestore.Firestore;

    async getSourceForTopic(topicId: string): Promise<ChatSource> {
        return await this.getSourceForCollection(`/topics/${topicId}`);
    }

    async getSourceForThread(topicId : string, id : string): Promise<ChatSource> {
        return await this.getSourceForCollection(`/topics/${topicId}/messages/${id}`);
    }

    protected async getSourceForCollection(collectionPath : string): Promise<ChatSource> {
        return new FirebaseChatSource(this.auth, this.notif, collectionPath);
    }

    async refreshMessage(message: ChatMessage): Promise<ChatMessage> {
        let result = await this.datastore.read<ChatMessage>(`/topics/${message.topicId}/messages/${message.id}`);

        if (!result)
            return message;
        
        return result;
    }

    async getSubMessage(topicId : string, parentMessageId : string, messageId : string): Promise<ChatMessage> {
        return await this.datastore.read<ChatMessage>(
            `/topics/${topicId}/messages/${parentMessageId}/messages/${messageId}`
        );
    }

    async getMessage(topicId : string, messageId : string): Promise<ChatMessage> {
        return await this.datastore.read<ChatMessage>(
            `/topics/${topicId}/messages/${messageId}`
        );
    }

    async upvoteMessage(topicId: string, messageId: string, submessageId: string, vote : Vote): Promise<void> {
        let message : ChatMessage;
        if (submessageId)
            message = await this.getSubMessage(topicId, messageId, submessageId);
        else
            message = await this.getMessage(topicId, messageId);

        await this.datastore.transact(async txn => {

            let path = `/topics/${topicId}/messages/${messageId}`;
            if (submessageId) {
                path = `/topics/${topicId}/messages/${messageId}/messages/${submessageId}`
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
                    <Counter>{ value: <any>firebase.firestore.FieldValue.increment(1) }
                ),
                txn.update(
                    `${path}`, 
                    <Partial<ChatMessage>>{ upvotes: <any>firebase.firestore.FieldValue.increment(1) }
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

        let path = `/topics/${message.topicId}/messages/${message.id}`;

        if (message.parentMessageId)
            path = `/topics/${message.topicId}/messages/${message.parentMessageId}/messages/${message.id}`;

        let subscription = this.datastore.watch<ChatMessage>(path).subscribe(x => handler(x));
        return () => subscription.unsubscribe();
    }
}