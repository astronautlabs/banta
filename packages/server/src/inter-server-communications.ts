
import { Subject } from 'rxjs';
import { Logger } from '@alterior/logging';
import { v4 as uuid } from 'uuid';

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
        const TRACE_ISC = process.env.BANTA_TRACE_ISC === '1';

        if (this.connected)
            return;

        this.connected = true;
        setTimeout(async () => {
            let lastMessageReceived = '$';

            this.logger.error(`[Banta/InterServerCommunications] Connected.`);

            if (TRACE_ISC) {
                this.logger.info(`[Banta/InterServerCommunications] ISC Tracing is enabled (set BANTA_TRACE_ISC=0 or remove to disable)`);
            } else {
                this.logger.info(`[Banta/InterServerCommunications] ISC Tracing is disabled (set BANTA_TRACE_ISC=1 to enable)`);
            }

            while (this.connected) {
                let results = await this.subscriber.xread('BLOCK', 0, 'STREAMS', STREAM_ID, lastMessageReceived);
                for (let [ key, items ] of results) {
                    if (key !== STREAM_ID)
                        continue;

                    for (let [ id, [ _, json ] ] of items) {
                        lastMessageReceived = id;
                        try {
                            let event = JSON.parse(json);

                            if (event['$iscOrigin'] !== this.clientId) {
                                this._messages.next(event);
                                if (TRACE_ISC) {
                                    this.logger.info(`[Banta/InterServerCommunications] Received message ${id}: ${JSON.stringify(event, undefined, 2)}`);
                                }
                            } else {
                                if (TRACE_ISC) {
                                    this.logger.info(`[Banta/InterServerCommunications] Received echoback for message ${id}: ${JSON.stringify(event, undefined, 2)}`);
                                }
                            }
                        } catch (e) {
                            this.logger.error(`[Banta/InterServerCommunications] Failed to parse Banta ISC event #${id} : '${json}': ${e.message}! Event will be skipped!`);
                        }
                    }
                }
            }
            this.logger.error(`[Banta/InterServerCommunications] Disconnected.`);
        });
    }

    subscriber : ioredis.Redis | ioredis.Cluster;

    private _messages  = new Subject<T>();
    readonly messages = this._messages.asObservable();

    clientId = uuid();

    async send(message: any) {
        message['$iscOrigin'] = this.clientId;
        this._messages.next(message);
        return await this.redis.xadd(STREAM_ID, 'MAXLEN', '~', 100, '*', 'json', JSON.stringify(message));
    }
}
