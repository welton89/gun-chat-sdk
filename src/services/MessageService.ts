import { GunService } from './GunService';
import {
    Message,
    MessageId,
    RoomId,
    UserId,
    SendTextMessageDTO,
    SendMediaMessageDTO,
    CreatePollDTO,
    CreateThreadDTO,
    EditMessageDTO,
    AddReactionDTO,
    VotePollDTO,
    TextContent,
    MediaContent,
    PollContent,
    ThreadContent,
    Timestamp,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Message service - Manages message operations
 */
export class MessageService {
    private gunService: GunService;

    constructor(gunService: GunService) {
        this.gunService = gunService;
    }

    /**
   * Send a text message
   */
    public async sendMessage(dto: SendTextMessageDTO, userId: UserId): Promise<Message> {
        console.log('MessageService: sendMessage called', dto, userId);
        const messageId = uuidv4();
        const content: TextContent = { body: dto.body };

        const message: Message = {
            type: 'text',
            from: userId,
            timestamp: Date.now(),
            content,
            replyTo: dto.replyTo,
            reactions: {},
            readBy: [userId],
        };

        const messageData = this.serializeMessage(message);
        console.log('MessageService: Saving message data', messageData);
        await this.gunService.put(`messages/${dto.roomId}/${messageId}`, messageData);
        console.log('MessageService: Message saved');
        return message;
    }

    /**
     * Send a media message
     */
    public async sendMediaMessage(dto: SendMediaMessageDTO, userId: UserId): Promise<Message> {
        const messageId = uuidv4();
        const messageType = dto.mimeType.startsWith('image/') ? 'image' : 'video';

        const content: MediaContent = {
            url: dto.url,
            mimeType: dto.mimeType,
            size: dto.size,
            thumbnail: dto.thumbnail,
        };

        const message: Message = {
            type: messageType,
            from: userId,
            timestamp: Date.now(),
            content,
            replyTo: dto.replyTo,
            reactions: {},
            readBy: [userId],
        };

        const messageData = this.serializeMessage(message);
        await this.gunService.put(`messages/${dto.roomId}/${messageId}`, messageData);
        return message;
    }

    /**
     * Create a poll
     */
    public async createPoll(dto: CreatePollDTO, userId: UserId): Promise<Message> {
        const messageId = uuidv4();

        const content: PollContent = {
            question: dto.question,
            options: dto.options,
            votes: {},
            allowMultiple: dto.allowMultiple,
            expiresAt: dto.expiresAt,
        };

        const message: Message = {
            type: 'poll',
            from: userId,
            timestamp: Date.now(),
            content,
            reactions: {},
            readBy: [userId],
        };

        const messageData = this.serializeMessage(message);
        await this.gunService.put(`messages/${dto.roomId}/${messageId}`, messageData);
        return message;
    }

    /**
     * Create a thread
     */
    public async createThread(dto: CreateThreadDTO, userId: UserId): Promise<Message> {
        const messageId = uuidv4();

        const content: ThreadContent = {
            parentMessageId: dto.parentMessageId,
            body: dto.body,
        };

        const message: Message = {
            type: 'thread',
            from: userId,
            timestamp: Date.now(),
            content,
            reactions: {},
            readBy: [userId],
        };

        const messageData = this.serializeMessage(message);
        await this.gunService.put(`messages/${dto.roomId}/${messageId}`, messageData);
        return message;
    }

    /**
     * Edit a message
     */
    public async editMessage(dto: EditMessageDTO, userId: UserId): Promise<void> {
        const message = await this.getMessage(dto.roomId, dto.messageId);

        if (!message) {
            throw new Error('Message not found');
        }

        if (message.from !== userId) {
            throw new Error('Cannot edit message from another user');
        }

        if (message.type === 'text') {
            const content = message.content as TextContent;
            content.body = dto.newBody;

            await this.gunService.put(`messages/${dto.roomId}/${dto.messageId}/content`, content);
            await this.gunService.put(`messages/${dto.roomId}/${dto.messageId}/editedAt`, Date.now());
        }
    }

    /**
     * Delete a message
     */
    public async deleteMessage(roomId: RoomId, messageId: MessageId): Promise<void> {
        await this.gunService.put(`messages/${roomId}/${messageId}`, null);
    }

    /**
     * Add a reaction to a message
     */
    public async addReaction(dto: AddReactionDTO): Promise<void> {
        const message = await this.getMessage(dto.roomId, dto.messageId);

        if (!message) {
            throw new Error('Message not found');
        }

        // Use Gun's set capability for reactions
        // Path: messages/roomId/messageId/reactions/emoji/userId = true
        await this.gunService.put(`messages/${dto.roomId}/${dto.messageId}/reactions/${dto.emoji}/${dto.userId}`, true);
    }

    /**
     * Remove a reaction from a message
     */
    public async removeReaction(dto: AddReactionDTO): Promise<void> {
        await this.gunService.put(`messages/${dto.roomId}/${dto.messageId}/reactions/${dto.emoji}/${dto.userId}`, null);
    }

    /**
     * Vote in a poll
     */
    public async votePoll(dto: VotePollDTO): Promise<void> {
        const message = await this.getMessage(dto.roomId, dto.messageId);

        if (!message || message.type !== 'poll') {
            throw new Error('Poll not found');
        }

        // Path: messages/roomId/messageId/content/votes/optionIndex/userId = true
        await this.gunService.put(`messages/${dto.roomId}/${dto.messageId}/content/votes/${dto.optionIndex}/${dto.userId}`, true);
    }

    /**
     * Mark message as read
     */
    public async markAsRead(roomId: RoomId, messageId: MessageId, userId: UserId): Promise<void> {
        // Path: messages/roomId/messageId/readBy/userId = true
        await this.gunService.put(`messages/${roomId}/${messageId}/readBy/${userId}`, true);
    }

    /**
     * Get messages from a room
     */
    public async getMessages(
        roomId: RoomId,
        limit?: number,
        before?: Timestamp
    ): Promise<Message[]> {
        const allMessages = await this.gunService.get(`messages/${roomId}`);
        let messages: Message[] = [];

        if (allMessages) {
            const messagePromises = Object.keys(allMessages).map(async (messageId) => {
                // Skip Gun metadata
                if (messageId === '_' || messageId === '#') return null;

                let messageData = allMessages[messageId];

                // If messageData is just a link or missing core fields, fetch the full node
                if (!messageData || !messageData.from || !messageData.type) {
                    // console.log(`GetMessages: Fetching full message ${messageId}`);
                    const fullMessage = await this.gunService.get(`messages/${roomId}/${messageId}`);
                    if (fullMessage) {
                        messageData = fullMessage;
                    }
                }

                if (messageData && (!before || messageData.timestamp < before)) {
                    const message = this.deserializeMessage(messageData);
                    message.id = messageId;
                    return message;
                }
                return null;
            });

            const results = await Promise.all(messagePromises);
            messages = results.filter(msg => msg !== null) as Message[];
        }

        // Sort by timestamp descending
        messages.sort((a, b) => b.timestamp - a.timestamp);

        // Apply limit
        if (limit) {
            return messages.slice(0, limit);
        }

        return messages;
    }

    /**
     * Get a single message
     */
    private async getMessage(roomId: RoomId, messageId: MessageId): Promise<Message | null> {
        const messageData = await this.gunService.get(`messages/${roomId}/${messageId}`);
        return messageData ? this.deserializeMessage(messageData) : null;
    }

    /**
     * Serialize message for Gun.js (arrays to objects)
     */
    private serializeMessage(message: Message): any {
        const data: any = { ...message };

        // Convert readBy array to object
        if (message.readBy) {
            data.readBy = message.readBy.reduce((acc, id) => ({ ...acc, [id]: true }), {});
        }

        // Convert reactions record of arrays to record of objects
        if (message.reactions) {
            data.reactions = Object.entries(message.reactions).reduce((acc, [emoji, users]) => ({
                ...acc,
                [emoji]: users.reduce((uAcc, uid) => ({ ...uAcc, [uid]: true }), {})
            }), {});
        }

        // Handle Poll content
        if (message.type === 'poll') {
            const content = { ...message.content as PollContent };
            // Options array to object (index as key)
            content.options = content.options.reduce((acc, opt, idx) => ({ ...acc, [idx]: opt }), {}) as any;
            // Votes record of arrays to record of objects
            content.votes = Object.entries(content.votes).reduce((acc, [idx, users]) => ({
                ...acc,
                [idx]: users.reduce((uAcc, uid) => ({ ...uAcc, [uid]: true }), {})
            }), {});
            data.content = content;
        }

        // Remove undefined keys
        Object.keys(data).forEach(key => {
            if (data[key] === undefined) {
                delete data[key];
            }
        });

        return data;
    }

    /**
     * Deserialize message from Gun.js (objects to arrays)
     */
    private deserializeMessage(data: any): Message {
        const message = { ...data };

        // Convert readBy object to array
        if (data.readBy) {
            message.readBy = Object.keys(data.readBy).filter(k => k !== '_' && k !== '#');
        } else {
            message.readBy = [];
        }

        // Convert reactions
        if (data.reactions) {
            const reactions: Record<string, UserId[]> = {};
            Object.keys(data.reactions).forEach(emoji => {
                if (emoji !== '_' && emoji !== '#') {
                    const usersObj = data.reactions[emoji];
                    if (usersObj) {
                        reactions[emoji] = Object.keys(usersObj).filter(k => k !== '_' && k !== '#');
                    }
                }
            });
            message.reactions = reactions;
        } else {
            message.reactions = {};
        }

        // Handle Poll content
        if (message.type === 'poll' && message.content) {
            const content = { ...message.content };

            // Options object to array
            if (content.options) {
                const options: string[] = [];
                Object.keys(content.options).forEach(idx => {
                    if (idx !== '_' && idx !== '#') {
                        options[parseInt(idx)] = content.options[idx];
                    }
                });
                content.options = options;
            }

            // Votes
            if (content.votes) {
                const votes: Record<number, UserId[]> = {};
                Object.keys(content.votes).forEach(idx => {
                    if (idx !== '_' && idx !== '#') {
                        const usersObj = content.votes[idx];
                        if (usersObj) {
                            votes[parseInt(idx)] = Object.keys(usersObj).filter(k => k !== '_' && k !== '#');
                        }
                    }
                });
                content.votes = votes;
            }
            message.content = content;
        }

        return message as Message;
    }
}
