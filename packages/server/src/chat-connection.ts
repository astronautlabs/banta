import { ChatMessage, ChatPermissions, CommentsOrder, FilterMode, RpcCallable, SocketRPC, Topic, User } from "@banta/common";
import { AuthorizableAction, ChatService, Like } from "./chat.service";
import { PubSub } from "./pubsub";
import * as mongodb from 'mongodb';
import { Logger, LogOptions } from "@alterior/logging";
import { v4 as uuid } from 'uuid';

export interface ChatPubSubEvent {
    message?: ChatMessage;
    like?: Like;
}

export class ChatConnection extends SocketRPC {
    constructor(
        readonly id: string,
        readonly chat: ChatService,
        readonly ipAddress: string,
        readonly userAgent: string,
        private logger: Logger
    ) {
        chat.activeConnections += 1;
        super();
        this.logContext = this.logger.context;
        this.logContextLabel = this.logger.contextLabel;
    }

    userToken: string;
    user: User;
    topicId: string;
    parentMessage: ChatMessage;
    readonly logContext: Record<string, any>;
    readonly logContextLabel: string;

    protected override async onReceiveMessage(message): Promise<void> {
        await this.logger.withContext(this.logContext, this.logContextLabel, async () => {
            await super.onReceiveMessage(message);
        });
    }

    override async bind(socket: WebSocket): Promise<this> {
        let context = this.logger.context;
        let contextLabel = this.logger.contextLabel;

        socket.addEventListener('close', () => {
            this.chat.activeConnections -= 1;
            this.logInfo(`Disconnected.`);
        });
        return await super.bind(socket);
    }

    @RpcCallable()
    async authenticate(token: string) {
        let user: User;
        let startedAt = Date.now();

        try {
            user = await this.chat.validateToken(token);
        } catch (e) {
            this.logError(`Token validation failed during authentication: ${e.message}. Token was: '${token}'`);
            throw e;
        }

        user.ipAddress = this.ipAddress;
        user.userAgent = this.userAgent;

        this.logInfo(`Authenticated as @${user.username}, ID: ${user.id || user.uid} (took ${Date.now() - startedAt} ms)`);

        this.user = user;
        this.user.token = token;
        this.userToken = token;

        await this.sendPermissions();
    }

    private async precheckAuthorization(action: AuthorizableAction): Promise<string> {
        try {
            await this.chat.authorizeAction(this.user, this.userToken, {
                ...action,
                precheck: true,
                connectionMetadata: this.metadata
            });
        } catch (e) {
            return e.message;
        }
    }

    private async sendPermissions() {
        if (!this.user || !this.topic) {
            this.sendEvent('onPermissions', <ChatPermissions>{
                canEdit: false,
                canLike: false,
                canPost: false,
                canDelete: false
            });
            return;
        }

        let postErrorMessage = await this.precheckAuthorization({
            action: 'postMessage',
            topic: this.topic
        });
        let editErrorMessage = await this.precheckAuthorization({
            action: 'editMessage',
            topic: this.topic
        });
        let likeErrorMessage = await this.precheckAuthorization({
            action: 'likeMessage',
            topic: this.topic
        });
        let deleteErrorMessage = await this.precheckAuthorization({
            action: 'deleteMessage',
            topic: this.topic
        });

        this.sendEvent('onPermissions', <ChatPermissions>{
            canPost: !postErrorMessage,
            canPostErrorMessage: postErrorMessage,
            canEdit: !editErrorMessage,
            canEditErrorMessage: editErrorMessage,
            canLike: !likeErrorMessage,
            canLikeErrorMessage: likeErrorMessage,
            canDelete: !deleteErrorMessage,
            canDeleteErrorMessage: deleteErrorMessage
        });
    }

    /**
     * Send the chat message to the client. This does not mean "the user is sending a message".
     * This is called whenever a new or updated message needs to ber sent to the client for use.
     * @param message 
     */
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
            let like = await this.chat.getLike(this.user.id, message.id);
            message.userState.liked = !!like;
        }

        return message;
    }

    topic: Topic;

    @RpcCallable()
    async loadAfter(offset: number, count: number) {
        let startedAt = Date.now();
        this.logInfo(`Loading more messages (offset=${offset}, count=${count})`);

        let results = await Promise.all(
            (await this.chat.messages.find(this.getFilter(), { 
                sort: this.getSortOrder(),
                skip: offset + 1,
                limit: Math.min(100, count)
            })
            .toArray())
            .map((m, i) => (m.pagingCursor = String(offset + 1 + i), m))
            .map(m => this.prepareMessage(m))
        );

        let time = Date.now() - startedAt;
        this.logInfo(`... Returning ${results.length} more messages to client (took ${time} ms)`);
        return results;
    }

    @RpcCallable()
    async editMessage(messageId: string, newText: string) {
        if (!this.user) {
            this.logError(`Attempted to edit message ${messageId || '<none>'} without signing in. Content was: '${newText}'`);
            throw new Error(`You must be signed in to edit your messages.`);
        }

        let message = await this.getMessage(messageId);

        if (message.user.id !== this.user.id) {
            this.logError(`Attempted to edit message ${messageId || '<none>'} not owned by current user ${this.user.id}. Content was: '${newText}'`);
            throw new Error(`You can only edit your own messages.`);
        }

        try {
            await this.chat.doAuthorizeAction(this.user, this.userToken, {
                action: 'editMessage',
                topic: this.topic,
                parentMessage: this.parentMessage,
                message: message,
                connectionMetadata: this.metadata
            });
        } catch (e) {
            this.logError(`Error authenticating while attempting to edit message ${messageId || '<none>'}: '${e.message}' -- Content was: '${newText}'`);
            throw e;
        }
        await this.chat.editMessage(message, newText);
    }

    sortOrder: CommentsOrder;
    filterMode: FilterMode;

    /**
     * Arbitrary metadata provided by the client. This is ignored by Banta.
     */
    metadata: Record<string, any> = {};

    @RpcCallable()
    async deleteMessage(messageId: string) {
        if (!this.user) {
            this.logError(`Attempted to delete message '${messageId}' while not signed in.`);
            throw new Error(`You must be signed in to delete your messages.`);
        }

        let message = await this.chat.getUnpreparedMessage(messageId);

        if (message.user?.id !== this.user.id) {
            this.logError(`Attempted to delete message ${messageId} not owned by current user ${this.user.id}`);
            throw new Error(`You can only delete your own messages.`);
        }

        await this.chat.doAuthorizeAction(this.user, this.userToken, {
            action: 'deleteMessage',
            message,
            parentMessage: message.parentMessageId ? await this.chat.getUnpreparedMessage(message.parentMessageId, false) : null,
            topic: await this.chat.getTopic(message.topicId, false),
            connectionMetadata: this.metadata
        });

        await this.chat.deleteMessage(message);
    }

    /**
     * Subscribe to a topic. A Banta connection may only connect to a single source at a time. After subscribing, the 
     * messageReceived event will be fired with the backlog of messages as well as for all new messages received.
     * 
     * @param topicId The topic to subscribe to
     * @param parentMessageId The message within the topic to subscribe to (for replies), or undefined for top level messages
     * @param order The desired order to receive messages
     * @param filterMode Filter to use when receiving messages
     * @param metadata Arbitrary metadata which can be passed from the frontend to the application-specific backend. Banta ignores this.
     */
    @RpcCallable()
    async subscribe(
        topicId: string, 
        parentMessageId: string | undefined, 
        order: CommentsOrder, 
        filterMode: FilterMode,
        metadata?: Record<string, any>
    ) {
        this.sortOrder = order ?? CommentsOrder.NEWEST;
        this.filterMode = filterMode ?? FilterMode.ALL;
        this.metadata = metadata;

        if (parentMessageId) {
            let parentMessage = await this.chat.getUnpreparedMessage(parentMessageId);
            if (!parentMessage) {
                this.logError(`Attempted to subscribe to replies for ${parentMessageId} but that message does not exist.`);
                throw new Error(`No such parent message '${parentMessageId}'`);
            }
            this.parentMessage = parentMessage;
        } else {
            this.parentMessage = null;
        }

        this.topic = topicId != '-' ? await this.chat.getOrCreateTopicCached(topicId) : null;
        this.topicId = topicId;

        await this.sendPermissions();

        this.pubsub = new PubSub<ChatPubSubEvent>(this.chat.pubsubs, topicId === '-' ? null : topicId);
        this.pubsub.subscribe(async message => {
            if (message.message) {
                // A message has been created/updated

                let chatMessage = message.message;
                if (!this.ownsMessage(chatMessage))
                    return;

                if (topicId != '-' && chatMessage.topicId !== topicId)
                    return;
                
                await this.sendChatMessage(chatMessage);
            } else if (message.like) {
                // A like has just occurred
                let like = message.like;

                if (this.user?.id === like.userId) {
                    // This like is for _us_
                    // Send an updated message down to the client so it knows that it has liked a message.

                    let message = await this.chat.getUnpreparedMessage(like.messageId);
                    
                    if (message && this.ownsMessage(message))
                        this.sendChatMessage(message);
                }
            }
        });
    }

    private ownsMessage(chatMessage: ChatMessage, allowSubMessages = false) {
        if (this.topicId === '-')
            return true;
        
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

    log(message: string, options?: LogOptions, alwaysLog = false) {
        options ??= { severity: 'info' };
        options.severity ??= 'info';

        if (!alwaysLog && !['error', 'warning'].includes(options?.severity) && process.env.BANTA_LOG_SESSIONS === '0')
            return;

        try {
            let prefix = '';
            if (this.topicId)
                prefix += `#${this.topicId}`;
            if (this.user)
                prefix += `@${this.user.username || this.user.id || '<unknown>'} `;

            this.logger.log(`${prefix}${message}`, options);
        } catch (e) {
            // Fall back to logging directly to console. 
            console.log(`[!!] Error while logging: ${e.stack}`);
            console.log(`${new Date().toISOString()} [client ${this.id}/${this.ipAddress}] ${options.severity}: ${message}`);
        }
    }

    logInfoAlways(message: string) { this.log(message, { severity: 'info' }, true); }
    logInfo(message: string) { this.log(message, { severity: 'info' }); }
    logError(message: string) { this.log(message, { severity: 'error' }); }
    logFatal(message: string) { this.log(message, { severity: 'fatal' }); }
    logWarning(message: string) { this.log(message, { severity: 'warning' }); }

    @RpcCallable()
    async getExistingMessages(limit?: number) {
        limit ??= 20;

        const startedAt = Date.now();
        this.logInfo(`Retrieving ${limit} existing messages`);

        if (limit > 1000) {
            this.logError(`getExistingMessages: Limit is too high (limit=${limit}), rejecting request.`);
            throw new Error(`Invalid request: Maximum limit is 1000.`);
        }

        let results = await this.chat.getMessages({
            topicId: this.topicId,
            parentMessageId: this.parentMessage?.id,
            filter: this.filterMode,
            sort: this.sortOrder,
            userId: this.user?.id,
            limit
        });

        this.logInfo(`... Sending ${results.length} existing messages (took ${Date.now() - startedAt} ms)`);

        return results;
    }

    private getFilter(): mongodb.Filter<ChatMessage> {
        return this.chat.createMongoMessagesFilter(this.topicId, this.parentMessage?.id, this.filterMode, this.user?.id);
    }

    private getSortOrder(): any {
        return this.chat.createMongoSortFromOrder(this.sortOrder);
    }

    pubsub: PubSub<ChatPubSubEvent>;

    @RpcCallable()
    async sendMessage(message: ChatMessage): Promise<ChatMessage> {
        if (!message) {
            this.logError(`Send null/undefined message object.`);
            throw new Error(`You must provide a message to send`);
        }

        if (!this.user) {
            this.logError(`Attempted to send message without signing in.`);
            throw new Error(`You must be signed in to send messages.`);
        }

        // If we are not in monitor mode, then enforce that the message is part of the currently
        // subscribed topic.

        if (this.topicId != '-') {
            message.topicId = this.topicId;
            message.parentMessageId = this.parentMessage?.id;
        }

        if (!message.topicId) {
            this.logError(`Attempted to send message without topic ID.`);
            throw new Error(`You must specify a topic ID`);
        }

        let maxLogSize = 20;
        let loggedMessage: string;

        if (message.message.length < maxLogSize)
            loggedMessage = message.message;
        else
            loggedMessage = `${message.message.slice(0, 20)}.. (+ ${message.message.length - 20} characters)`;

        message.user = { ...this.user };
        message.sentAt = Date.now();

        if (message.id) {
            let existingMessage = await this.chat.getUnpreparedMessage(message.id);
            if (existingMessage && existingMessage.user?.id === this.user.id) {
                return existingMessage;
            }
        }

        message.attachments ??= [];
        message.deleted = false;
        message.likes = 0;
        message.edits = [];
        message.submessageCount = 0;
        message.participants = [];
        message.likers = [];
        message.attachments.forEach(attachment => delete attachment.transientState);

        delete message.user.token;

        // Important that the auth check happens before the empty message check to 
        // enable the "Permission Denied" special handling in the host app. This way 
        // the user can click the Send button (which is really a call-to-action when
        // in the Permission Denied state) and have the app handle it.
         
        try {
            await this.chat.doAuthorizeAction(this.user, this.userToken, {
                action: 'postMessage',
                message,
                parentMessage: message.parentMessageId ? await this.chat.getUnpreparedMessage(message.parentMessageId) : null,
                topic: await this.chat.getTopic(message.topicId),
                connectionMetadata: this.metadata
            });
        } catch (e) {
            this.logError(`Error authenticating while attemping to send message: ${e.message}`);
            throw e;
        }

        // IMPORTANT: Must be after the doAuthorizeAction, see above.

        if (!message.message && !(message.attachments?.length > 0)) {
            this.logError(`Attempted to send an empty message.`);
            throw new Error(`Cannot send an empty message.`);
        }

        if (process.env.BANTA_LOG_MESSAGES !== '0') {
            this.logInfoAlways(`says: ${loggedMessage}`);
        }
        return this.chat.postMessage(message);
    }

    @RpcCallable()
    async getMessage(id: string): Promise<ChatMessage> {
        let message = await this.chat.getUnpreparedMessage(id);
        let notFound = new Error(`Not found`);

        if (!message) {
            this.logError(`Attempted to fetch message '${id}' that does not exist.`);
            throw notFound;
        }

        if (!this.ownsMessage(message, true)) {
            this.logError(`Attempted to fetch message '${id}' that is not owned by the current topic.`);
            throw notFound;
        }
        
        if (message.hidden) {
            this.logError(`Attempted to fetch message '${id}' that is hidden.`);
            throw notFound;
        }
        
        try {
            await this.chat.doAuthorizeAction(this.user, this.userToken, { 
                action: 'viewTopic', 
                topic: await this.chat.getTopic(message.topicId),
                message,
                parentMessage: message.parentMessageId ? await this.chat.getUnpreparedMessage(message.parentMessageId) : null,
                connectionMetadata: this.metadata
            });
        } catch (e) {
            this.logError(`Error authenticating while attempting to fetch message '${id}': ${e.message}`);
            throw e;
        }
        message = await this.prepareMessage(message);
        return message;
    }

    @RpcCallable()
    async likeMessage(id: string) {
        if (!this.user) {
            this.logError(`Attempted to like message ${id} without signing in.`);
            throw new Error(`You must be signed in to like a message`);
        }
        
        let message = await this.chat.getUnpreparedMessage(id);

        if (!message) {
            this.logError(`Attempted to like message '${id}' which does not exist.`);
            throw new Error(`No such message with ID '${id}'`);
        }

        try {
            await this.chat.doAuthorizeAction(this.user, this.userToken, {
                action: 'likeMessage',
                message,
                parentMessage: message.parentMessageId ? await this.chat.getUnpreparedMessage(message.parentMessageId) : null,
                topic: await this.chat.getTopic(message.topicId),
                connectionMetadata: this.metadata
            });
        } catch (e) {
            this.logError(`Error authenticating while attempting to like message '${id}': ${e.message}`);
            throw e;
        }

        await this.chat.like(message, this.user);
    }

    @RpcCallable()
    async unlikeMessage(id: string) {
        if (!this.user) {
            this.logError(`Attempted to unlike message ${id} without signing in.`);
            throw new Error(`You must be signed in to like a message`);
        }

        let message = await this.chat.getUnpreparedMessage(id);

        if (!message) {
            this.logError(`Attempted to unlike message '${id}' which does not exist.`);
            throw new Error(`No such message with ID '${id}'`);
        }

        try {
            await this.chat.doAuthorizeAction(this.user, this.userToken, {
                action: 'likeMessage',
                message,
                parentMessage: message.parentMessageId ? await this.chat.getUnpreparedMessage(message.parentMessageId) : null,
                topic: await this.chat.getTopic(message.topicId),
                connectionMetadata: this.metadata
            });
        } catch (e) {
            this.logError(`Error authenticating while attempting to unlike message '${id}': ${e.message}`);
            throw e;
        }
        await this.chat.unlike(message, this.user);
    }
}