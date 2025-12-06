import { PermissionService } from '../../src/services/PermissionService';
import { RoomService } from '../../src/services/RoomService';
import { MessageService } from '../../src/services/MessageService';
import { Room, Message } from '../../src/types';

// Mocks
const mockRoomService = {
    getRoomById: jest.fn(),
} as unknown as RoomService;

const mockMessageService = {
    getMessages: jest.fn(), // Not used directly in permission checks but good to mock
    // We might need a way to get a single message if PermissionService uses it, 
    // but looking at the service, it often takes messageId. 
    // Let's check if PermissionService calls messageService.getMessage (it might be private or via getMessages)
    // Actually PermissionService usually needs to fetch the message to check ownership for deletion.
    // Let's assume we might need to mock something if PermissionService calls it.
    // Checking the file content will confirm.
} as unknown as MessageService;

// We need to see the implementation of PermissionService to know what it calls.
// Based on common patterns:
// canSendMessage -> checks room.members[userId] and room.typeMsg
// canManageMembers -> checks room.members[userId].role
// canDeleteMessage -> checks room role OR message ownership

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

    // Note: canDeleteMessage usually requires fetching the message to check author.
    // If PermissionService implements this, we need to mock how it gets the message.
    // If it's not implemented or uses a different approach, we'll adjust.
});
