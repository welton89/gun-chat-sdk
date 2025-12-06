import { MessageService } from '../../src/services/MessageService';
import { GunService } from '../../src/services/GunService';
import { Message, MessageType } from '../../src/types';

// Mock GunService
const mockGunService = {
    get: jest.fn(),
    put: jest.fn(),
    getInstance: jest.fn(),
} as unknown as GunService;

describe('MessageService Unit Tests', () => {
    let messageService: MessageService;
    const roomId = 'room-123';
    const userId = 'user-123';

    beforeEach(() => {
        jest.clearAllMocks();
        messageService = new MessageService(mockGunService);
    });

    describe('sendMessage', () => {
        it('should send a text message correctly', async () => {
            const dto = {
                roomId,
                body: 'Hello World',
            };

            // Mock put to resolve
            (mockGunService.put as jest.Mock).mockResolvedValue(undefined);

            const message = await messageService.sendMessage(dto, userId);

            expect(message).toBeDefined();
            expect(message.type).toBe('text');
            expect(message.content).toHaveProperty('body', 'Hello World');
            expect(message.from).toBe(userId);
            expect(message.readBy).toContain(userId);

            // Verify Gun interaction
            expect(mockGunService.put).toHaveBeenCalledWith(
                expect.stringContaining(`messages/${roomId}/`),
                expect.objectContaining({
                    type: 'text',
                    content: { body: 'Hello World' },
                    // Verify serialization of arrays to objects
                    readBy: { [userId]: true },
                    reactions: {}
                })
            );
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

            // Verify serialization in Gun put
            expect(mockGunService.put).toHaveBeenCalledWith(
                expect.stringContaining(`messages/${roomId}/`),
                expect.objectContaining({
                    type: 'poll',
                    content: expect.objectContaining({
                        // Options should be object with index keys
                        options: { '0': 'Red', '1': 'Blue' },
                        votes: {}
                    })
                })
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
                    readBy: { [userId]: true }, // Serialized format
                    reactions: {
                        '👍': { [userId]: true } // Serialized format
                    }
                }
            };

            (mockGunService.get as jest.Mock).mockResolvedValue(mockGunData);

            const messages = await messageService.getMessages(roomId);

            expect(messages).toHaveLength(1);
            const msg = messages[0];

            expect(msg.id).toBe(mockMessageId);
            expect(msg.type).toBe('text');
            // Verify deserialization back to arrays
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
                        options: { '0': 'A', '1': 'B' }, // Serialized
                        votes: { '0': { [userId]: true } } // Serialized
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

            // Verify options deserialized to array
            expect(Array.isArray(content.options)).toBe(true);
            expect(content.options[0]).toBe('A');
            expect(content.options[1]).toBe('B');

            // Verify votes deserialized
            expect(Array.isArray(content.votes['0'])).toBe(true);
            expect(content.votes['0']).toContain(userId);
        });
    });
});
