import { Injectable } from "@alterior/di";
import { Observable, Subject } from "rxjs";
import { ChatSource, ChatMessage, Vote } from "../chat";
import { ChatBackend, Notification } from "../chat/chat-backend";
import * as firebaseAdmin from "firebase-admin";
import { DataStore } from "@astronautlabs/datastore";
import { createDataStore } from "@astronautlabs/datastore-firestore";
import { FirebaseChatSource } from "./firebase-chat-source";
import { AuthenticationProvider, NotificationsProvider, UpvoteNotification } from "../accounts";
import { Counter } from "../infrastructure";
import { FirebaseStoreRef } from "./firebase-store-ref";

@Injectable()
export class FirebaseChatBackend implements ChatBackend {
    constructor(
        private auth : AuthenticationProvider,
        private notif : NotificationsProvider,
        private storeRef : FirebaseStoreRef
    ) {
        this.firestore = firebaseAdmin.app().firestore();
        this.datastore = this.storeRef.store;
    }

    private datastore : DataStore;
    private firestore : firebaseAdmin.firestore.Firestore;

    async getSourceForTopic(topicId: string): Promise<ChatSource> {
        return await this.getSourceForCollection(`/topics/${topicId}`);
    }

    async getSourceForThread(topicId : string, id : string): Promise<ChatSource> {
        return await this.getSourceForCollection(`/topics/${topicId}/messages/${id}`);
    }

    async getSourceForCollection(collectionPath : string): Promise<ChatSource> {
        return new FirebaseChatSource(this.auth, this.notif, collectionPath);
    }

    async refreshMessage(message: ChatMessage): Promise<ChatMessage> {
        // TODO
        return message;
    }

    async getSubMessage(topicId : string, parentMessageId : string, messageId : string) {
        let snapshot = await this.firestore.doc(`/topics/${topicId}/messages/${parentMessageId}/messages/${messageId}`).get();
        if (!snapshot.exists)
            throw new Error(`No such message ${topicId}/${messageId}`);
        return <ChatMessage> snapshot.data();
    }
    
    async getMessage(topicId: string, messageId: string): Promise<ChatMessage> {
        let snapshot = await this.firestore.doc(`/topics/${topicId}/messages/${messageId}`).get();
        if (!snapshot.exists)
            throw new Error(`No such message ${topicId}/${messageId}`);
        return <ChatMessage> snapshot.data();
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
                    <Counter>{ value: <any>firebaseAdmin.firestore.FieldValue.increment(1) }
                ),
                txn.update(
                    `${path}`, 
                    <Partial<ChatMessage>>{ upvotes: <any>firebaseAdmin.firestore.FieldValue.increment(1) }
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
        throw new Error("Method not implemented.");
    }
}