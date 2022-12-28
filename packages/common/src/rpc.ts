import { Observable, Subject } from 'rxjs';
import { v4 as uuid } from 'uuid';

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

export function RpcCallable() {
    return (target, propertyKey) => {
        Reflect.defineMetadata('rpc:type', 'call', target, propertyKey);
    }
}

export function RpcEvent() {
    return (target, propertyKey) => {
        Reflect.defineMetadata('rpc:type', 'event', target, propertyKey);
    }
}

export interface Peer {
    [name: string]: (...args) => Promise<any>;
}

export class SocketRPC<PeerT = Peer> {
    constructor() {
        let self = this;
        this._peer = <PeerT>new Proxy({}, {
            get(target, methodName, receiver) {
                return (...parameters) => self.call(String(methodName), ...parameters);
            }
        })
    }

    async bind(socket: WebSocket): Promise<this> {
        if (this._socket)
            throw new Error(`Already bound`);

        this._socket = socket;
        this._socket.onmessage = ev => this.onReceiveMessage(JSON.parse(ev.data));
        return this;
    }

    private _peer: PeerT;
    private _socket: WebSocket;
    private _requestMap = new Map<string, (response: any) => void>();
    private _eventMap = new Map<string, Subject<any>>();

    get peer() { return this._peer; }

    private getEventInternal(name: string) {
        if (!this._eventMap.has(name)) {
            this._eventMap.set(name, new Subject<any>());
        }

        return this._eventMap.get(name);
    }

    private rawSend(message: RPCMessage) {
        this._socket.send(JSON.stringify(message));
    }

    sendEvent<EventT>(name: string, object: EventT) {
        this.rawSend(<RPCEvent>{ type: 'event', name, object });
    }

    call<ResponseT>(method: string, ...parameters: any[]): Promise<ResponseT> {
        let rpcRequest = <RPCRequest>{
            type: 'request',
            id: uuid(),
            method,
            parameters
        };
        
        return new Promise<ResponseT>((resolve, reject) => {
            this._requestMap.set(rpcRequest.id, (response: RPCResponse) => {
                if (response.error)
                    reject(response.error);
                else
                    resolve(response.value);
            });

            this.rawSend(rpcRequest);
        });
    }

    private async onReceiveMessage(message: RPCMessage) {
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
            let handler = this._requestMap.get(message.id);
            if (!handler) {
                console.error(`Received response to unknown request '${message.id}'`);
                return;
            }

            this._requestMap.delete(message.id);
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

    close() {
        this._socket.close();
    }
}