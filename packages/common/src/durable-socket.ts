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
        readonly protocols? : string | string[]
    ) {
        this.connect();
    }

    private connect() {
        let connected = false;
        this._socket = new WebSocket(this.url, this.protocols);
        this._socket.onopen = ev => (connected = true, this.handleConnect(ev));
        this._socket.onerror = ev => this.dispatchEvent(ev);
        this._socket.onclose = ev => this.handleLost();
        this._socket.onmessage = ev => this.handleMessage(ev);
    }

    private pingTimer;
    private lastPong : number = 0;

    private handleConnect(ev : Event) {
        let first = !this._open;
        if (first) {
            this.dispatchEvent(ev);
            this._open = true;
        }

        this._ready = true;
        this._attempt = 0;
        this._messageQueue.splice(0).forEach(m => this._socket.send(m));

        if (!first) {
            console.log(`[Socket] Connection Restored [${this.url}]`);
            this.dispatchEvent({
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
        }

        this.lastPong = Date.now();
        if (this.enablePing) this.pingTimer = setInterval(() => {
            if (this._closed) {
                clearInterval(this.pingTimer);
                return;
            }
            
            try {
                this.send(JSON.stringify({ type: 'ping' }));
            } catch (e) {
                console.error(`[Socket] Failed to send ping message. Assuming connection is broken. [${this.url}]`);
                try {
                    this._socket?.close();
                } catch (e) {
                    console.error(`[Socket] Failed to close socket after ping failure: ${e.message} [${this.url}]`);
                }
                return;
            }

            if (this.lastPong < Date.now() - this.pingKeepAliveInterval) {
                console.log(`[Socket] No keep-alive response in ${this.pingKeepAliveInterval}ms. Forcing reconnect... [${this.url}]`);
                try {
                    this._socket?.close();
                } catch (e) {
                    console.error(`[Socket] Failed to close socket after timeout waiting for pong: ${e.message} [${this.url}]`);
                }
            }
        }, this.pingInterval);
    }

    enablePing = true;
    pingInterval = 10000;
    pingKeepAliveInterval = 25000;

    private handleMessage(ev : MessageEvent) {
        let message = JSON.parse(ev.data);
        if (message.type === 'pong') {
            this.lastPong = Date.now();
            return;
        }
        this.dispatchEvent(ev);
    }

    private _closed = false;
    private handleLost() {
        if (this._closed)
            return;
        
        if (this._ready) {
            console.log(`[Socket] Connection Lost [${this.url}]`);
        }
        this._ready = false;
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

        this.reconnect();
    }

    private get actualReconnectTime() {
        let reconnectTime = Math.min(this.maxReconnectTime, this.reconnectTime * this._attempt * 1.5);

        return Math.min(
            this.maxReconnectTime, 
            reconnectTime + Math.random() * this.jitter * reconnectTime
        );
    }

    private reconnect() {
        console.log(`[Socket] Waiting ${this.actualReconnectTime}ms before reconnect (attempt ${this._attempt}) [${this.url}]`);
        setTimeout(() => this.connect(), this.actualReconnectTime);
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
    get CLOSED() { return WebSocket.CLOSED; }
    get CLOSING() { return WebSocket.CLOSING; }
    get CONNECTING() { return WebSocket.CONNECTING; }
    get OPEN() { return WebSocket.OPEN; }

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
    private _onerror: (this: WebSocket, ev: ErrorEvent) => any;
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
    
    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
        if (!this._ready) {
            this._messageQueue.push(data);
        } else {
            this._socket.send(data);
        }
    }

    addEventListener<K extends keyof WebSocketEventMap>(type: K, listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: any, listener: any, options?: any): void {
        this._subscribers.set(type, [ ...(this._subscribers.get(type) ?? []), listener ]);
    }

    removeEventListener<K extends keyof WebSocketEventMap>(type: K, listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: any, listener: any, options?: any): void {
        this._subscribers.set(type, [ ...(this._subscribers.get(type) ?? []).filter(x => x !== listener) ]);
    }
    
    dispatchEvent(event: Event): boolean {
        let subs = this._subscribers.get(event.type) ?? []
        subs.forEach(f => f(event));
        return !event.defaultPrevented;
    }
}