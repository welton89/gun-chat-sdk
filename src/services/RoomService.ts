import { GunService } from './GunService';
import { CryptoService } from './CryptoService';
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
    private cryptoService: CryptoService;

    constructor(gunService: GunService, cryptoService: CryptoService) {
        this.gunService = gunService;
        this.cryptoService = cryptoService;
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

        // Encryption Logic for Private Rooms and DMs
        if (dto.type === 'private' || dto.type === 'dm') {
            try {
                // Generate symmetric key for the room
                const roomKey = await this.cryptoService.generateSymmetricKey();

                // Get owner's pair (needed to encrypt the key for themselves)
                // We assume the user is logged in and we can get the pair from Gun
                // This is a bit of a hack, ideally we should pass the pair, but for SDK ergonomics we try to get it
                const user = this.gunService.getUser();
                const pair = user._.sea;

                if (!pair) {
                    throw new Error('User must be authenticated to create private room');
                }

                // Encrypt room key for owner
                const encryptedKey = await this.cryptoService.encryptRoomKeyForUser(roomKey, ownerId, pair);

                // Store encrypted key in room/keys/{userId}
                // We'll store it in a separate node to avoid loading it with room details for everyone
                await this.gunService.put(`rooms/${roomId}/keys/${ownerId}`, encryptedKey);

                console.log('CreateRoom: Generated and stored room key for owner');
            } catch (err) {
                console.error('CreateRoom: Failed to generate encryption keys', err);
                throw err;
            }
        }

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

        // Inject ID into returned object
        room.id = roomId;
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

        // Handle Key Distribution for Private/DM rooms
        if (room.type === 'private' || room.type === 'dm') {
            try {
                const user = this.gunService.getUser();
                const pair = user._.sea;
                if (!pair) {
                    console.warn('AddMember: Cannot distribute key, user not authenticated');
                    return;
                }

                // 1. Fetch encrypted key for current user (admin/owner)
                const myEncryptedKey = await this.gunService.get(`rooms/${dto.roomId}/keys/${pair.pub}`);
                if (!myEncryptedKey) {
                    console.error('AddMember: No key found for current user');
                    return;
                }

                // 2. Decrypt key
                const roomKey = await this.cryptoService.decryptRoomKeyFromUser(myEncryptedKey, pair.pub, pair);

                // 3. Encrypt for new member
                const newMemberEncryptedKey = await this.cryptoService.encryptRoomKeyForUser(roomKey, dto.userId, pair);

                // 4. Store for new member
                await this.gunService.put(`rooms/${dto.roomId}/keys/${dto.userId}`, newMemberEncryptedKey);
                console.log('AddMember: Distributed room key to new member');

            } catch (err) {
                console.error('AddMember: Failed to distribute room key', err);
                // We don't throw here to avoid blocking the addMember operation if key fails, 
                // but in a strict E2EE system we probably should.
            }
        }
    }

    /**
     * Remove member from room
     */
    public async removeMember(roomId: RoomId, userId: UserId): Promise<void> {
        await this.gunService.put(`rooms/${roomId}/members/${userId}`, null);
        // Ideally we should rotate the key here, but that's complex for MVP
        // For now, we just remove access to the key node (if we had ACLs on it)
        // Gun doesn't support deleting the key from history easily without rotation.
        await this.gunService.put(`rooms/${roomId}/keys/${userId}`, null);
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

    /**
     * Get the symmetric key for a room (decrypted)
     * Returns null if no key found or user cannot decrypt
     */
    public async getRoomKey(roomId: RoomId): Promise<string | null> {
        const user = this.gunService.getUser();
        const pair = user._.sea;
        if (!pair) {
            console.warn('GetRoomKey: User not authenticated');
            return null;
        }

        const encryptedKey = await this.gunService.get(`rooms/${roomId}/keys/${pair.pub}`);
        if (!encryptedKey) {
            // Check if room is public (no key needed)
            const room = await this.getRoomById(roomId);
            if (room && room.type === 'public') return null;

            console.warn(`GetRoomKey: No key found for user in room ${roomId}`);
            return null;
        }

        try {
            return await this.cryptoService.decryptRoomKeyFromUser(encryptedKey, pair.pub, pair);
        } catch (err) {
            console.error('GetRoomKey: Failed to decrypt key', err);
            return null;
        }
    }
}
