import { RoomId, UserId, Timestamp, RoomType, MessageType, MemberRole } from './common.types';

/**
 * Room settings
 */
export interface RoomSettings {
    description?: string;
    avatar?: string;
    maxMembers: number;
    allowInvites: boolean;
    isNSFW: boolean;
}

/**
 * Member permissions in a room
 */
export interface MemberPermissions {
    sendMessages: boolean;
    manageMembers: boolean;
    deleteMessages: boolean;
}

/**
 * Room member information
 */
export interface RoomMember {
    role: MemberRole;
    joinedAt: Timestamp;
    permissions: MemberPermissions;
}

/**
 * Room entity
 */
export interface Room {
    id?: string;
    name: string;
    type: RoomType;
    typeMsg: MessageType[]; // Allowed message types in this room
    owner: UserId;
    createdAt: Timestamp;
    settings: RoomSettings;
    members: Record<UserId, RoomMember>;
}

/**
 * DTO for creating a new room
 */
export interface CreateRoomDTO {
    name: string;
    type: RoomType;
    typeMsg?: MessageType[];
    settings?: Partial<RoomSettings>;
}

/**
 * DTO for updating a room
 */
export interface UpdateRoomDTO {
    roomId: RoomId;
    name?: string;
    settings?: Partial<RoomSettings>;
    typeMsg?: MessageType[];
}

/**
 * DTO for adding a member to a room
 */
export interface AddMemberDTO {
    roomId: RoomId;
    userId: UserId;
    role?: MemberRole;
}

/**
 * DTO for updating member role
 */
export interface UpdateMemberRoleDTO {
    roomId: RoomId;
    userId: UserId;
    role: MemberRole;
}
