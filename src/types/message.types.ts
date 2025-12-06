import { MessageId, UserId, Timestamp, MessageType, RoomId } from './common.types';

/**
 * Text message content
 */
export interface TextContent {
    body: string;
}

/**
 * Media message content (image, video)
 */
export interface MediaContent {
    url: string;
    mimeType: string;
    size?: number;
    thumbnail?: string;
}

/**
 * Poll message content
 */
export interface PollContent {
    question: string;
    options: string[];
    votes: Record<number, UserId[]>;
    allowMultiple?: boolean;
    expiresAt?: Timestamp;
}

/**
 * Reaction to a message
 */
export interface ReactionContent {
    targetMessageId: MessageId;
    emoji: string;
}

/**
 * Thread message content
 */
export interface ThreadContent {
    parentMessageId: MessageId;
    body: string;
}

/**
 * Edit message content
 */
export interface EditContent {
    targetMessageId: MessageId;
    newBody: string;
}

/**
 * Delete message content
 */
export interface DeleteContent {
    targetMessageId: MessageId;
}

/**
 * Union type for all message content types
 */
export type MessageContent =
    | TextContent
    | MediaContent
    | PollContent
    | ReactionContent
    | ThreadContent
    | EditContent
    | DeleteContent;

/**
 * Message entity
 */
export interface Message {
    type: MessageType;
    from: UserId;
    timestamp: Timestamp;
    content: MessageContent;
    replyTo?: MessageId;
    editedAt?: Timestamp;
    reactions: Record<string, UserId[]>;
    readBy: UserId[];
}

/**
 * DTO for sending a text message
 */
export interface SendTextMessageDTO {
    roomId: RoomId;
    body: string;
    replyTo?: MessageId;
}

/**
 * DTO for sending a media message
 */
export interface SendMediaMessageDTO {
    roomId: RoomId;
    url: string;
    mimeType: string;
    size?: number;
    thumbnail?: string;
    replyTo?: MessageId;
}

/**
 * DTO for creating a poll
 */
export interface CreatePollDTO {
    roomId: RoomId;
    question: string;
    options: string[];
    allowMultiple?: boolean;
    expiresAt?: Timestamp;
}

/**
 * DTO for creating a thread
 */
export interface CreateThreadDTO {
    roomId: RoomId;
    parentMessageId: MessageId;
    body: string;
}

/**
 * DTO for editing a message
 */
export interface EditMessageDTO {
    roomId: RoomId;
    messageId: MessageId;
    newBody: string;
}

/**
 * DTO for adding a reaction
 */
export interface AddReactionDTO {
    roomId: RoomId;
    messageId: MessageId;
    emoji: string;
    userId: UserId;
}

/**
 * DTO for voting in a poll
 */
export interface VotePollDTO {
    roomId: RoomId;
    messageId: MessageId;
    optionIndex: number;
    userId: UserId;
}
