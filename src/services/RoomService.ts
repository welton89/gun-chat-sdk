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

        const roomData: any = {
            ...room,
            typeMsg: room.typeMsg.reduce((acc, type) => ({ ...acc, [type]: true }), {}),
        };

        // Remove undefined keys to avoid Gun.js errors
        Object.keys(roomData).forEach(key => {
            if (roomData[key] === undefined) {
                delete roomData[key];
            }
        });

        // Also clean nested settings if needed, though they have defaults
        // Clean members undefined fields if any
        if (roomData.members) {
            Object.keys(roomData.members).forEach(memberId => {
                const member = roomData.members[memberId];
                Object.keys(member).forEach(k => {
                    if (member[k] === undefined) delete member[k];
                });
            });
        }

        console.log('CreateRoom: Saving room data', roomId, roomData);
        await this.gunService.put(`rooms/${roomId}`, roomData);
        console.log('CreateRoom: Room saved');
        return room;
    }

    /**
     * Get room by ID
     */
    public async getRoomById(roomId: RoomId): Promise<Room | null> {
        console.log(`GetRoomById: Fetching ${roomId}`);
        const roomData = await this.gunService.get(`rooms/${roomId}`);

        if (!roomData) {
            console.log(`GetRoomById: Room ${roomId} not found`);
            return null;
        }

        // Fetch members explicitly to ensure we have the full list
        // Gun might return a reference for the members object
        let members = roomData.members;
        // Check if members is missing or looks like a reference (has no user keys but has metadata)
        // A simple way is to just always fetch the members node to be safe
        console.log(`GetRoomById: Fetching members for ${roomId}`);
        const membersData = await this.gunService.get(`rooms/${roomId}/members`);
        if (membersData) {
            members = membersData;
        }
        console.log(`GetRoomById: Members data`, members);

        // Convert typeMsg object back to array
        const typeMsg = roomData.typeMsg ? Object.keys(roomData.typeMsg) : [];

        const room = {
            ...roomData,
            id: roomId,
            typeMsg: typeMsg as MessageType[],
            members: members || {},
        };

        return room;
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
            const typeMsgObj = dto.typeMsg.reduce((acc, type) => ({ ...acc, [type]: true }), {});
            await this.gunService.put(`rooms/${dto.roomId}/typeMsg`, typeMsgObj);
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
        console.log('ListRooms: Fetching rooms for user', userId);
        // This is a simplified implementation
        // In production, you'd want to maintain an index of user's rooms
        const allRooms = await this.gunService.get('rooms');
        console.log('ListRooms: Raw rooms data', allRooms);

        if (!allRooms) {
            console.log('ListRooms: No rooms found in database.');
            return [];
        }

        console.log('ListRooms: Found raw rooms keys', Object.keys(allRooms).length);

        const roomPromises = Object.keys(allRooms).map(async (roomId) => {
            // Skip Gun metadata
            if (roomId === '_' || roomId === '#') return null;

            const room = allRooms[roomId];

            // We might need to fetch the room details if they are not fully loaded in the list
            let fullRoom = room;
            if (!room.members) {
                // console.log(`ListRooms: Fetching full details for room ${roomId}`);
                fullRoom = await this.getRoomById(roomId);
            }

            if (fullRoom && fullRoom.members && fullRoom.members[userId]) {
                // Ensure ID is present
                if (!fullRoom.id) fullRoom.id = roomId;
                return fullRoom;
            }
            return null;
        });

        const results = await Promise.all(roomPromises);
        const userRooms = results.filter(room => room !== null) as Room[];

        console.log('ListRooms: Found rooms', userRooms);
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
