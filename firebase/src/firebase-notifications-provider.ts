import { Observable, Subject } from "rxjs";
import { Notification, NotificationsProvider, Counter } from "@banta/common";
import { FirebaseStoreRef } from "./firebase-store-ref";
import { v4 as uuid } from 'uuid';
import { Injectable } from '@alterior/di';
import * as firebase from 'firebase';

@Injectable()
export class FirebaseNotificationsProvider extends NotificationsProvider {
    constructor(
        private storeRef : FirebaseStoreRef
    ) {
        super();
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

    async send(notification : Partial<Notification>) {
        let finalNotification = <Notification>notification;

        await Promise.all([
            this.datastore.update<Notification>(
                `/users/${notification.recipientId}/notifications/:id`,
                finalNotification = <Notification>Object.assign({}, notification, <Partial<Notification>>{
                    id: uuid(),
                    sentAt: Date.now()
                })
            ),
            this.datastore.update<Counter>(
                `/users/${notification.recipientId}/counters/notifications`,
                { value: <any>firebase.firestore.FieldValue.increment(1) }
            )
        ]);

        return finalNotification;
    }
}