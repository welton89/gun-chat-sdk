import { UserId, Timestamp, UserStatus } from './common.types';

/**
 * User profile information
 */
export interface UserProfile {
    avatar?: string;
    bio?: string;
    status: UserStatus;
}

/**
 * User entity
 */
export interface User {
    alias: string;
    pub: string; // Gun SEA public key
    profile: UserProfile;
    createdAt: Timestamp;
}

/**
 * DTO for creating a new user
 */
export interface CreateUserDTO {
    alias: string;
    password: string;
    profile?: Partial<UserProfile>;
}

/**
 * DTO for user authentication
 */
export interface AuthenticateUserDTO {
    alias: string;
    password: string;
}

/**
 * DTO for updating user profile
 */
export interface UpdateProfileDTO {
    userId: UserId;
    profile: Partial<UserProfile>;
}
