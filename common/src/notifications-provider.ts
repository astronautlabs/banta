import { Notification } from "./notification";
import { Observable } from 'rxjs';

export abstract class NotificationsProvider {
    abstract readonly received : Observable<Notification>;
    abstract readonly current : Notification[];
    abstract send(notif : Notification) : Promise<Notification>;
}