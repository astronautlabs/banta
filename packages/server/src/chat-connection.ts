import { ChatMessage, RpcCallable, SocketRPC, User } from "@banta/common";
import * as mongodb from 'mongodb';
import { ChatService, Like } from "./chat.service";
import { PubSub } from "./pubsub";

export interface ChatPubSubEvent {
    message: ChatMessage;
    like: Like;
}

export class ChatConnection extends SocketRPC {
    constructor(
        readonly chat: ChatService
    ) {
        super();
    }

    userToken: string;
    user: User;
    topicId: string;
    parentMessage: ChatMessage;

    @RpcCallable()
    authenticate(token: string) {
        let user = this.chat.validateToken(token);
        this.user = user;
        this.userToken = token;
    }

    private async sendChatMessage(message: ChatMessage) {
        message = Object.assign({}, message);
        message.userState = {
            liked: false
        };

        if (this.user) {
            let like = await this.chat.likes.findOne({ messageId: message.id, userId: this.user.id });
            message.userState.liked = !!like;
        }

        this.sendEvent('onChatMessage', message);
    }

    @RpcCallable()
    async subscribe(topicId: string, parentMessageId?: string) {

        if (parentMessageId) {
            let parentMessage = await this.chat.getMessage(parentMessageId);
            if (!parentMessage) {
                throw new Error(`No such parent message '${parentMessageId}'`);
            }
            this.parentMessage = parentMessage;
        } else {
            this.parentMessage = null;
        }

        this.topicId = topicId;

        this.pubsub = new PubSub<ChatPubSubEvent>(this.chat.pubsubs, topicId);
        this.pubsub.subscribe(async message => {
            if (message.message) {
                // A message has been created/updated

                let chatMessage = message.message;
                if (this.parentMessage) {
                    if (chatMessage.parentMessageId !== this.parentMessage.id)
                        return;
                } else {
                    if (chatMessage.parentMessageId)
                        return;
                }

                if (chatMessage.topicId !== topicId)
                    return;
                
                await this.sendChatMessage(chatMessage);
            } else if (message.like) {
                // A like has just occurred
                let like = message.like;

                if (this.user?.id === like.userId) {
                    // This like is for _us_
                    // Send an updated message down to the client so it knows that it has liked a message.

                    let message = await this.chat.getMessage(like.messageId);
                    if (message)
                        this.sendChatMessage(message);
                }
            }
        });

        // Get the initial batch of messages

        let initialMessages = await this.chat.messages.find({ 
            topicId: this.topicId, 
            parentMessageId: this.parentMessage?.id 
        }, { limit: 100 }).toArray();

        for (let item of initialMessages) {
            await this.sendChatMessage(item);
        }
    }

    pubsub: PubSub<ChatPubSubEvent>;

    @RpcCallable()
    async sendMessage(message: ChatMessage): Promise<ChatMessage> {
        message.topicId = this.topicId;
        message.parentMessageId = this.parentMessage?.id;
        message.user = this.user;

        if (!this.user)
            throw new Error(`You must be signed in to send messages.`);
        
        if (!message)
            throw new Error(`You must provide a message to send`);

        if (!message.topicId)
            throw new Error(`You must specify a topic ID`);

        if (!message.message)
            throw new Error(`Cannot post an empty message`);

        this.chat.authorizeAction(this.user, this.userToken, {
            action: 'postMessage',
            message,
            parentMessage: message.parentMessageId ? await this.chat.getMessage(message.parentMessageId) : null,
            topic: await this.chat.getTopic(message.topicId)
        });

        return this.chat.postMessage(message);
    }

    @RpcCallable()
    async getMessage(id: string): Promise<ChatMessage> {
        let message = await this.chat.getMessage(id);
        let notFound = new Error(`Not found`);

        if (!message)
            throw notFound;

        this.chat.authorizeAction(this.user, this.userToken, { 
            action: 'viewTopic', 
            topic: await this.chat.getTopic(message.topicId),
            message,
            parentMessage: message.parentMessageId ? await this.chat.getMessage(message.parentMessageId) : null
        });

        return message;
    }

    @RpcCallable()
    async likeMessage(id: string) {
        let message = await this.chat.getMessage(id);

        if (!message) 
            throw new Error(`No such message with ID '${id}'`);
        this.chat.authorizeAction(this.user, this.userToken, {
            action: 'likeMessage',
            message,
            parentMessage: message.parentMessageId ? await this.chat.getMessage(message.parentMessageId) : null,
            topic: await this.chat.getTopic(message.topicId)
        });

        console.log(`LIKING`);
        await this.chat.like(message, this.user);
    }

    @RpcCallable()
    async unlikeMessage(id: string) {
        console.log('UNLIKING');
        let message = await this.chat.getMessage(id);

        if (!message) 
            throw new Error(`No such message with ID '${id}'`);
        this.chat.authorizeAction(this.user, this.userToken, {
            action: 'likeMessage',
            message,
            parentMessage: message.parentMessageId ? await this.chat.getMessage(message.parentMessageId) : null,
            topic: await this.chat.getTopic(message.topicId)
        });

        await this.chat.unlike(message, this.user);
    }
}