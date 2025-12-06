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

        await this.gunService.put(`messages/${dto.roomId}/${messageId}`, message);
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

        await this.gunService.put(`messages/${dto.roomId}/${messageId}`, message);
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

        await this.gunService.put(`messages/${dto.roomId}/${messageId}`, message);
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

        await this.gunService.put(`messages/${dto.roomId}/${messageId}`, message);
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

        const reactions = message.reactions || {};
        const emojiReactions = reactions[dto.emoji] || [];

        if (!emojiReactions.includes(dto.userId)) {
            emojiReactions.push(dto.userId);
            reactions[dto.emoji] = emojiReactions;

            await this.gunService.put(`messages/${dto.roomId}/${dto.messageId}/reactions`, reactions);
        }
    }

    /**
     * Remove a reaction from a message
     */
    public async removeReaction(dto: AddReactionDTO): Promise<void> {
        const message = await this.getMessage(dto.roomId, dto.messageId);

        if (!message) {
            throw new Error('Message not found');
        }

        const reactions = message.reactions || {};
        const emojiReactions = reactions[dto.emoji] || [];

        const index = emojiReactions.indexOf(dto.userId);
        if (index > -1) {
            emojiReactions.splice(index, 1);

            if (emojiReactions.length === 0) {
                delete reactions[dto.emoji];
            } else {
                reactions[dto.emoji] = emojiReactions;
            }

            await this.gunService.put(`messages/${dto.roomId}/${dto.messageId}/reactions`, reactions);
        }
    }

    /**
     * Vote in a poll
     */
    public async votePoll(dto: VotePollDTO): Promise<void> {
        const message = await this.getMessage(dto.roomId, dto.messageId);

        if (!message || message.type !== 'poll') {
            throw new Error('Poll not found');
        }

        const content = message.content as PollContent;
        const votes = content.votes || {};
        const optionVotes = votes[dto.optionIndex] || [];

        if (!optionVotes.includes(dto.userId)) {
            optionVotes.push(dto.userId);
            votes[dto.optionIndex] = optionVotes;

            await this.gunService.put(`messages/${dto.roomId}/${dto.messageId}/content/votes`, votes);
        }
    }

    /**
     * Mark message as read
     */
    public async markAsRead(roomId: RoomId, messageId: MessageId, userId: UserId): Promise<void> {
        const message = await this.getMessage(roomId, messageId);

        if (!message) {
            throw new Error('Message not found');
        }

        const readBy = message.readBy || [];

        if (!readBy.includes(userId)) {
            readBy.push(userId);
            await this.gunService.put(`messages/${roomId}/${messageId}/readBy`, readBy);
        }
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
        const messages: Message[] = [];

        if (allMessages) {
            for (const messageId in allMessages) {
                const message = allMessages[messageId];
                if (message && (!before || message.timestamp < before)) {
                    messages.push(message);
                }
            }
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
        const message = await this.gunService.get(`messages/${roomId}/${messageId}`);
        return message || null;
    }
}
