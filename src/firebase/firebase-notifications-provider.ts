import { Observable, Subject } from "rxjs";
import { Notification, NotificationsProvider } from "../accounts";
import { DataStore } from "@astronautlabs/datastore";

export class FirebaseNotificationsProvider extends NotificationsProvider {
    constructor(
        private store : DataStore
    ) {
        super();
    }

    private _received = new Subject<Notification>();
    private _current : Notification[] = [];

    get received(): Observable<Notification> {
        return this._received;
    }

    get current(): Notification[] {
        return this._current;
    }

}