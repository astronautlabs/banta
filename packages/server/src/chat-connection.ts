import { ChatMessage, ChatPermissions, CommentsOrder, RpcCallable, SocketRPC, User } from "@banta/common";
import { ChatService, Like, Topic } from "./chat.service";
import { PubSub } from "./pubsub";

export interface ChatPubSubEvent {
    message?: ChatMessage;
    like?: Like;
}

export class ChatConnection extends SocketRPC {
    constructor(
        readonly chat: ChatService,
        readonly ipAddress: string,
        readonly userAgent: string
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
        user.ipAddress = this.ipAddress;
        user.userAgent = this.userAgent;

        this.user = user;
        this.user.token = token;
        this.userToken = token;
        this.sendPermissions();
    }

    private sendPermissions() {
        if (!this.user || !this.topic) {
            this.sendEvent('onPermissions', <ChatPermissions>{
                canEdit: false,
                canLike: false,
                canPost: false,
                canDelete: false
            });
            return;
        }

        this.sendEvent('onPermissions', <ChatPermissions>{
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
            }),
            canDelete: this.chat.checkAuthorization(this.user, this.userToken, {
                action: 'deleteMessage',
                topic: this.topic
            })
        });
    }

    private async sendChatMessage(message: ChatMessage) {
        message = await this.prepareMessage(message);
        this.sendEvent('onChatMessage', message);
    }

    private async prepareMessage(message: ChatMessage) {
        message = Object.assign({}, message);
        message.userState = {
            liked: false
        };

        // Remove any private information from the user object
        // before sending to the chat participants.
        delete message.user?.token;
        delete message.user?.ipAddress;
        delete message.user?.userAgent;

        if (this.user) {
            let like = await this.chat.likes.findOne({ messageId: message.id, userId: this.user.id });
            message.userState.liked = !!like;
        }

        return message;
    }

    topic: Topic;

    @RpcCallable()
    async loadAfter(offset: number, count: number) {
        return Promise.all(
            (await this.chat.messages.find(this.getFilter(), { 
                sort: this.getSortOrder(),
                skip: offset + 1,
                limit: Math.min(100, count)
            })
            .toArray())
            .map((m, i) => (m.pagingCursor = String(offset + 1 + i), m))
            .map(m => this.prepareMessage(m))
        );
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
    async deleteMessage(messageId: string) {
        let message = await this.chat.getMessage(messageId);

        if (!this.user)
            throw new Error(`You must be signed in to delete your messages.`);

        if (message.user?.id !== this.user.id)
            throw new Error(`You can only delete your own messages.`);

        this.chat.authorizeAction(this.user, this.userToken, {
            action: 'deleteMessage',
            message,
            parentMessage: message.parentMessageId ? await this.chat.getMessage(message.parentMessageId, false) : null,
            topic: await this.chat.getTopic(message.topicId, false)
        });

        await this.chat.setMessageHiddenStatus(messageId, true);
    }

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
                if (!this.ownsMessage(chatMessage))
                    return;

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
                    
                    if (message && this.ownsMessage(message))
                        this.sendChatMessage(message);
                }
            }
        });
    }

    private ownsMessage(chatMessage: ChatMessage, allowSubMessages = false) {
        if (allowSubMessages && !this.parentMessage && chatMessage.topicId === this.topicId)
            return true;

        if (this.parentMessage) {
            if (chatMessage.parentMessageId !== this.parentMessage.id)
                return false;
        } else {
            if (chatMessage.parentMessageId)
                return false;
        }

        return chatMessage.topicId === this.topicId;
    }

    @RpcCallable()
    async getExistingMessages() {
        let sort = this.getSortOrder();
        let initialMessages = <ChatMessage[]>await this.chat.messages.find(
            this.getFilter(), { limit: 20, sort }).toArray();

        initialMessages = await Promise.all(initialMessages.map(async (m, i) => {
            let message = await this.prepareMessage(m);
            message.pagingCursor = String(i);
            return <ChatMessage>message;
        }));

        return initialMessages;
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
            return { sentAt: -1 };
        } else if (this.sortOrder === CommentsOrder.LIKES) {
            return { likes: -1 }
        } else if (this.sortOrder === CommentsOrder.OLDEST) {
            return { sentAt: 1 }
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

        if (!this.ownsMessage(message, true))
            throw notFound;
        
        if (message.hidden)
            throw notFound;
        
        this.chat.authorizeAction(this.user, this.userToken, { 
            action: 'viewTopic', 
            topic: await this.chat.getTopic(message.topicId),
            message,
            parentMessage: message.parentMessageId ? await this.chat.getMessage(message.parentMessageId) : null
        });

        message = await this.prepareMessage(message);
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