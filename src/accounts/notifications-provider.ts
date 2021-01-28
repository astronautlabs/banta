import { Notification } from "./accounts.service";
import { Observable } from 'rxjs';

export abstract class NotificationsProvider {
    abstract readonly received : Observable<Notification>;
    abstract readonly current : Notification[];
}