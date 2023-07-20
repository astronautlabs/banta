/**
 * Provides a durable WebSocket. Such a socket will automatically handle reconnection including
 * exponential backoff and jitter. It will also enqueue messages while the socket is down and 
 * send them once connection is restored.
 * 
 * Drop in compatible with WebSocket, with some additional events:
 * - 'lost': fired when the connection goes down
 * - 'restore': fired when the connection is restored after being down
 * 
 * The standard open and close events only fire when the connection is initially established 
 * and when the socket is intentionally ended by calling close().
 */
 export class DurableSocket implements WebSocket {
    constructor(
        readonly url : string,
        readonly protocols? : string | string[],
        sessionId?: string
    ) {
        this._sessionId = sessionId;
        this.connect();
        this.ready = new Promise<this>((resolve, reject) => {
            this.addEventListener('open', () => resolve(this));
            this.addEventListener('close', e => {
                if (e.code === 503) {
                    //console.error(`Failed to connect to service!`);
                    reject(e);
                }
            });
        });

        let wasRestored: () => void = () => {};
        this.addEventListener('lost', () => this.ready = new Promise<this>((res, _) => wasRestored = () => res(this)));
        this.addEventListener('ready', e => wasRestored());
    }

    ready: Promise<this>;

    /**
     * Wait until this connection is ready to receive a message. If connection is lost, this method will
     * return a new promise that will resolve when connection is restored.
     * @returns 
     */
    waitUntilReady() {
        return this.ready;
    }

    private connect() {
        if (this._socket) {
            this.safelyClose(this._socket);
            this._socket = null;
        }

        const socket = new WebSocket(this.urlWithSessionId, this.protocols);
        this._socket = socket;
        this._socket.onopen = ev => this.handleConnect(socket, ev);
        this._socket.onerror = ev => this.dispatchSocketEvent(socket, ev);
        this._socket.onclose = ev => this.handleLost(socket);
        this._socket.onmessage = ev => this.handleMessage(socket, ev);
    }

    get urlWithSessionId() {
        if (this.sessionId)
            return `${this.url}${this.url.includes('?') ? '&' : '?'}sessionId=${this.sessionId}`;
        return this.url;
    }

    private pingTimer;
    private lastPong : number = 0;
    private _sessionId: string;

    /**
     * Get the session ID assigned to this session by the server.
     * This session ID will be included when reconnecting to allow for 
     * state retention even after reconnecting.
     */
    get sessionId() {
        return this._sessionId;
    }

    private safelyClose(socket: WebSocket) {
        try {
            socket?.close();
        } catch (e) {
            console.warn(`[Banta/DurableSocket] While safely closing an old socket: ${e.message} [this is unlikely to be a problem]`);
        }
    }

    private async handleConnect(socket: WebSocket, ev : Event) {
        if (this._socket !== socket) {
            this.safelyClose(socket);
            return;
        }
        
        let first = !this._open;
        if (first) {
            await this.dispatchSocketEvent(socket, ev);
            this._open = true;
        }

        if (!first) {
            console.log(`[Banta/DurableSocket] Connection is restored [${this.url}]. Restoring state...`);
            try {
                await this.dispatchSocketEvent(socket, {
                    type: 'restore', 
                    bubbles: false, 
                    cancelable: false, 
                    cancelBubble: false, 
                    composed: false,
                    currentTarget: this,
                    defaultPrevented: false,
                    eventPhase: 0, // Event.NONE
                    isTrusted: true,
                    returnValue: undefined,
                    srcElement: undefined,
                    target: this,
                    timeStamp: Date.now(),
                    composedPath: () => [],
                    initEvent: undefined,
                    preventDefault() { this.defaultPrevented = true; },
                    stopPropagation() { },
                    stopImmediatePropagation() { },
                    AT_TARGET: 2, // Event.AT_TARGET
                    BUBBLING_PHASE: 3, // Event.BUBBLING_PHASE,
                    CAPTURING_PHASE: 1, // Event.CAPTURING_PHASE,
                    NONE: 0, //Event.NONE
                });
            } catch (e) {
                console.error(`[Banta/DurableSocket] Error restoring state: ${e.message}. Stack: ${e.stack}`);
                console.error(`[Banta/DurableSocket] Treating connection as failed due to state restoration error.`);
                this.setNotReady();
                this.safelyClose(this._socket);
                try {
                    this._socket?.close();
                } catch (e) {
                    console.error(`[Banta/DurableSocket] Failed to close socket after ping failure: ${e.message} [${this.url}]`);
                }
                return;
            }

            console.log(`[Banta/DurableSocket] State restored successfully.`);
        }

        this.setReady(socket);
        this._attempt = 0;
        
        this._messageQueue.splice(0).forEach(m => this._socket.send(m));

        this.lastPong = Date.now();
        if (this.enablePing) {
            clearInterval(this.pingTimer);
            this.pingTimer = setInterval(() => {
                if (this._closed) {
                    clearInterval(this.pingTimer);
                    return;
                }
                
                try {
                    this.sendImmediately(JSON.stringify({ type: 'ping' }));
                } catch (e) {
                    console.error(`[Banta/DurableSocket] Failed to send ping message. Connection is broken. [${this.url}]`);
                    this.setNotReady();
                    this.safelyClose(this._socket);
                    try {
                        this._socket?.close();
                    } catch (e) {
                        console.error(`[Banta/DurableSocket] Failed to close socket after ping failure: ${e.message} [${this.url}]`);
                    }
                    return;
                }

                if (this.lastPong < Date.now() - this.pingKeepAliveInterval) {
                    console.log(`[Banta/DurableSocket] No keep-alive response in ${this.pingKeepAliveInterval}ms. Forcing reconnect... [${this.url}]`);
                    try {
                        this.handleLost(socket);
                    } catch (e) {
                        console.error(`[Banta/DurableSocket] Failed to close socket after timeout waiting for pong: ${e.message} [${this.url}]`);
                    }
                }
            }, this.pingInterval);
        }
    }

    enablePing = true;
    pingInterval = 10000;
    pingKeepAliveInterval = 25000;

    private handleMessage(socket: WebSocket, ev : MessageEvent) {
        if (this._socket !== socket) {
            this.safelyClose(socket);
            return;
        }
        
        let message = JSON.parse(ev.data);
        if (message.type === 'pong') {
            this.lastPong = Date.now();
            return;
        } else if (message.type === 'setSessionId') {
            this._sessionId = message.id;
        }
        this.dispatchSocketEvent(socket, ev);
    }

    private _closed = false;
    private handleLost(socket: WebSocket) {
        if (this._socket !== socket) {
            this.safelyClose(socket);
            return;
        }
        
        if (this._closed)
            return;
        
        if (this._ready) {
            console.log(`[Banta/DurableSocket] Connection Lost [${this.url}]`);
        }
        this.setNotReady();
        this._attempt += 1;

        clearInterval(this.pingTimer);
        this.pingTimer = null;

        this._socket?.close();
        this._socket = null;

        this.dispatchEvent({
            type: 'lost', 
            bubbles: false, 
            cancelable: false, 
            cancelBubble: false, 
            composed: false,
            currentTarget: this,
            defaultPrevented: false,
            eventPhase: 0, //Event.NONE,
            isTrusted: true,
            returnValue: undefined,
            srcElement: undefined,
            target: this,
            timeStamp: Date.now(),
            composedPath: () => [],
            initEvent: undefined,
            preventDefault() { this.defaultPrevented = true; },
            stopPropagation() { },
            stopImmediatePropagation() { },
            AT_TARGET: 2, // Event.AT_TARGET,
            BUBBLING_PHASE: 3, // Event.BUBBLING_PHASE,
            CAPTURING_PHASE: 1, //Event.CAPTURING_PHASE,
            NONE: 0, //Event.NONE
        });

        if (this.maxAttempts > 0 && this._attempt >= this.maxAttempts) {
            this.close(503, 'Service Unavailable');
            return;
        }

        this.attemptToReconnect();
    }

    private get actualReconnectTime() {
        let reconnectTime = Math.min(this.maxReconnectTime, this.reconnectTime * this._attempt * 1.5);

        return Math.min(
            this.maxReconnectTime, 
            reconnectTime + Math.random() * this.jitter * reconnectTime
        );
    }

    private _reconnectTimeout;
    private attemptToReconnect() {
        if (this._ready)
            return;
        
        console.log(`[Banta/DurableSocket] Waiting ${this.actualReconnectTime}ms before reconnect (attempt ${this._attempt}) [${this.url}]`);
        if (this._reconnectTimeout) {
            console.warn(`[Banta/DurableSocket] Warning: Attempt to schedule reconnect when there is already a reconnect timeout outstanding!`);
            clearTimeout(this._reconnectTimeout);
        }
        setTimeout(() => {
            if (this._ready)
                return;
            
            this.connect();
            clearTimeout(this._reconnectTimeout);
            this._reconnectTimeout = undefined;
        }, this.actualReconnectTime);
    }

    reconnect() {
        this._socket?.close();
        console.log(`[Banta/DurableSocket] Connection is no longer ready.`);
        this.setNotReady();
    }

    private setNotReady() {
        if (this._ready)
            console.log(`[Banta/DurableSocket] Connection is no longer ready.`);
        this._ready = false;
    }

    private setReady(socket: WebSocket) {
        if (this._ready)
            console.warn(`[Banta/DurableSocket] Connection marked ready, but it was already marked ready`);
        else
            console.log(`[Banta/DurableSocket] Connection is now ready.`);

        if (!this._ready) {
            this._ready = true;
            this.dispatchSocketEvent(socket, {
                type: 'ready', 
                bubbles: false, 
                cancelable: false, 
                cancelBubble: false, 
                composed: false,
                currentTarget: this,
                defaultPrevented: false,
                eventPhase: 0, // Event.NONE
                isTrusted: true,
                returnValue: undefined,
                srcElement: undefined,
                target: this,
                timeStamp: Date.now(),
                composedPath: () => [],
                initEvent: undefined,
                preventDefault() { this.defaultPrevented = true; },
                stopPropagation() { },
                stopImmediatePropagation() { },
                AT_TARGET: 2, // Event.AT_TARGET
                BUBBLING_PHASE: 3, // Event.BUBBLING_PHASE,
                CAPTURING_PHASE: 1, // Event.CAPTURING_PHASE,
                NONE: 0, //Event.NONE
            });
        }
    }

    private _open = false;
    reconnectTime : number = 500; // 2
    maxReconnectTime : number = 30000; // 10000
    maxAttempts = 0;
    jitter : number = 0.05;

    private _ready = false;
    private _messageQueue : any[] = [];
    private _attempt = 0;
    private _socket : WebSocket;

    private _subscribers = new Map<string, Function[]>();

    get binaryType() { return this._socket.binaryType; }
    get bufferedAmount() { return this._socket.bufferedAmount; }
    get extensions() { return this._socket.extensions; }
    get CLOSED(): typeof WebSocket.CLOSED { return WebSocket.CLOSED; }
    get CLOSING(): typeof WebSocket.CLOSING { return WebSocket.CLOSING; }
    get CONNECTING(): typeof WebSocket.CONNECTING { return WebSocket.CONNECTING; }
    get OPEN(): typeof WebSocket.OPEN { return WebSocket.OPEN; }

    get onclose() { return this._onclose; }
    get onerror() { return this._onerror; }
    get onmessage() { return this._onmessage; }
    get onopen() { return this._onopen };

    set onclose(value) {
        if (this._onclose) this.removeEventListener('close', this._onclose);
        this._onclose = value;
        if (value)
            this.addEventListener('close', value);
    }

    set onerror(value) { 
        if (this._onclose) this.removeEventListener('error', this._onerror);
        this._onerror = value;
        if (value)
            this.addEventListener('error', value);
    }

    set onmessage(value) { 
        if (this._onclose) this.removeEventListener('message', this._onmessage);
        this._onmessage = value;
        if (value)
            this.addEventListener('message', value);
    }

    set onopen(value) { 
        if (this._onclose) this.removeEventListener('open', this._onopen);
        this._onopen = value;
        if (value)
            this.addEventListener('open', value);
    }

    private _onclose: (this: WebSocket, ev: CloseEvent) => any;
    private _onerror: (this: WebSocket, ev: Event) => any;
    private _onmessage: (this: WebSocket, ev: MessageEvent) => any;
    private _onopen: (this: WebSocket, ev: Event) => any;

    get protocol() { return this._socket.protocol; }
    get readyState() { return this._socket.readyState; }

    close(code?: number, reason?: string): void {
        this._closed = true;

        this._socket?.close(code, reason);
        this._socket = null;
        
        this.dispatchEvent({
            type: 'close', 
            bubbles: false, 
            cancelable: false, 
            cancelBubble: false, 
            composed: false,
            currentTarget: this,
            defaultPrevented: false,
            eventPhase: 0, //Event.NONE,
            isTrusted: true,
            returnValue: undefined,
            srcElement: undefined,
            target: this,
            timeStamp: Date.now(),
            composedPath: () => [],
            initEvent: undefined,
            preventDefault() { this.defaultPrevented = true; },
            stopPropagation() { },
            stopImmediatePropagation() { },
            AT_TARGET: 2, //Event.AT_TARGET,
            BUBBLING_PHASE: 3, //Event.BUBBLING_PHASE,
            CAPTURING_PHASE: 1, //Event.CAPTURING_PHASE,
            NONE: 0, //Event.NONE
        });
    }
    
    get isReady() {
        return this._ready;
    }
    
    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
        if (!this._ready) {
            this._messageQueue.push(data);
        } else {
            this._socket.send(data);
        }
    }

    /**
     * Send a request immediately regardless of ready state. This should only be used during a 'restore' event handler.
     * @param data 
     */
    sendImmediately(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
        this._socket.send(data);
    }

    addEventListener<K extends keyof WebSocketEventMap>(type: K, listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;

    /**
     * Be notified when the socket has been reconnected. Can return a Promise to delay the socket being marked as ready.
     * During this call, the DurableSocket is not marked as ready, so requests to the other side will be queued until all
     * restore handlers have completed. You can bypass the queue by using sendImmediately(). You should only use that 
     * variant within a 'restore' handler.
     * @param type 
     * @param listener 
     * @param options 
     */
    addEventListener(type: 'restore', listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;

    /**
     * Be notified when socket connection has been lost.
     * @param type 
     * @param listener 
     * @param options 
     */
    addEventListener(type: 'lost', listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: any, listener: any, options?: any): void {
        this._subscribers.set(type, [ ...(this._subscribers.get(type) ?? []), listener ]);
    }

    removeEventListener<K extends keyof WebSocketEventMap>(type: K, listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: any, listener: any, options?: any): void {
        this._subscribers.set(type, [ ...(this._subscribers.get(type) ?? []).filter(x => x !== listener) ]);
    }
    
    private async dispatchSocketEvent(socket: WebSocket, event: Event) {
        if (this._socket !== socket) {
            this.safelyClose(socket);
            return;
        }

        let subs = this._subscribers.get(event.type) ?? []
        await Promise.all(subs.map(f => f(event)));
        return !event.defaultPrevented;
    }

    dispatchEvent(event: Event): boolean {
        // This one is for WebSocket compatibility. It should not be used internally.
        let subs = this._subscribers.get(event.type) ?? []
        subs.forEach(f => f(event));
        return !event.defaultPrevented;
    }
}