import { GunService } from './GunService';
import {
    Room,
    RoomId,
    UserId,
    CreateRoomDTO,
    UpdateRoomDTO,
    AddMemberDTO,
    UpdateMemberRoleDTO,
    MemberRole,
    MemberPermissions,
    MessageType,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Room service - Manages room operations
 */
export class RoomService {
    private gunService: GunService;

    constructor(gunService: GunService) {
        this.gunService = gunService;
    }

    /**
     * Create a new room
     */
    public async createRoom(dto: CreateRoomDTO, ownerId: UserId): Promise<Room> {
        const roomId = uuidv4();

        // Default allowed message types
        const defaultTypeMsg: MessageType[] = ['text', 'image', 'video', 'reaction', 'edit', 'delete'];

        // Default permissions for owner
        const ownerPermissions: MemberPermissions = {
            sendMessages: true,
            manageMembers: true,
            deleteMessages: true,
        };

        const room: Room = {
            name: dto.name,
            type: dto.type,
            typeMsg: dto.typeMsg || defaultTypeMsg,
            owner: ownerId,
            createdAt: Date.now(),
            settings: {
                maxMembers: 100,
                allowInvites: true,
                isNSFW: false,
                ...dto.settings,
            },
            members: {
                [ownerId]: {
                    role: 'owner',
                    joinedAt: Date.now(),
                    permissions: ownerPermissions,
                },
            },
        };

        await this.gunService.put(`rooms/${roomId}`, room);
        return room;
    }

    /**
     * Get room by ID
     */
    public async getRoomById(roomId: RoomId): Promise<Room | null> {
        const room = await this.gunService.get(`rooms/${roomId}`);
        return room || null;
    }

    /**
     * Update room
     */
    public async updateRoom(dto: UpdateRoomDTO): Promise<void> {
        const room = await this.getRoomById(dto.roomId);
        if (!room) {
            throw new Error('Room not found');
        }

        if (dto.name) {
            await this.gunService.put(`rooms/${dto.roomId}/name`, dto.name);
        }

        if (dto.settings) {
            const updatedSettings = { ...room.settings, ...dto.settings };
            await this.gunService.put(`rooms/${dto.roomId}/settings`, updatedSettings);
        }

        if (dto.typeMsg) {
            await this.gunService.put(`rooms/${dto.roomId}/typeMsg`, dto.typeMsg);
        }
    }

    /**
     * Delete room
     */
    public async deleteRoom(roomId: RoomId): Promise<void> {
        await this.gunService.put(`rooms/${roomId}`, null);
    }

    /**
     * Add member to room
     */
    public async addMember(dto: AddMemberDTO): Promise<void> {
        const room = await this.getRoomById(dto.roomId);
        if (!room) {
            throw new Error('Room not found');
        }

        const role = dto.role || 'member';
        const permissions = this.getDefaultPermissions(role);

        const member = {
            role,
            joinedAt: Date.now(),
            permissions,
        };

        await this.gunService.put(`rooms/${dto.roomId}/members/${dto.userId}`, member);
    }

    /**
     * Remove member from room
     */
    public async removeMember(roomId: RoomId, userId: UserId): Promise<void> {
        await this.gunService.put(`rooms/${roomId}/members/${userId}`, null);
    }

    /**
     * Update member role
     */
    public async updateMemberRole(dto: UpdateMemberRoleDTO): Promise<void> {
        const permissions = this.getDefaultPermissions(dto.role);

        await this.gunService.put(`rooms/${dto.roomId}/members/${dto.userId}/role`, dto.role);
        await this.gunService.put(`rooms/${dto.roomId}/members/${dto.userId}/permissions`, permissions);
    }

    /**
     * List rooms for a user
     */
    public async listRooms(userId: UserId): Promise<Room[]> {
        // This is a simplified implementation
        // In production, you'd want to maintain an index of user's rooms
        const allRooms = await this.gunService.get('rooms');
        const userRooms: Room[] = [];

        if (allRooms) {
            for (const roomId in allRooms) {
                const room = allRooms[roomId];
                if (room && room.members && room.members[userId]) {
                    userRooms.push(room);
                }
            }
        }

        return userRooms;
    }

    /**
     * Get default permissions for a role
     */
    private getDefaultPermissions(role: MemberRole): MemberPermissions {
        switch (role) {
            case 'owner':
                return {
                    sendMessages: true,
                    manageMembers: true,
                    deleteMessages: true,
                };
            case 'admin':
                return {
                    sendMessages: true,
                    manageMembers: true,
                    deleteMessages: true,
                };
            case 'member':
            default:
                return {
                    sendMessages: true,
                    manageMembers: false,
                    deleteMessages: false,
                };
        }
    }
}
