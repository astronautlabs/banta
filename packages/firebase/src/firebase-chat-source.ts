import { ChatMessage, ChatSource, ChatSourceOptions, CommentsOrder } from "@banta/common";
import { Observable, Subject, Subscription } from "rxjs";
import { DataStore } from "@astronautlabs/datastore";
import { createDataStore } from "@astronautlabs/datastore-firestore";
import { AuthenticationProvider, NotificationsProvider } from "@banta/common";
import { MentionNotification } from "@banta/common";
import { v4 as uuid } from 'uuid';
import { Counter } from "@banta/common";
import { lazyConnection } from "./lazy-connection";

export class FirebaseChatSource implements ChatSource {
    constructor(
        readonly identifier : string,
        private auth : AuthenticationProvider,
        private notif : NotificationsProvider,
        private collectionPath : string,
        private options: ChatSourceOptions
    ) {
        this.datastore = createDataStore();

        let subscription : Subscription;
        let sortMapping: Record<CommentsOrder, [string, 'asc' | 'desc']> = {
            [CommentsOrder.NEWEST]: [ 'sentAt', 'asc' ],
            [CommentsOrder.OLDEST]: [ 'sentAt', 'desc' ],
            [CommentsOrder.LIKES]: [ 'upvotes', 'asc' ]
        };

        this._messageReceived = lazyConnection({
            start: subject => {
                console.log(`[Banta] Subscribing to topic '${identifier}' in collection path '${collectionPath}'`);
                let maxCount = 200;
                let [ sortField, sortDir ] = sortMapping[options?.sortOrder ?? CommentsOrder.NEWEST];

                console.log(`[Banta] Showing comments by ${sortField}:${sortDir}`);
                
                subscription = this.datastore
                    .watchForChanges(`${collectionPath}/messages`, { order: { field: sortField, direction: sortDir }, limit: 100 })
                    .subscribe(changes => {
                        for (let change of changes) {
                            if (change.type === 'added') {
                                let message = <ChatMessage>change.document;
                
                                console.log(`[Banta] Received message:`);
                                console.dir(message);

                                this.messages.push(message);
                                subject.next(message);
            
                            } else if (change.type === 'modified') {
                                let message = <ChatMessage>change.document;
                                let existingMessage = this.messages.find(x => x.id === message.id);
                                Object.assign(existingMessage, message);
                            } else if (change.type === 'removed') {
                                let message = <ChatMessage>change.document;
            
                                console.log('removed item: ');
                                console.dir(message);
            
                                let index = this.messages.findIndex(x => x.id === message.id);
                                this.messages.splice(index, 1);
                            }
                        }
            
                        while (this.messages.length > maxCount)
                            this.messages.shift();
                    })
                ;
            },
            stop: () => subscription.unsubscribe()
        });
        
    }

    get sortOrder() {
        return this.options?.sortOrder ?? CommentsOrder.NEWEST;
    }

    datastore : DataStore;

    _messageReceived : Observable<ChatMessage>;
    get messageReceived() {
        return this._messageReceived;
    }
    
    _messageSent = new Subject<ChatMessage>();
    get messageSent() : Observable<ChatMessage> {
        return this._messageSent;
    }

    messages : ChatMessage[] = [];

    async send(message : ChatMessage) {
        let finalMessage = await this.recordMessage(this.collectionPath, message);
        await this.sendMentionNotifications(finalMessage);

        return finalMessage;
    }

    private extractMentions(message : string): string[] {
        let set = new Set<string>();
        let match = message.match(/@[A-Za-z0-9]+\b/g);

        if (!match)
            return [];
        
        message
            .match(/@[A-Za-z0-9]+\b/g)
            .map(x => x.slice(1))
            .forEach(x => set.add(x))
        ;

        return Array.from(set.keys());
    }

    async sendMentionNotifications(message : ChatMessage, skipUserIDs : string[] = []) {
        // Find users mentioned...

        let mentions = this.extractMentions(message.message)
            .filter(x => x !== message.user.username);

        if (mentions.length > 20)
            mentions = mentions.slice(0, 20);
        
        let accounts = await this.auth.getUsersByUsernames(mentions);
        accounts = accounts.filter(x => x && x.uid && !skipUserIDs.includes(x.uid));

        if (mentions.length > 0) {
            console.log(`Mentioned:`);
            console.dir(mentions);
            console.log(`Found:`);
            console.dir(accounts);
        }

        // Post mention notifications...
        try {
            await Promise.all(
                accounts.map(
                    mentioned => {
                        console.log(`Notifying ${mentioned.username} of mention...`);
                        this.notif.send(
                            <MentionNotification>{
                                type: 'mention',
                                recipientId: mentioned.uid,
                                message
                            }
                        );
                    }
                )
            );
        } catch (e) {
            console.error(`Caught error while trying to send mention notifications for new message (skipping):`);
            console.error(e);
        }
    }
    private async recordMessage(topicPath : string, message : ChatMessage) {
        let id = uuid();
        
        message = Object.assign(<Partial<ChatMessage>>{}, message, { 
            id,
            sentAt: Date.now()
        });

        await Promise.all([
            this.datastore.update<ChatMessage>(
                `${topicPath}/messages/${id}`,
                message
            ),
            this.datastore.update<Counter>(
                `${topicPath}/counters/messages`,
                { value: <any>this.datastore.sentinels.increment(1) }
            )
        ]);

        return message;
    }

}
