import { Observable, Subject } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { DurableSocket } from './durable-socket';

interface RPCMessage {
    type: string;
}

interface RPCRequest {
    type: 'request';
    id: string;
    method: string;
    parameters: any[];
}

interface RPCResponse {
    type: 'response';
    id: string;
    error: any;
    value: any;
}

interface RPCEvent {
    type: 'event';
    name: string;
    object: any;
}

function isRequest(message: RPCMessage): message is RPCRequest {
    return message.type === 'request';
}

function isResponse(message: RPCMessage): message is RPCResponse {
    return message.type === 'response';
}

function isEvent(message: RPCMessage): message is RPCEvent {
    return message.type === 'event';
}

export interface RpcCallableOptions {
    /**
     * When true, this call is done in "immediate mode", where the underlying socket message 
     * is sent immediately without being queued if the connection is not marked as ready, 
     */
    immediate?: boolean;
}

export function RpcCallable(options?: RpcCallableOptions) {
    return (target, propertyKey) => {
        if (Reflect.defineMetadata) {
            Reflect.defineMetadata('rpc:type', 'call', target, propertyKey);
            Reflect.defineMetadata('rpc:callableOptions', options ?? {}, target, propertyKey);
        } else {
            console.warn(`[Banta] Warning: reflect-metadata must be loaded for Banta to work properly`);
        }
    }
}

export function RpcEvent() {
    return (target, propertyKey) => {
        if (Reflect.defineMetadata)
            Reflect.defineMetadata('rpc:type', 'event', target, propertyKey);
        else
            console.warn(`[Banta] Warning: reflect-metadata must be loaded for Banta to work properly`);
    }
}

export interface Peer {
    [name: string]: (...args) => Promise<any>;
}

export interface CallOptions {
    /**
     * If true, this request can be held and retried when connection is re-established.
     * If false, a disconnect while the request is outstanding will cause it to throw 
     * an error.
     */
    idempotent?: boolean;

    /**
     * If true, this request should never be queued for sending, even if the message was 
     * never sent as the request to send it came in when the socket was disconnected.
     */
    immediate?: boolean;
}

export interface PendingCall {
    id: string;
    request: RPCRequest;
    options: CallOptions;
    idempotent: boolean;
    handler: (response: RPCResponse) => void;
}

export class SocketRPC<PeerT = Peer> {
    constructor() {
        this._peer = this.createPeer({ immediate: false });
        this._immediatePeer = this.createPeer({ immediate: true });
        this._idempotentPeer = this.createPeer({ idempotent: true });
    }

    private createPeer(options: CallOptions) {
        let self = this;
        let methodMap = new Map<string | symbol, Function>();
        return <PeerT>new Proxy({}, {
            get(target, methodName, receiver) {
                if (methodMap.has(methodName))
                    return methodMap.get(methodName);
                
                const method = (...parameters) => self.call(options, String(methodName), ...parameters);
                methodMap.set(methodName, method);
                return method;
            }
        })
    }

    async bind(socket: WebSocket): Promise<this> {
        if (this._socket)
            throw new Error(`Already bound`);

        this._socket = socket;
        this._socket.onmessage = ev => this.onReceiveMessage(JSON.parse(ev.data));
        this._socket.onerror = ev => console.error(`[Banta/RPC] Socket reports error.`);

        if (this._socket instanceof DurableSocket) {
            console.log(`[Banta/RPC] Detected DurableSocket, enabling enhancements`);
            this._socket.addEventListener('lost', () => this.handleStateLost());
            this._socket.addEventListener('ready', () => this.resendQueuedRequests());
        }

        return this;
    }

    private _peer: PeerT;
    private _immediatePeer: PeerT;
    private _idempotentPeer: PeerT;
    private _socket: WebSocket;
    private _callMap = new Map<string, PendingCall>();
    private _eventMap = new Map<string, Subject<any>>();

    get peer() { return this._peer; }

    /**
     * Get a peer proxy which performs all of its calls in "immediate mode". Immediate mode
     * bypasses the message queue and attempts to send the message on the socket immediately even if 
     * it appears the socket is not ready. This is needed when sending messages to Banta during the 'restore'
     * event handler of DurableSocket.
     */
    get immediatePeer() { return this._immediatePeer; }

    /**
     * Get a peer proxy which performs all of its calls in "idempotent mode". Idempotent requests
     * can be resent if connection fails after the initial request was sent, because it is assumed the 
     * server will correctly discard the request if it has already been processed.
     */
    get idempotentPeer() { return this._idempotentPeer; }
    private getEventInternal(name: string) {
        if (!this._eventMap.has(name)) {
            this._eventMap.set(name, new Subject<any>());
        }

        return this._eventMap.get(name);
    }

    private rawSend(message: RPCMessage, immediate = false) {
        if (this._socket instanceof DurableSocket) {
            if (immediate) {
                this._socket.sendImmediately(JSON.stringify(message));
            } else {
                this._socket.send(JSON.stringify(message));
            }
        } else {
            this._socket.send(JSON.stringify(message));
        }
    }

    sendEvent<EventT>(name: string, object: EventT) {
        this.rawSend(<RPCEvent>{ type: 'event', name, object });
    }

    reconnect() {
        if (this._socket instanceof DurableSocket)
            this._socket.reconnect();
    }

    call<ResponseT>(options: CallOptions, method: string, ...parameters: any[]): Promise<ResponseT> {
        let rpcRequest = <RPCRequest>{
            type: 'request',
            id: uuid(),
            method,
            parameters
        };
        
        return new Promise<ResponseT>((resolve, reject) => {
            this.startCall({
                id: rpcRequest.id,
                request: rpcRequest,
                options,
                idempotent: options.idempotent,
                handler: (response: RPCResponse) => {
                    if (response.error)
                        reject(response.error);
                    else
                        resolve(response.value);
                }
            });
        });
    }

    private startCall(request: PendingCall) {
        // Short circuit: If we are not currently connected and the call is idempotent, go directly to 
        // retry queue.
        if (this._socket instanceof DurableSocket && !this._socket.isReady && request.options.idempotent) {
            console.warn(`[Banta/RPC] Call ${request.request.method}() is being scheduled to send when connection is restored.`);
            this.retryOnReconnectQueue.push(request);
            return;
        }

        this._callMap.set(request.id, request);
        this.rawSend(request.request, request.options.immediate ?? false);
    }

    private retryOnReconnectQueue: PendingCall[] = [];

    private resendQueuedRequests() {
        let calls = this.retryOnReconnectQueue.splice(0);
        if (calls.length > 0)
            console.log(`[Banta/RPC] Resending ${calls.length} idempotent call requests...`);

        calls.forEach(req => this.startCall(req));
    }

    private handleStateLost() {
        let failed = 0;
        let rescheduled = 0;
        for (let [ id, request ] of Array.from(this._callMap.entries())) {
            if (request.idempotent) {
                this.retryOnReconnectQueue.push(request);
                rescheduled += 1;
                continue;
            }

            request.handler({ id, type: 'response', error: new Error(`Connection was lost`), value: undefined });
            failed += 1;
        }

        this._callMap.clear();
        
        if (failed > 0)
            console.error(`[Banta/RPC] Failed ${failed} in-flight requests due to connection failure`);
        if (rescheduled > 0)
            console.warn(`[Banta/RPC] Rescheduled ${rescheduled} in-flight requests due to connection failure`);

    }

    protected async onReceiveMessage(message: RPCMessage) {
        if (isRequest(message)) {
            if (this.getRpcType(message.method) === 'call' && typeof this[message.method] === 'function') {
                let value;
                let error;
                
                try {
                    value = await this[message.method](...message.parameters);
                } catch (e) {
                    if (e instanceof Error) {
                        error = { message: e.message, stack: e.stack };
                    } else {
                        error = e;
                    }
                }

                this.rawSend(<RPCResponse>{
                    type: 'response',
                    id: message.id,
                    value, error
                });

                return;
            } else {
                this.rawSend(<RPCResponse>{
                    type: 'response',
                    id: message.id,
                    error: { code: 'invalid-call', message: `No such method '${message.method}'` }
                });
            }

            return;
        }

        if (isResponse(message)) {
            let { request, handler } = this._callMap.get(message.id);
            if (!handler) {
                console.error(`Received response to unknown request '${message.id}'`);
                return;
            }

            this._callMap.delete(message.id);
            handler(message);
            return;
        }

        if (isEvent(message)) {
            if (this.getRpcType(message.name) === 'event') {
                this[message.name](message.object);
                return;
            } else {
                console.error(`Unsupported event type '${message.name}' received.`);
                return;
            }
        }

        if (message.type === 'ping') {
            this.rawSend({ type: 'pong' });
            return;
        }

        console.error(`Unknown message type from server '${message.type}'`);
    }

    private getRpcType(name: string) {
        return Reflect.getMetadata('rpc:type', this.constructor.prototype, name) || 'none';
    }

    private getRpcCallableOptions(name: string): RpcCallableOptions {
        return Reflect.getMetadata('rpc:callableOptions', this.constructor.prototype, name) ?? {};
    }

    close() {
        this._socket.close();
    }
}