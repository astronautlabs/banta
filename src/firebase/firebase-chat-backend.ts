import { Injectable } from '@angular/core';
import { ChatBackendService, ChatSource, ChatMessage, User, UserAccount, Notification } from '../lib';
import { DataStore } from './datastore';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import * as firebase from 'firebase';

@Injectable()
export class FirebaseChatBackend extends ChatBackendService {
    constructor(
        private datastore : DataStore
    ) {
        super();
        
        firebase.auth().onAuthStateChanged(async user => {
            
            if (this.notifUnsubscribe) {
                this.notifUnsubscribe();
                this.notifUnsubscribe = null;
            }

            if (user) {
                let userAccount = await this.datastore.read<UserAccount>(`/users/${user.uid}`);
                this._userChanged.next(userAccount);

                this.notifUnsubscribe = firebase.firestore()
                    .collection(`/users/${user.uid}/notifications`)
                    .orderBy('sentAt', 'desc')
                    .limitToLast(20)
                    .onSnapshot(result => {
                        let notifs = result.docs.map(x => <Notification>x.data());
                        this._notificationsChanged.next(notifs);

                        for (let change of result.docChanges()) {
                            if (change.type === 'added') {
                                this._newNotification.next(<Notification>change.doc.data());
                            }
                        }
                    });
            } else {
                this._userChanged.next(null);
            }
        });
    }

    private notifUnsubscribe : Function;

    private _userChanged = new BehaviorSubject<UserAccount>(null);

    private _notificationsChanged = new BehaviorSubject<Notification[]>([]);
    private _newNotification = new Subject<Notification>();

    get notificationsChanged() : Observable<Notification[]> {
        return this._notificationsChanged;
    }

    get newNotification() : Observable<Notification> {
        return this._newNotification;
    }

    get userChanged() {
        return this._userChanged;
    }

    async signOut() {
        await firebase.auth().signOut();
    }

    async signInWithPassword(email : string, password : string): Promise<UserAccount> {

        let result = await firebase.auth().signInWithEmailAndPassword(email, password);
        let user = await this.datastore.read<UserAccount>(`/users/${result.user.uid}`)

        return user;
    }    

    async refreshMessage(message : ChatMessage): Promise<ChatMessage> {
        let result = await this.datastore.read<ChatMessage>(`/topics/${message.topicId}/messages/${message.id}`);

        if (!result)
            return message;
        
        return result;
    }
    
    async getMessage(topicId : string, messageId : string): Promise<ChatMessage> {
        return await this.datastore.read<ChatMessage>(
            `/topics/${topicId}/messages/${messageId}`
        );
    }

    getSourceForThread(message : ChatMessage) : ChatSource {
        return this.getSourceForCollection(`/topics/${message.topicId}/messages/${message.id}/messages`);
    }
    
    getSourceForTopic(topicId: string): ChatSource {
        return this.getSourceForCollection(`/topics/${topicId}/messages`)
    }

    private getSourceForCollection(collectionPath: string): ChatSource {
        let maxCount = 200;
        let liveMessagesRef = this.datastore.firestore
            .collection(collectionPath)
            .orderBy('sentAt', 'asc')
            .limitToLast(maxCount)
        ;

        let messageReceived = new Subject<ChatMessage>();
        let messageSent = new Subject<ChatMessage>();
        let messages : ChatMessage[] = [];

        let unsubscribe = liveMessagesRef.onSnapshot(observer => {
            for (let change of observer.docChanges()) {
                if (change.type === 'added') {
                    let message = <ChatMessage>change.doc.data();
    
                    messages.push(message);
                    messageReceived.next(message);

                } else if (change.type === 'modified') {
                    let message = <ChatMessage>change.doc.data();
                    let existingMessage = messages.find(x => x.id === message.id);
                    Object.assign(existingMessage, message);
                } else if (change.type === 'removed') {
                    let message = <ChatMessage>change.doc.data();

                    console.log('removed item: ');
                    console.dir(message);

                    let index = messages.findIndex(x => x.id === message.id);
                    messages.splice(index, 1);
                }
            }

            while (messages.length > maxCount)
                messages.shift();
        });

        return {
            messageReceived,
            messageSent,
            currentUserChanged: this._userChanged,
            messages,
            close() {
                unsubscribe();
            },

            async send(message : ChatMessage) {
                console.log(`SENDING MESSAGE NOW`);
                let fbUser = firebase.auth().currentUser;

                if (!fbUser) {
                    // Not signed in
                    console.error(`Cannot send message: Not signed in.`);
                    return;
                }

                let response = await fetch(
                    `http://192.168.1.2:3000${collectionPath}`, 
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${
                                await firebase.auth().currentUser.getIdToken()
                            }`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(message)
                    }
                );

                if (response.status >= 400) {
                    let body = await response.json();
                    throw new Error(`Caught error sending message: ${response.status} ${response.statusText}: ${body.message || '<no message>'}`);
                }

                //messageSent.next(message);
            }
        };
    }
}