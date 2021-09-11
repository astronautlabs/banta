import { Notification } from "./notification";
import { Observable } from 'rxjs';
import { User } from "./user";

export abstract class NotificationsProvider {
    abstract user : User;
    abstract readonly received : Observable<Notification>;
    abstract readonly current : Notification[];
    abstract send(notif : Notification) : Promise<Notification>;
}