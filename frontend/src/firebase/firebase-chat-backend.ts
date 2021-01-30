import { Injectable } from '@angular/core';
import { ChatBackendService, ChatSource, ChatMessage, User, UserAccount, Notification, NewUserAccount, SignUpResult, BantaService } from '../lib';
import { DataStore } from './datastore';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import * as firebase from 'firebase';
import { environment } from 'src/environments/environment';

@Injectable()
export class FirebaseChatBackend extends ChatBackendService {
    constructor(
        private banta : BantaService,
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
                    .limitToLast(100)
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
    
    async signUp(user : Partial<NewUserAccount>): Promise<SignUpResult> {
        if (!user.email || !user.password)
            throw new Error(`Account is missing some fields`);

        let result = await fetch(`${this.baseUrl}/accounts`, {
            method: 'POST'
        });

        let body : any;
        let failedToParseBody = null;

        try {
            body = await result.json();
        } catch (error) {
            failedToParseBody = error;
            body = {};
        }

        if (result.status >= 400) {
            throw new Error(
                `Error result while creating user account: `
                + `${result.status} ${result.statusText}: ` 
                + `${body.message || '<no message>'} ` 
                + `[code=${body.code || '<none>'}]`
            );
        }

        if (failedToParseBody)
            throw failedToParseBody;
        return body;
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

    async getSourceForThread(message : ChatMessage) : Promise<ChatSource> {
        return this.getSourceForCollection(`/topics/${message.topicId}/messages/${message.id}/messages`);
    }
    
    async getSourceForTopic(topicId: string): Promise<ChatSource> {
        return this.getSourceForCollection(`/topics/${topicId}/messages`)
    }

    private get baseUrl() {
        return environment.engageServiceUrl;
    }

    watchMessage(message : ChatMessage, handler : (message : ChatMessage) => void) : () => void {
        if (!message || !message.id) {
            //debugger;
            //throw new Error(`Cannot watch invalid message`);
            return;
        }

        let path = `/topics/${message.topicId}/messages/${message.id}`;

        if (message.parentMessageId)
            path = `/topics/${message.topicId}/messages/${message.parentMessageId}/messages/${message.id}`;

        return firebase.firestore().doc(path).onSnapshot(snapshot => {
            handler(<ChatMessage>snapshot.data());
        });
    }

    async upvoteMessage(topicId : string, messageId : string, submessageId? : string): Promise<void> {
        let path = `${this.baseUrl}/topics/${topicId}/messages/${messageId}/upvote`;

        if (submessageId) 
            path = `${this.baseUrl}/topics/${topicId}/messages/${messageId}/messages/${submessageId}/upvote`;

        let response = await fetch(
            path, 
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${
                        await firebase.auth().currentUser.getIdToken()
                    }`,
                    'Content-Type': 'application/json'
                },
                body: '{}'
            }
        );

        if (response.status >= 400) {
            let body = await response.json();
            throw new Error(`Caught error upvoting message ${topicId}/${messageId}: ${response.status} ${response.statusText}: ${body.message || '<no message>'}`);
        }
    }

    private async getSourceForCollection(collectionPath: string): Promise<ChatSource> {
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
    
                    console.log(`MESSAGE ADDED:`);
                    console.dir(message);

                    messages.push(message);
                    messageReceived.next(message);

                } else if (change.type === 'modified') {
                    console.log(`MESSAGE MODIFIED:`);
                    console.dir(change.doc.data());
                    let message = <ChatMessage>change.doc.data();
                    let existingMessage = messages.find(x => x.id === message.id);

                    if (existingMessage) {
                        console.log(`EXISTING MESSAGE:`);
                        console.dir(existingMessage);
                        Object.assign(existingMessage, message);
                    }
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

        let self = this;
        
        return {
            messageReceived,
            messageSent,
            currentUserChanged: this._userChanged,
            messages,
            close() {
                unsubscribe();
            },

            async send(message : ChatMessage) {
                let fbUser = firebase.auth().currentUser;

                if (!fbUser) {
                    // Not signed in
                    console.error(`Cannot send message: Not signed in.`);
                    return;
                }

                let response = await fetch(
                    `${self.baseUrl}${collectionPath}`, 
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${
                                await self.banta.user.token
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