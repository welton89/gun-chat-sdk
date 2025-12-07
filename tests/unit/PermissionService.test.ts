
import { PermissionService } from '../../src/services/PermissionService';
import { RoomService } from '../../src/services/RoomService';
import { MessageService } from '../../src/services/MessageService';
import { Room } from '../../src/types';

// Mocks
const mockRoomService = {
    getRoomById: jest.fn(),
} as unknown as RoomService;

const mockMessageService = {
    getMessages: jest.fn(),
} as unknown as MessageService;

describe('PermissionService Unit Tests', () => {
    let permissionService: PermissionService;
    const userId = 'user-123';
    const ownerId = 'owner-123';
    const adminId = 'admin-123';
    const memberId = 'member-123';
    const otherId = 'other-123';
    const roomId = 'room-123';

    const mockRoom: Room = {
        name: 'Test Room',
        type: 'public',
        typeMsg: ['text', 'image'],
        owner: ownerId,
        createdAt: Date.now(),
        settings: {
            maxMembers: 10,
            allowInvites: true,
            isNSFW: false
        },
        members: {
            [ownerId]: { role: 'owner', joinedAt: Date.now(), permissions: { sendMessages: true, manageMembers: true, deleteMessages: true } },
            [adminId]: { role: 'admin', joinedAt: Date.now(), permissions: { sendMessages: true, manageMembers: true, deleteMessages: true } },
            [memberId]: { role: 'member', joinedAt: Date.now(), permissions: { sendMessages: true, manageMembers: false, deleteMessages: false } }
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        permissionService = new PermissionService(mockRoomService, mockMessageService);
        (mockRoomService.getRoomById as jest.Mock).mockResolvedValue(mockRoom);
    });

    describe('canSendMessage', () => {
        it('should allow member to send allowed message type', async () => {
            const result = await permissionService.canSendMessage(memberId, roomId, 'text');
            expect(result).toBe(true);
        });

        it('should deny member to send disallowed message type', async () => {
            const result = await permissionService.canSendMessage(memberId, roomId, 'video'); // 'video' not in typeMsg
            expect(result).toBe(false);
        });

        it('should deny non-member', async () => {
            const result = await permissionService.canSendMessage(otherId, roomId, 'text');
            expect(result).toBe(false);
        });

        it('should allow members to send threads and reactions in gram rooms', async () => {
            const gramRoomId = 'gram-room-id';
            const gramMemberId = 'member-id';

            const mockGramRoom = {
                type: 'gram',
                typeMsg: ['text', 'image', 'thread', 'reaction'],
                members: {
                    [gramMemberId]: {
                        role: 'member',
                        permissions: { sendMessages: true },
                    },
                },
            };

            (mockRoomService.getRoomById as jest.Mock).mockResolvedValue(mockGramRoom);

            // Should allow thread
            const canThread = await permissionService.canSendMessage(gramMemberId, gramRoomId, 'thread');
            expect(canThread).toBe(true);

            // Should allow reaction
            const canReact = await permissionService.canSendMessage(gramMemberId, gramRoomId, 'reaction');
            expect(canReact).toBe(true);

            // Should NOT allow text (post)
            const canText = await permissionService.canSendMessage(gramMemberId, gramRoomId, 'text');
            expect(canText).toBe(false);
        });

        it('should allow admins to send any message type in gram rooms', async () => {
            const gramRoomId = 'gram-room-id';
            const gramAdminId = 'admin-id';

            const mockGramRoom = {
                type: 'gram',
                typeMsg: ['text', 'image', 'thread', 'reaction'],
                members: {
                    [gramAdminId]: {
                        role: 'admin',
                        permissions: { sendMessages: true },
                    },
                },
            };

            (mockRoomService.getRoomById as jest.Mock).mockResolvedValue(mockGramRoom);

            const canText = await permissionService.canSendMessage(gramAdminId, gramRoomId, 'text');
            expect(canText).toBe(true);
        });
    });

    describe('canManageMembers', () => {
        it('should allow owner', async () => {
            const result = await permissionService.canManageMembers(ownerId, roomId);
            expect(result).toBe(true);
        });

        it('should allow admin', async () => {
            const result = await permissionService.canManageMembers(adminId, roomId);
            expect(result).toBe(true);
        });

        it('should deny member', async () => {
            const result = await permissionService.canManageMembers(memberId, roomId);
            expect(result).toBe(false);
        });
    });
    describe('canDeleteMessage', () => {
        it('should allow owner to delete any message', async () => {
            const result = await permissionService.canDeleteMessage(ownerId, roomId, 'msg-1');
            expect(result).toBe(true);
        });

        it('should allow admin to delete any message', async () => {
            const result = await permissionService.canDeleteMessage(adminId, roomId, 'msg-1');
            expect(result).toBe(true);
        });

        it('should allow member to delete their own message', async () => {
            const mockMessages = [
                { id: 'msg-1', from: memberId, type: 'text' }
            ];
            (mockMessageService.getMessages as jest.Mock).mockResolvedValue(mockMessages);

            const result = await permissionService.canDeleteMessage(memberId, roomId, 'msg-1');
            expect(result).toBe(true);
        });

        it('should deny member to delete others message', async () => {
            const mockMessages = [
                { id: 'msg-1', from: otherId, type: 'text' }
            ];
            (mockMessageService.getMessages as jest.Mock).mockResolvedValue(mockMessages);

            const result = await permissionService.canDeleteMessage(memberId, roomId, 'msg-1');
            expect(result).toBe(false);
        });
    });

    describe('canEditRoom', () => {
        it('should allow owner', async () => {
            const result = await permissionService.canEditRoom(ownerId, roomId);
            expect(result).toBe(true);
        });

        it('should allow admin', async () => {
            const result = await permissionService.canEditRoom(adminId, roomId);
            expect(result).toBe(true);
        });

        it('should deny member', async () => {
            const result = await permissionService.canEditRoom(memberId, roomId);
            expect(result).toBe(false);
        });
    });

    describe('isRoomOwner', () => {
        it('should return true for owner', async () => {
            const result = await permissionService.isRoomOwner(ownerId, roomId);
            expect(result).toBe(true);
        });

        it('should return false for non-owner', async () => {
            const result = await permissionService.isRoomOwner(adminId, roomId);
            expect(result).toBe(false);
        });
    });

    describe('isRoomAdminOrOwner', () => {
        it('should return true for owner', async () => {
            const result = await permissionService.isRoomAdminOrOwner(ownerId, roomId);
            expect(result).toBe(true);
        });

        it('should return true for admin', async () => {
            const result = await permissionService.isRoomAdminOrOwner(adminId, roomId);
            expect(result).toBe(true);
        });

        it('should return false for member', async () => {
            const result = await permissionService.isRoomAdminOrOwner(memberId, roomId);
            expect(result).toBe(false);
        });
    });
});
