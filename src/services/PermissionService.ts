import { RoomService } from './RoomService';
import { MessageService } from './MessageService';
import { RoomId, UserId, MessageId, MessageType } from '../types';

/**
 * Permission service - Manages permission checks
 */
export class PermissionService {
    private roomService: RoomService;
    private messageService: MessageService;

    constructor(roomService: RoomService, messageService: MessageService) {
        this.roomService = roomService;
        this.messageService = messageService;
    }

    /**
     * Check if user can send a specific type of message in a room
     */
    public async canSendMessage(
        userId: UserId,
        roomId: RoomId,
        messageType: MessageType
    ): Promise<boolean> {
        const room = await this.roomService.getRoomById(roomId);

        if (!room) {
            return false;
        }

        // Check if user is a member
        const member = room.members[userId];
        if (!member) {
            return false;
        }

        // Check if user has permission to send messages
        if (!member.permissions.sendMessages) {
            return false;
        }

        // Check if message type is allowed in this room
        if (!room.typeMsg.includes(messageType)) {
            return false;
        }

        return true;
    }

    /**
     * Check if user can manage members in a room
     */
    public async canManageMembers(userId: UserId, roomId: RoomId): Promise<boolean> {
        const room = await this.roomService.getRoomById(roomId);

        if (!room) {
            return false;
        }

        const member = room.members[userId];
        if (!member) {
            return false;
        }

        return member.permissions.manageMembers;
    }

    /**
     * Check if user can delete a specific message
     */
    public async canDeleteMessage(
        userId: UserId,
        roomId: RoomId,
        _messageId: MessageId
    ): Promise<boolean> {
        const room = await this.roomService.getRoomById(roomId);

        if (!room) {
            return false;
        }

        const member = room.members[userId];
        if (!member) {
            return false;
        }

        // Owners and admins can delete any message
        if (member.permissions.deleteMessages) {
            return true;
        }

        // Users can delete their own messages
        const messages = await this.messageService.getMessages(roomId);
        const message = messages.find((m) => m.from === userId);

        return message !== undefined;
    }

    /**
     * Check if user can edit room settings
     */
    public async canEditRoom(userId: UserId, roomId: RoomId): Promise<boolean> {
        const room = await this.roomService.getRoomById(roomId);

        if (!room) {
            return false;
        }

        // Only owner and admins can edit room
        const member = room.members[userId];
        if (!member) {
            return false;
        }

        return member.role === 'owner' || member.role === 'admin';
    }

    /**
     * Check if user is room owner
     */
    public async isRoomOwner(userId: UserId, roomId: RoomId): Promise<boolean> {
        const room = await this.roomService.getRoomById(roomId);

        if (!room) {
            return false;
        }

        return room.owner === userId;
    }

    /**
     * Check if user is room admin or owner
     */
    public async isRoomAdminOrOwner(userId: UserId, roomId: RoomId): Promise<boolean> {
        const room = await this.roomService.getRoomById(roomId);

        if (!room) {
            return false;
        }

        const member = room.members[userId];
        if (!member) {
            return false;
        }

        return member.role === 'owner' || member.role === 'admin';
    }
}
