import { GunService } from './GunService';
import {
    User,
    UserProfile,
    CreateUserDTO,
    AuthenticateUserDTO,
    UpdateProfileDTO,
    UserId,
    UserStatus,
} from '../types';

/**
 * User service - Manages user operations
 */
export class UserService {
    private gunService: GunService;

    constructor(gunService: GunService) {
        this.gunService = gunService;
    }

    /**
     * Create a new user
     */
    public async createUser(dto: CreateUserDTO): Promise<User> {
        return new Promise((resolve, reject) => {
            const user = this.gunService.getUser();

            user.create(dto.alias, dto.password, (ack: any) => {
                if (ack.err) {
                    reject(new Error(ack.err));
                    return;
                }

                // After creating, authenticate
                user.auth(dto.alias, dto.password, async (authAck: any) => {
                    if (authAck.err) {
                        reject(new Error(authAck.err));
                        return;
                    }

                    const userId = user.is.pub;
                    const profile: UserProfile = {
                        status: 'online',
                        ...dto.profile,
                    };

                    const newUser: User = {
                        alias: dto.alias,
                        pub: userId,
                        profile,
                        createdAt: Date.now(),
                    };

                    // Save user data
                    await this.gunService.put(`users/${userId}`, newUser);

                    resolve(newUser);
                });
            });
        });
    }

    /**
     * Authenticate a user
     */
    public async authenticate(dto: AuthenticateUserDTO): Promise<User> {
        return new Promise((resolve, reject) => {
            const user = this.gunService.getUser();

            user.auth(dto.alias, dto.password, async (ack: any) => {
                if (ack.err) {
                    reject(new Error('Invalid credentials'));
                    return;
                }

                const userId = user.is.pub;
                const userData = await this.getUser(userId);

                if (!userData) {
                    reject(new Error('User not found'));
                    return;
                }

                // Update status to online
                await this.setStatus(userId, 'online');

                resolve(userData);
            });
        });
    }

    /**
     * Get user by ID
     */
    public async getUser(userId: UserId): Promise<User | null> {
        const userData = await this.gunService.get(`users/${userId}`);
        return userData || null;
    }

    /**
     * Update user profile
     */
    public async updateProfile(dto: UpdateProfileDTO): Promise<void> {
        const user = await this.getUser(dto.userId);
        if (!user) {
            throw new Error('User not found');
        }

        const updatedProfile = {
            ...user.profile,
            ...dto.profile,
        };

        await this.gunService.put(`users/${dto.userId}/profile`, updatedProfile);
    }

    /**
     * Set user status
     */
    public async setStatus(userId: UserId, status: UserStatus): Promise<void> {
        await this.gunService.put(`users/${userId}/profile/status`, status);
    }

    /**
     * Logout current user
     */
    public logout(): void {
        const user = this.gunService.getUser();
        user.leave();
    }
}
