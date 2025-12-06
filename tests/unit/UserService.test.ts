import { GunService } from '../../src/services/GunService';
import { UserService } from '../../src/services/UserService';
import { CreateUserDTO, AuthenticateUserDTO } from '../../src/types';

// Mock Gun.js
jest.mock('gun', () => {
    return jest.fn(() => ({
        user: jest.fn(() => ({
            create: jest.fn(),
            auth: jest.fn(),
            is: { pub: 'mock-user-id' },
            recall: jest.fn(),
            leave: jest.fn(),
        })),
        get: jest.fn(() => ({
            put: jest.fn(),
            once: jest.fn(),
            on: jest.fn(),
            off: jest.fn(),
        })),
    }));
});

describe('UserService', () => {
    let gunService: GunService;
    let userService: UserService;

    beforeEach(() => {
        gunService = GunService.getInstance();
        userService = new UserService(gunService);
    });

    describe('createUser', () => {
        it('should create a new user successfully', async () => {
            const dto: CreateUserDTO = {
                alias: 'testuser',
                password: 'password123',
                profile: {
                    bio: 'Test bio',
                    status: 'online',
                },
            };

            const mockUser = gunService.getUser();

            // Mock successful creation
            mockUser.create.mockImplementation((_alias: string, _password: string, callback: any) => {
                callback({ ok: true });
            });

            // Mock successful authentication
            mockUser.auth.mockImplementation((_alias: string, _password: string, callback: any) => {
                callback({ ok: true });
            });

            const user = await userService.createUser(dto);

            expect(user).toBeDefined();
            expect(user.alias).toBe(dto.alias);
            expect(user.profile.bio).toBe(dto.profile?.bio);
            expect(mockUser.create).toHaveBeenCalledWith(dto.alias, dto.password, expect.any(Function));
        });

        it('should reject if user creation fails', async () => {
            const dto: CreateUserDTO = {
                alias: 'testuser',
                password: 'password123',
            };

            const mockUser = gunService.getUser();

            // Mock failed creation
            mockUser.create.mockImplementation((_alias: string, _password: string, callback: any) => {
                callback({ err: 'User already exists' });
            });

            await expect(userService.createUser(dto)).rejects.toThrow('User already exists');
        });

        it('should reject if authentication fails after creation', async () => {
            const dto: CreateUserDTO = {
                alias: 'testuser',
                password: 'password123',
            };

            const mockUser = gunService.getUser();

            // Mock successful creation
            mockUser.create.mockImplementation((_alias: string, _password: string, callback: any) => {
                callback({ ok: true });
            });

            // Mock failed authentication
            mockUser.auth.mockImplementation((_alias: string, _password: string, callback: any) => {
                callback({ err: 'Authentication failed' });
            });

            await expect(userService.createUser(dto)).rejects.toThrow('Authentication failed');
        });
    });

    describe('authenticate', () => {
        it('should authenticate user with valid credentials', async () => {
            const dto: AuthenticateUserDTO = {
                alias: 'testuser',
                password: 'password123',
            };

            const mockUser = gunService.getUser();

            // Mock successful authentication
            mockUser.auth.mockImplementation((_alias: string, _password: string, callback: any) => {
                callback({ ok: true });
            });

            // Mock getUser to return user data
            jest.spyOn(userService, 'getUser').mockResolvedValue({
                alias: dto.alias,
                pub: 'mock-user-id',
                profile: { status: 'offline' },
                createdAt: Date.now(),
            });

            const user = await userService.authenticate(dto);

            expect(user).toBeDefined();
            expect(user.alias).toBe(dto.alias);
            expect(mockUser.auth).toHaveBeenCalledWith(dto.alias, dto.password, expect.any(Function));
        });

        it('should reject with invalid credentials', async () => {
            const dto: AuthenticateUserDTO = {
                alias: 'testuser',
                password: 'wrongpassword',
            };

            const mockUser = gunService.getUser();

            // Mock failed authentication
            mockUser.auth.mockImplementation((_alias: string, _password: string, callback: any) => {
                callback({ err: 'Wrong password' });
            });

            await expect(userService.authenticate(dto)).rejects.toThrow('Invalid credentials');
        });

        it('should reject if user not found after authentication', async () => {
            const dto: AuthenticateUserDTO = {
                alias: 'testuser',
                password: 'password123',
            };

            const mockUser = gunService.getUser();

            // Mock successful authentication
            mockUser.auth.mockImplementation((_alias: string, _password: string, callback: any) => {
                callback({ ok: true });
            });

            // Mock getUser to return null
            jest.spyOn(userService, 'getUser').mockResolvedValue(null);

            await expect(userService.authenticate(dto)).rejects.toThrow('User not found');
        });
    });

    describe('getUser', () => {
        it('should return user data if exists', async () => {
            const userId = 'test-user-id';
            const mockUserData = {
                alias: 'testuser',
                pub: userId,
                profile: { status: 'online' as const },
                createdAt: Date.now(),
            };

            jest.spyOn(gunService, 'get').mockResolvedValue(mockUserData);

            const user = await userService.getUser(userId);

            expect(user).toEqual(mockUserData);
            expect(gunService.get).toHaveBeenCalledWith(`users/${userId}`);
        });

        it('should return null if user does not exist', async () => {
            const userId = 'non-existent-user';

            jest.spyOn(gunService, 'get').mockResolvedValue(null);

            const user = await userService.getUser(userId);

            expect(user).toBeNull();
        });
    });

    describe('updateProfile', () => {
        it('should update user profile successfully', async () => {
            const userId = 'test-user-id';
            const existingUser = {
                alias: 'testuser',
                pub: userId,
                profile: { status: 'online' as const, bio: 'Old bio' },
                createdAt: Date.now(),
            };

            jest.spyOn(userService, 'getUser').mockResolvedValue(existingUser);
            jest.spyOn(gunService, 'put').mockResolvedValue(undefined);

            await userService.updateProfile({
                userId,
                profile: { bio: 'New bio' },
            });

            expect(gunService.put).toHaveBeenCalledWith(
                `users/${userId}/profile`,
                expect.objectContaining({ bio: 'New bio' })
            );
        });

        it('should throw error if user not found', async () => {
            const userId = 'non-existent-user';

            jest.spyOn(userService, 'getUser').mockResolvedValue(null);

            await expect(
                userService.updateProfile({
                    userId,
                    profile: { bio: 'New bio' },
                })
            ).rejects.toThrow('User not found');
        });
    });

    describe('setStatus', () => {
        it('should update user status', async () => {
            const userId = 'test-user-id';
            jest.spyOn(gunService, 'put').mockResolvedValue(undefined);

            await userService.setStatus(userId, 'away');

            expect(gunService.put).toHaveBeenCalledWith(
                `users/${userId}/profile/status`,
                'away'
            );
        });
    });

    describe('logout', () => {
        it('should call user.leave()', () => {
            const mockUser = gunService.getUser();

            userService.logout();

            expect(mockUser.leave).toHaveBeenCalled();
        });
    });
});
