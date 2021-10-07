import { Observable, Subject } from "rxjs";
import { Notification, NotificationsProvider, Counter, User, Injectable } from "@banta/common";
import { FirebaseStoreRef } from "./firebase-store-ref";
import { v4 as uuid } from 'uuid';
import { Subscription } from "rxjs";

@Injectable()
export class FirebaseNotificationsProvider extends NotificationsProvider {
    constructor(
        private storeRef : FirebaseStoreRef
    ) {
        super();
    }

    private _user : User;

    get user() {
        return this._user;
    }

    set user(value) {
        this._user = value;
        this.subscribeToUser();
    }

    get datastore() {
        return this.storeRef.store;
    }

    private _received = new Subject<Notification>();
    private _current : Notification[] = [];

    get received(): Observable<Notification> {
        return this._received;
    }

    get current(): Notification[] {
        return this._current;
    }

    private _notificationsSubscription : Subscription;
    private _newNotificationSubscription : Subscription;

    private subscribeToUser() {
        if (this._notificationsSubscription) {
            this._notificationsSubscription.unsubscribe();
            this._notificationsSubscription = null;
        }

        if (this._newNotificationSubscription) {
            this._newNotificationSubscription.unsubscribe();
            this._newNotificationSubscription = null;
        }
        
        if (!this.user)
            return;

        let path = `/bantaUsers/${this.user.id}/notifications`;

        this._notificationsSubscription = this.datastore
            .watchAll<Notification>(path, { limit: 50 })
            .subscribe(notifs => this._current = notifs)
        ;

        this._newNotificationSubscription = this.datastore
            .watchForChanges<Notification>(path)
            .subscribe(c => c.filter(x => x.type === 'added')
                .forEach(n => this._received.next(n.document))
            )
        ;
    }

    async send(notification : Partial<Notification>) {
        let finalNotification = <Notification>notification;

        await Promise.all([
            this.datastore.update<Notification>(
                `/bantaUsers/${notification.recipientId}/notifications/:id`,
                finalNotification = <Notification>Object.assign({}, notification, <Partial<Notification>>{
                    id: uuid(),
                    sentAt: Date.now()
                })
            ),
            this.datastore.update<Counter>(
                `/bantaUsers/${notification.recipientId}/counters/notifications`,
                { value: <any>this.datastore.sentinels.increment(1) }
            )
        ]);

        return finalNotification;
    }
}