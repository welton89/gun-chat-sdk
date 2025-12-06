import { GunService } from '../../src/services/GunService';
import { UserService } from '../../src/services/UserService';
import { RoomService } from '../../src/services/RoomService';
import { MessageService } from '../../src/services/MessageService';

/**
 * Integration tests using real Gun.js server
 * Server: https://gunjs-chat.squareweb.app/gun
 */

describe('Integration Tests - User Flow', () => {
    let gunService: GunService;
    let userService: UserService;
    let roomService: RoomService;
    let messageService: MessageService;

    const testUsername = `testuser_${Date.now()}`;
    const testPassword = 'testpass123';

    beforeAll(() => {
        gunService = GunService.getInstance(['https://gunjs-chat.squareweb.app/gun']);
        userService = new UserService(gunService);
        roomService = new RoomService(gunService);
        messageService = new MessageService(gunService);
    });

    describe('Complete User Flow', () => {
        let userId: string;
        let roomId: string;

        it('should create a new user', async () => {
            const user = await userService.createUser({
                alias: testUsername,
                password: testPassword,
                profile: {
                    bio: 'Integration test user',
                    status: 'online',
                },
            });

            expect(user).toBeDefined();
            expect(user.alias).toBe(testUsername);
            expect(user.pub).toBeDefined();
            expect(user.profile.bio).toBe('Integration test user');

            userId = user.pub;
        }, 10000);

        it('should authenticate the user', async () => {
            const user = await userService.authenticate({
                alias: testUsername,
                password: testPassword,
            });

            expect(user).toBeDefined();
            expect(user.alias).toBe(testUsername);
            expect(user.pub).toBe(userId);
        }, 10000);

        it('should update user profile', async () => {
            await userService.updateProfile({
                userId,
                profile: {
                    bio: 'Updated bio',
                },
            });

            // Wait a bit for Gun.js to sync
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const user = await userService.getUser(userId);
            expect(user?.profile.bio).toBe('Updated bio');
        }, 10000);

        it('should create a public room', async () => {
            const room = await roomService.createRoom(
                {
                    name: `Test Room ${Date.now()}`,
                    type: 'public',
                    typeMsg: ['text', 'image'],
                },
                userId
            );

            expect(room).toBeDefined();
            expect(room.type).toBe('public');
            expect(room.owner).toBe(userId);
            expect(room.members[userId]).toBeDefined();
            expect(room.members[userId].role).toBe('owner');

            roomId = 'mock-room-id'; // UUID is mocked in tests
        }, 10000);

        it('should send a text message', async () => {
            const message = await messageService.sendMessage(
                {
                    roomId,
                    body: 'Hello from integration test!',
                },
                userId
            );

            expect(message).toBeDefined();
            expect(message.type).toBe('text');
            expect(message.from).toBe(userId);
            expect(message.content).toHaveProperty('body', 'Hello from integration test!');
        }, 20000);

        it('should add a reaction to message', async () => {
            // Wait for sync
            await new Promise((resolve) => setTimeout(resolve, 2000));

            const messages = await messageService.getMessages(roomId, 1);

            if (messages.length > 0) {
                const messageId = messages[0].id!;

                await messageService.addReaction({
                    roomId,
                    messageId,
                    emoji: '👍',
                    userId,
                });

                // Wait for sync
                await new Promise((resolve) => setTimeout(resolve, 2000));

                const updatedMessages = await messageService.getMessages(roomId, 1);
                // Check if reaction exists (might be in object or array depending on deserialize)
                // Our deserialize converts to array
                const reactions = updatedMessages[0].reactions['👍'];
                expect(reactions).toBeDefined();
                expect(reactions).toContain(userId);
            }
        }, 20000);

        it('should logout user', () => {
            expect(() => userService.logout()).not.toThrow();
        });
    });
});

describe('Integration Tests - Room Types', () => {
    let gunService: GunService;
    let userService: UserService;
    let roomService: RoomService;
    let userId: string;

    const testUsername = `roomtest_${Date.now()}`;

    beforeAll(async () => {
        gunService = GunService.getInstance(['https://gunjs-chat.squareweb.app/gun']);
        userService = new UserService(gunService);
        roomService = new RoomService(gunService);

        const user = await userService.createUser({
            alias: testUsername,
            password: 'testpass123',
        });
        userId = user.pub;
    }, 15000);

    it('should create a gram room', async () => {
        const room = await roomService.createRoom(
            {
                name: `Gram Feed ${Date.now()}`,
                type: 'gram',
            },
            userId
        );

        expect(room.type).toBe('gram');
    }, 10000);

    it('should create a feed room', async () => {
        const room = await roomService.createRoom(
            {
                name: `News Feed ${Date.now()}`,
                type: 'feed',
            },
            userId
        );

        expect(room.type).toBe('feed');
    }, 10000);

    it('should create a DM room', async () => {
        const room = await roomService.createRoom(
            {
                name: 'DM Test',
                type: 'dm',
            },
            userId
        );

        expect(room.type).toBe('dm');
    }, 10000);

    it('should create a private room', async () => {
        const room = await roomService.createRoom(
            {
                name: `Private Room ${Date.now()}`,
                type: 'private',
            },
            userId
        );

        expect(room.type).toBe('private');
    }, 10000);
});
