import { ChatMessage, CommentsOrder, RpcCallable, SocketRPC, User } from "@banta/common";
import { ChatService, Like, Topic } from "./chat.service";
import { PubSub } from "./pubsub";

export interface ChatSourcePermissions {
    canEdit: boolean;
    canPost: boolean;
    canLike: boolean;
}

export interface ChatPubSubEvent {
    message?: ChatMessage;
    like?: Like;
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
    async authenticate(token: string) {
        let user = this.chat.validateToken(token);
        this.user = user;
        this.user.token = token;
        this.userToken = token;
        this.sendPermissions();
    }

    private sendPermissions() {
        if (!this.user || !this.topic) {
            this.sendEvent('onPermissions', <ChatSourcePermissions>{
                canEdit: false,
                canLike: false,
                canPost: false
            });
            return;
        }

        this.sendEvent('onPermissions', <ChatSourcePermissions>{
            canPost: this.chat.checkAuthorization(this.user, this.userToken, {
                action: 'postMessage',
                topic: this.topic
            }),
            canEdit: this.chat.checkAuthorization(this.user, this.userToken, {
                action: 'editMessage',
                topic: this.topic
            }),
            canLike: this.chat.checkAuthorization(this.user, this.userToken, {
                action: 'likeMessage',
                topic: this.topic
            })
        });
    }

    private async sendChatMessage(message: ChatMessage) {
        message = Object.assign({}, message);
        message.userState = {
            liked: false
        };

        // Don't send hidden messages.

        if (message.hidden)
            return;

        if (this.user) {
            let like = await this.chat.likes.findOne({ messageId: message.id, userId: this.user.id });
            message.userState.liked = !!like;
        }

        this.sendEvent('onChatMessage', message);
    }

    topic: Topic;

    @RpcCallable()
    async loadAfter(messageId: string, count: number) {
        // TODO: This needs to be rethunk.
    }

    @RpcCallable()
    async editMessage(messageId: string, newText: string) {
        if (!this.user)
            throw new Error(`You must be signed in to edit your messages.`);

        let message = await this.getMessage(messageId);

        if (message.user.id !== this.user.id)
            throw new Error(`You can only edit your own messages.`);

        this.chat.authorizeAction(this.user, this.userToken, {
            action: 'editMessage',
            topic: this.topic,
            parentMessage: this.parentMessage,
            message: message
        });

        await this.chat.editMessage(message, newText);
    }

    sortOrder: CommentsOrder;

    @RpcCallable()
    async subscribe(topicId: string, parentMessageId: string, order: CommentsOrder) {
        this.sortOrder = order ?? CommentsOrder.NEWEST;

        if (parentMessageId) {
            let parentMessage = await this.chat.getMessage(parentMessageId);
            if (!parentMessage) {
                throw new Error(`No such parent message '${parentMessageId}'`);
            }
            this.parentMessage = parentMessage;
        } else {
            this.parentMessage = null;
        }

        this.topic = await this.chat.getOrCreateTopic(topicId);
        this.topicId = topicId;

        this.sendPermissions();

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
        let sort = this.getSortOrder();

        let initialMessages = await this.chat.messages.find(
            this.getFilter(), 
            { 
                limit: 100,
                sort
            }).toArray();

        for (let item of initialMessages) {
            console.log(`MESSAGE: ${item.message}`);
            await this.sendChatMessage(item);
        }
    }

    private getFilter(): any {
        return { 
            topicId: this.topicId, 
            parentMessageId: this.parentMessage?.id,
            $or: [
                { hidden: undefined },
                { hidden: false }
            ]
        }
    }
    private getSortOrder(): any {
        if (this.sortOrder === CommentsOrder.NEWEST) {
            return { sentAt: 1 };
        } else if (this.sortOrder === CommentsOrder.LIKES) {
            return { likes: 1 }
        } else if (this.sortOrder === CommentsOrder.OLDEST) {
            return { sentAt: -1 }
        }

        return { sentAt: 1 };
    }

    pubsub: PubSub<ChatPubSubEvent>;

    @RpcCallable()
    async sendMessage(message: ChatMessage): Promise<ChatMessage> {
        message.topicId = this.topicId;
        message.parentMessageId = this.parentMessage?.id;
        message.user = { ...this.user };
        delete message.user.token;

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

        if (message.topicId !== this.topicId)
            throw notFound;
        
        if (!!this.parentMessage != !!message.parentMessageId)
            throw notFound;
        
        if (this.parentMessage && this.parentMessage.id !== message.parentMessageId)
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

        await this.chat.like(message, this.user);
    }

    @RpcCallable()
    async unlikeMessage(id: string) {
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