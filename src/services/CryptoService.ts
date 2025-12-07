import Gun from 'gun';
import 'gun/sea';

/**
 * Service for handling cryptographic operations using Gun.js SEA
 */
export class CryptoService {
    /**
     * Generate a random pair of keys (public/private)
     * Useful for ephemeral keys or room keys if we decide to use pairs
     */
    public async generatePair(): Promise<any> {
        return await Gun.SEA.pair();
    }

    /**
     * Generate a random secret string (symmetric key)
     * Used as the room key for encrypting messages
     */
    public async generateSymmetricKey(): Promise<string> {
        // Gun.SEA.random returns a string or object depending on implementation, but usually we need a string for work
        // Using Math.random fallback if SEA.random is not available in types
        const salt = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const key = await Gun.SEA.work(salt, null, null, { name: 'SHA-256' });
        if (!key) throw new Error('Failed to generate symmetric key');
        return key;
    }

    /**
     * Encrypt data with a symmetric key (shared secret)
     */
    public async encryptSymmetric(data: any, key: string): Promise<string> {
        return await Gun.SEA.encrypt(data, key);
    }

    /**
     * Decrypt data with a symmetric key (shared secret)
     */
    public async decryptSymmetric(encryptedData: string, key: string): Promise<any> {
        return await Gun.SEA.decrypt(encryptedData, key);
    }

    /**
     * Encrypt the room key for a specific user
     * Uses ECDH: secret = SEA.secret(recipientPub, myPair)
     * Then encrypts the roomKey with this secret
     */
    public async encryptRoomKeyForUser(
        roomKey: string,
        recipientPub: string,
        senderPair: any
    ): Promise<string> {
        const secret = await Gun.SEA.secret(recipientPub, senderPair);
        if (!secret) throw new Error('Failed to generate shared secret');
        return await Gun.SEA.encrypt(roomKey, secret);
    }

    /**
     * Decrypt the room key sent by another user
     * Uses ECDH: secret = SEA.secret(senderPub, myPair)
     * Then decrypts the encryptedRoomKey with this secret
     */
    public async decryptRoomKeyFromUser(
        encryptedRoomKey: string,
        senderPub: string,
        recipientPair: any
    ): Promise<string> {
        const secret = await Gun.SEA.secret(senderPub, recipientPair);
        if (!secret) throw new Error('Failed to generate shared secret');
        return await Gun.SEA.decrypt(encryptedRoomKey, secret);
    }

    /**
     * Verify signature of data
     */
    public async verify(data: any, pub: string): Promise<boolean> {
        return await Gun.SEA.verify(data, pub);
    }

    /**
     * Sign data
     */
    public async sign(data: any, pair: any): Promise<any> {
        return await Gun.SEA.sign(data, pair);
    }
}
