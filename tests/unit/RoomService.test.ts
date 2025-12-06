import { GunService } from '../../src/services/GunService';
import { RoomService } from '../../src/services/RoomService';
import { CreateRoomDTO } from '../../src/types';

// Mock Gun.js
jest.mock('gun', () => {
    return jest.fn(() => ({
        user: jest.fn(() => ({
            recall: jest.fn(),
        })),
        get: jest.fn(() => ({
            put: jest.fn(),
            once: jest.fn(),
            on: jest.fn(),
            off: jest.fn(),
        })),
    }));
});

jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-room-id'),
}));

describe('RoomService', () => {
    let gunService: GunService;
    let roomService: RoomService;

    beforeEach(() => {
        gunService = GunService.getInstance();
        roomService = new RoomService(gunService);
        jest.clearAllMocks();
    });

    describe('createRoom', () => {
        it('should create a public room successfully', async () => {
            const dto: CreateRoomDTO = {
                name: 'Test Room',
                type: 'public',
            };
            const ownerId = 'owner-id';

            jest.spyOn(gunService, 'put').mockResolvedValue(undefined);

            const room = await roomService.createRoom(dto, ownerId);

            expect(room).toBeDefined();
            expect(room.name).toBe(dto.name);
            expect(room.type).toBe('public');
            expect(room.owner).toBe(ownerId);
            expect(room.members[ownerId]).toBeDefined();
            expect(room.members[ownerId].role).toBe('owner');
        });

        it('should create a private room', async () => {
            const dto: CreateRoomDTO = {
                name: 'Private Room',
                type: 'private',
            };
            const ownerId = 'owner-id';

            jest.spyOn(gunService, 'put').mockResolvedValue(undefined);

            const room = await roomService.createRoom(dto, ownerId);

            expect(room.type).toBe('private');
        });

        it('should create a gram room', async () => {
            const dto: CreateRoomDTO = {
                name: 'My Feed',
                type: 'gram',
            };
            const ownerId = 'owner-id';

            jest.spyOn(gunService, 'put').mockResolvedValue(undefined);

            const room = await roomService.createRoom(dto, ownerId);

            expect(room.type).toBe('gram');
        });

        it('should create a feed room', async () => {
            const dto: CreateRoomDTO = {
                name: 'News Feed',
                type: 'feed',
            };
            const ownerId = 'owner-id';

            jest.spyOn(gunService, 'put').mockResolvedValue(undefined);

            const room = await roomService.createRoom(dto, ownerId);

            expect(room.type).toBe('feed');
        });

        it('should create a DM room', async () => {
            const dto: CreateRoomDTO = {
                name: 'DM with User',
                type: 'dm',
            };
            const ownerId = 'owner-id';

            jest.spyOn(gunService, 'put').mockResolvedValue(undefined);

            const room = await roomService.createRoom(dto, ownerId);

            expect(room.type).toBe('dm');
        });

        it('should use custom typeMsg if provided', async () => {
            const dto: CreateRoomDTO = {
                name: 'Custom Room',
                type: 'public',
                typeMsg: ['text', 'image'],
            };
            const ownerId = 'owner-id';

            jest.spyOn(gunService, 'put').mockResolvedValue(undefined);

            const room = await roomService.createRoom(dto, ownerId);

            expect(room.typeMsg).toEqual(['text', 'image']);
        });

        it('should use default typeMsg if not provided', async () => {
            const dto: CreateRoomDTO = {
                name: 'Default Room',
                type: 'public',
            };
            const ownerId = 'owner-id';

            jest.spyOn(gunService, 'put').mockResolvedValue(undefined);

            const room = await roomService.createRoom(dto, ownerId);

            expect(room.typeMsg).toContain('text');
            expect(room.typeMsg).toContain('image');
            expect(room.typeMsg).toContain('video');
        });

        it('should set owner permissions correctly', async () => {
            const dto: CreateRoomDTO = {
                name: 'Test Room',
                type: 'public',
            };
            const ownerId = 'owner-id';

            jest.spyOn(gunService, 'put').mockResolvedValue(undefined);

            const room = await roomService.createRoom(dto, ownerId);

            expect(room.members[ownerId].permissions.sendMessages).toBe(true);
            expect(room.members[ownerId].permissions.manageMembers).toBe(true);
            expect(room.members[ownerId].permissions.deleteMessages).toBe(true);
        });
    });

    describe('getRoomById', () => {
        it('should return room if exists', async () => {
            const roomId = 'test-room-id';
            const mockRoomData = {
                name: 'Test Room',
                type: 'public' as const,
                typeMsg: { text: true },
                owner: 'owner-id',
                createdAt: Date.now(),
                settings: {
                    maxMembers: 100,
                    allowInvites: true,
                    isNSFW: false,
                },
                members: {},
            };

            const expectedRoom = {
                ...mockRoomData,
                typeMsg: ['text'],
            };

            jest.spyOn(gunService, 'get').mockResolvedValue(mockRoomData);

            const room = await roomService.getRoomById(roomId);

            expect(room).toEqual(expectedRoom);
            expect(gunService.get).toHaveBeenCalledWith(`rooms/${roomId}`);
        });

        it('should return null if room does not exist', async () => {
            const roomId = 'non-existent-room';

            jest.spyOn(gunService, 'get').mockResolvedValue(null);

            const room = await roomService.getRoomById(roomId);

            expect(room).toBeNull();
        });
    });

    describe('addMember', () => {
        it('should add member to room successfully', async () => {
            const roomId = 'test-room-id';
            const userId = 'new-user-id';
            const mockRoom = {
                name: 'Test Room',
                type: 'public' as const,
                typeMsg: ['text' as const],
                owner: 'owner-id',
                createdAt: Date.now(),
                settings: {
                    maxMembers: 100,
                    allowInvites: true,
                    isNSFW: false,
                },
                members: {},
            };

            jest.spyOn(roomService, 'getRoomById').mockResolvedValue(mockRoom);
            jest.spyOn(gunService, 'put').mockResolvedValue(undefined);

            await roomService.addMember({ roomId, userId });

            expect(gunService.put).toHaveBeenCalledWith(
                `rooms/${roomId}/members/${userId}`,
                expect.objectContaining({
                    role: 'member',
                    permissions: expect.any(Object),
                })
            );
        });

        it('should throw error if room not found', async () => {
            const roomId = 'non-existent-room';
            const userId = 'user-id';

            jest.spyOn(roomService, 'getRoomById').mockResolvedValue(null);

            await expect(
                roomService.addMember({ roomId, userId })
            ).rejects.toThrow('Room not found');
        });

        it('should add member with custom role', async () => {
            const roomId = 'test-room-id';
            const userId = 'new-admin-id';
            const mockRoom = {
                name: 'Test Room',
                type: 'public' as const,
                typeMsg: ['text' as const],
                owner: 'owner-id',
                createdAt: Date.now(),
                settings: {
                    maxMembers: 100,
                    allowInvites: true,
                    isNSFW: false,
                },
                members: {},
            };

            jest.spyOn(roomService, 'getRoomById').mockResolvedValue(mockRoom);
            jest.spyOn(gunService, 'put').mockResolvedValue(undefined);

            await roomService.addMember({ roomId, userId, role: 'admin' });

            expect(gunService.put).toHaveBeenCalledWith(
                `rooms/${roomId}/members/${userId}`,
                expect.objectContaining({
                    role: 'admin',
                })
            );
        });
    });

    describe('removeMember', () => {
        it('should remove member from room', async () => {
            const roomId = 'test-room-id';
            const userId = 'user-to-remove';

            jest.spyOn(gunService, 'put').mockResolvedValue(undefined);

            await roomService.removeMember(roomId, userId);

            expect(gunService.put).toHaveBeenCalledWith(
                `rooms/${roomId}/members/${userId}`,
                null
            );
        });
    });

    describe('updateMemberRole', () => {
        it('should update member role and permissions', async () => {
            const roomId = 'test-room-id';
            const userId = 'user-id';

            jest.spyOn(gunService, 'put').mockResolvedValue(undefined);

            await roomService.updateMemberRole({ roomId, userId, role: 'admin' });

            expect(gunService.put).toHaveBeenCalledWith(
                `rooms/${roomId}/members/${userId}/role`,
                'admin'
            );
            expect(gunService.put).toHaveBeenCalledWith(
                `rooms/${roomId}/members/${userId}/permissions`,
                expect.objectContaining({
                    sendMessages: true,
                    manageMembers: true,
                    deleteMessages: true,
                })
            );
        });
    });

    describe('deleteRoom', () => {
        it('should delete room', async () => {
            const roomId = 'room-to-delete';

            jest.spyOn(gunService, 'put').mockResolvedValue(undefined);

            await roomService.deleteRoom(roomId);

            expect(gunService.put).toHaveBeenCalledWith(`rooms/${roomId}`, null);
        });
    });
});
