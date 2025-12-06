/**
 * Common types used across the SDK
 */

export type Timestamp = number;
export type UserId = string;
export type RoomId = string;
export type MessageId = string;
export type ConversationId = string;

/**
 * User status
 */
export type UserStatus = 'online' | 'away' | 'offline';

/**
 * Room types
 */
export type RoomType = 'public' | 'private' | 'dm' | 'gram' | 'feed';

/**
 * Message types
 */
export type MessageType =
    | 'text'
    | 'image'
    | 'video'
    | 'poll'
    | 'reaction'
    | 'edit'
    | 'delete'
    | 'thread';

/**
 * Member roles in a room
 */
export type MemberRole = 'owner' | 'admin' | 'member';
