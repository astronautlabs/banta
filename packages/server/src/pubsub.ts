
import { Subject, Subscription } from 'rxjs';
import { lazyConnection } from './lazy-connection';
import { Logger } from '@alterior/logging';

import * as ioredis from 'ioredis';

export interface AppEvent<T = any> {
    name: string;
    data: T;
}

export class PubSubManager {
    constructor(private redis : ioredis.Redis | ioredis.Cluster) {
        this.subscriber = redis.duplicate();
        this.subscriber.addListener('message', this._listener);
        this.subscriber.addListener('error', err => {
            Logger.current.error(`[Banta/PubSubManager] Redis error: ${err.stack || err.message || err}`);
        });
    }

    disconnect() {
        this.subscriber.disconnect();
    }

    subscriber : ioredis.Redis | ioredis.Cluster;
    private _listener = (channel, message) => {
        this._messageSubject.next({ channel, message: JSON.parse(message) });
    };

    private _messageSubject  = new Subject<{ channel: string, message: any }>();
    private _subscriptions = new Map<string, number>();

    get messages() { return this._messageSubject.asObservable(); }
    subscribe(id: string) {
        let count = this._subscriptions.get(id) || 0;
        this.subscriber.subscribe(id);
        this._subscriptions.set(id, count + 1);
    }

    unsubscribe(id: string) {
        let count = Math.max(0, this._subscriptions.get(id) || 0);
        if (count === 0)
            this.subscriber.unsubscribe(id);
        
        if (count === 0)
            this._subscriptions.delete(id);
        else
            this._subscriptions.set(id, count);
    }

    async publish(channel: string, message: any) {
        return await this.redis.publish(channel, JSON.stringify(message));
    }
}

export class PubSub<T> {
    constructor(
        readonly manager: PubSubManager,
        readonly id : string,
        readonly selfSubscribe: boolean = false
    ) {
    }

    private _messageSubject : Subject<T>;
    private _listener = (channel, message) => {
        if (!this.id || channel == this.id)
            this._messageSubject?.next(JSON.parse(message));
    };

    private _subscription: Subscription;

    readonly messages = lazyConnection<T>({
        start: subject => {
            this.manager.subscribe(this.id);
            this._messageSubject = subject;
            this._subscription = this.manager.messages.subscribe((ev: { channel: string, message: any }) => {
                if (!this.id || ev.channel == this.id)
                    subject.next(JSON.parse(ev.message));
            });
        },
        stop: () => {
            this.manager.unsubscribe(this.id);
            this._subscription.unsubscribe();
            this._subscription = null;
            this._messageSubject = null;
        }
    });

    async publish(message : T): Promise<number> {
        if (this.selfSubscribe)
            this._messageSubject.next(message);
        
        return await this.manager.publish(this.id, JSON.stringify(message));
    }

    subscribe(handler : (message : T) => any) {
        return this.messages.subscribe(handler);
    }
}