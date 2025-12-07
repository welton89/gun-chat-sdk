
import { MessageService } from '../../src/services/MessageService';
import { GunService } from '../../src/services/GunService';
import { Message, MessageType } from '../../src/types';

// Mock GunService
const mockGunService = {
    get: jest.fn(),
    put: jest.fn(),
    getInstance: jest.fn(),
} as unknown as GunService;

// Mock CryptoService
const mockCryptoService = {
    encryptSymmetric: jest.fn(),
    decryptSymmetric: jest.fn(),
};

// Mock RoomService
const mockRoomService = {
    getRoomKey: jest.fn(),
};

describe('MessageService Unit Tests', () => {
    let messageService: MessageService;
    const roomId = 'room-123';
    const userId = 'user-123';

    beforeEach(() => {
        jest.clearAllMocks();
        mockRoomService.getRoomKey.mockResolvedValue(null);
        messageService = new MessageService(mockGunService, mockRoomService as any, mockCryptoService as any);
    });

    describe('sendMessage', () => {
        it('should send a text message correctly', async () => {
            const dto = {
                roomId,
                body: 'Hello World',
            };

            (mockGunService.put as jest.Mock).mockResolvedValue(undefined);
            mockRoomService.getRoomKey.mockResolvedValue(null); // No encryption for this test

            const message = await messageService.sendMessage(dto, userId);

            expect(message).toBeDefined();
            expect(message.type).toBe('text');
            expect(message.content).toHaveProperty('body', 'Hello World');
            expect(message.from).toBe(userId);
            expect(message.readBy).toContain(userId);

            expect(mockGunService.put).toHaveBeenCalledWith(
                expect.stringContaining(`messages/${roomId}/`),
                expect.objectContaining({
                    type: 'text',
                    content: { body: 'Hello World' },
                    readBy: { [userId]: true },
                    reactions: {}
                })
            );
        });

        it('should encrypt message if room key exists', async () => {
            const dto = {
                roomId,
                body: 'Secret Message',
            };

            (mockGunService.put as jest.Mock).mockResolvedValue(undefined);
            mockRoomService.getRoomKey.mockResolvedValue('room-key');
            mockCryptoService.encryptSymmetric.mockResolvedValue('encrypted-content');

            const message = await messageService.sendMessage(dto, userId);

            expect(message.isEncrypted).toBe(true);
            expect(message.content).toBe('encrypted-content');
            expect(mockCryptoService.encryptSymmetric).toHaveBeenCalledWith({ body: 'Secret Message' }, 'room-key');
        });
    });

    describe('sendMediaMessage', () => {
        it('should send an image message', async () => {
            const dto = {
                roomId,
                url: 'http://example.com/image.png',
                mimeType: 'image/png',
                size: 1024
            };

            (mockGunService.put as jest.Mock).mockResolvedValue(undefined);

            const message = await messageService.sendMediaMessage(dto, userId);

            expect(message.type).toBe('image');
            expect(message.content).toHaveProperty('url', dto.url);
            expect(mockGunService.put).toHaveBeenCalled();
        });
    });

    describe('createPoll', () => {
        it('should create a poll message with serialized options', async () => {
            const dto = {
                roomId,
                question: 'Favorite color?',
                options: ['Red', 'Blue'],
                allowMultiple: false
            };

            (mockGunService.put as jest.Mock).mockResolvedValue(undefined);

            const message = await messageService.createPoll(dto, userId);

            expect(message.type).toBe('poll');
            expect((message.content as any).question).toBe(dto.question);

            expect(mockGunService.put).toHaveBeenCalledWith(
                expect.stringContaining(`messages/${roomId}/`),
                expect.objectContaining({
                    type: 'poll',
                    content: expect.objectContaining({
                        options: { '0': 'Red', '1': 'Blue' },
                        votes: {}
                    })
                })
            );
        });
    });

    describe('votePoll', () => {
        it('should vote in a poll', async () => {
            const dto = {
                roomId,
                messageId: 'poll-123',
                optionIndex: 0,
                userId
            };

            const mockPollData = {
                type: 'poll',
                from: 'other-user',
                content: {
                    question: 'Q?',
                    options: { '0': 'A', '1': 'B' },
                    votes: {}
                }
            };
            (mockGunService.get as jest.Mock).mockResolvedValue(mockPollData);
            (mockGunService.put as jest.Mock).mockResolvedValue(undefined);

            await messageService.votePoll(dto);

            expect(mockGunService.put).toHaveBeenCalledWith(
                `messages/${roomId}/${dto.messageId}/content/votes/${dto.optionIndex}/${userId}`,
                true
            );
        });
    });

    describe('getMessages', () => {
        it('should retrieve and deserialize messages correctly', async () => {
            const mockMessageId = 'msg-123';
            const mockGunData = {
                [mockMessageId]: {
                    type: 'text',
                    from: userId,
                    timestamp: Date.now(),
                    content: { body: 'Hi' },
                    readBy: { [userId]: true },
                    reactions: {
                        '👍': { [userId]: true }
                    }
                }
            };

            (mockGunService.get as jest.Mock).mockResolvedValue(mockGunData);

            const messages = await messageService.getMessages(roomId);

            expect(messages).toHaveLength(1);
            const msg = messages[0];

            expect(msg.id).toBe(mockMessageId);
            expect(msg.type).toBe('text');
            expect(Array.isArray(msg.readBy)).toBe(true);
            expect(msg.readBy).toContain(userId);
            expect(Array.isArray(msg.reactions['👍'])).toBe(true);
            expect(msg.reactions['👍']).toContain(userId);
        });

        it('should handle poll deserialization', async () => {
            const mockMessageId = 'poll-123';
            const mockGunData = {
                [mockMessageId]: {
                    type: 'poll',
                    from: userId,
                    timestamp: Date.now(),
                    content: {
                        question: 'Q?',
                        options: { '0': 'A', '1': 'B' },
                        votes: { '0': { [userId]: true } }
                    },
                    readBy: {},
                    reactions: {}
                }
            };

            (mockGunService.get as jest.Mock).mockResolvedValue(mockGunData);

            const messages = await messageService.getMessages(roomId);
            const msg = messages[0];

            expect(msg.type).toBe('poll');
            const content = msg.content as any;

            expect(Array.isArray(content.options)).toBe(true);
            expect(content.options[0]).toBe('A');
            expect(content.options[1]).toBe('B');

            expect(Array.isArray(content.votes['0'])).toBe(true);
            expect(content.votes['0']).toContain(userId);
        });
    });

    describe('createThread', () => {
        it('should create a thread message correctly', async () => {
            const dto = {
                roomId,
                parentMessageId: 'parent-msg-123',
                body: 'This is a reply'
            };

            (mockGunService.put as jest.Mock).mockResolvedValue(undefined);

            const message = await messageService.createThread(dto, userId);

            expect(message.type).toBe('thread');
            expect((message.content as any).parentMessageId).toBe(dto.parentMessageId);
            expect((message.content as any).body).toBe(dto.body);

            expect(mockGunService.put).toHaveBeenCalledWith(
                expect.stringContaining(`messages/${roomId}/`),
                expect.objectContaining({
                    type: 'thread',
                    content: expect.objectContaining({
                        parentMessageId: dto.parentMessageId,
                        body: dto.body
                    })
                })
            );
        });
    });

    describe('Reactions', () => {
        it('should add a reaction', async () => {
            const dto = {
                roomId,
                messageId: 'msg-123',
                emoji: '👍',
                userId
            };

            const mockMessageData = {
                type: 'text',
                from: 'other-user',
                content: { body: 'Hi' }
            };
            (mockGunService.get as jest.Mock).mockResolvedValue(mockMessageData);
            (mockGunService.put as jest.Mock).mockResolvedValue(undefined);

            await messageService.addReaction(dto);

            expect(mockGunService.put).toHaveBeenCalledWith(
                `messages/${roomId}/${dto.messageId}/reactions/${dto.emoji}/${userId}`,
                true
            );
        });

        it('should remove a reaction', async () => {
            const dto = {
                roomId,
                messageId: 'msg-123',
                emoji: '👍',
                userId
            };

            (mockGunService.put as jest.Mock).mockResolvedValue(undefined);

            await messageService.removeReaction(dto);

            expect(mockGunService.put).toHaveBeenCalledWith(
                `messages/${roomId}/${dto.messageId}/reactions/${dto.emoji}/${userId}`,
                null
            );
        });
    });
});
