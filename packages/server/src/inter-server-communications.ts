
import { Subject, Subscription } from 'rxjs';
import { lazyConnection } from './lazy-connection';
import { Logger } from '@alterior/logging';

import * as ioredis from 'ioredis';

export interface AppEvent<T = any> {
    name: string;
    data: T;
}

const STREAM_ID = 'banta:events';

export class InterServerCommunications<T> {
    constructor(private logger: Logger, private redis : ioredis.Redis | ioredis.Cluster) {
        this.subscriber = redis.duplicate();
        this.subscriber.addListener('error', err => {
            Logger.current.error(`[Banta/InterServerCommunications] Redis error: ${err.stack || err.message || err}`);
        });
    }

    disconnect() {
        this.connected = false;
        this.subscriber.disconnect();
    }

    private connected = false;

    connect() {
        if (this.connected)
            return;

        this.connected = true;
        setTimeout(async () => {
            let lastMessageReceived = '$';
            while (this.connected) {
                let results = await this.subscriber.xread('BLOCK', 0, 'STREAMS', STREAM_ID, lastMessageReceived);
                for (let [ key, items ] of results) {
                    if (key !== STREAM_ID)
                        continue;

                    for (let [ id, [ _, json ] ] of items) {
                        lastMessageReceived = id;
                        try {
                            let event = JSON.parse(json);
                            this._messages.next(event);
                        } catch (e) {
                            this.logger.error(`[Banta/InterServerCommunications] Failed to parse Banta ISC event #${id} : '${json}': ${e.message}! Event will be skipped!`);
                        }
                    }
                }
            }
        });
    }

    subscriber : ioredis.Redis | ioredis.Cluster;

    private _messages  = new Subject<T>();
    readonly messages = this._messages.asObservable();

    async send(message: any) {
        return await this.redis.xadd(STREAM_ID, 'MAXLEN', '~', 100, '*', 'json', JSON.stringify(message));
    }
}
