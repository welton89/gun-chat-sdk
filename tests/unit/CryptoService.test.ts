import { CryptoService } from '../../src/services/CryptoService';
import Gun from 'gun';

// Mock Gun and SEA
jest.mock('gun', () => {
    return {
        SEA: {
            pair: jest.fn(),
            work: jest.fn(),
            encrypt: jest.fn(),
            decrypt: jest.fn(),
            secret: jest.fn(),
            sign: jest.fn(),
            verify: jest.fn(),
            random: jest.fn(),
        }
    };
});

describe('CryptoService', () => {
    let cryptoService: CryptoService;

    beforeEach(() => {
        cryptoService = new CryptoService();
        jest.clearAllMocks();
    });

    describe('generatePair', () => {
        it('should call SEA.pair', async () => {
            const mockPair = { pub: 'pub', priv: 'priv', epub: 'epub', epriv: 'epriv' };
            (Gun.SEA.pair as jest.Mock).mockResolvedValue(mockPair);

            const result = await cryptoService.generatePair();
            expect(Gun.SEA.pair).toHaveBeenCalled();
            expect(result).toEqual(mockPair);
        });
    });

    describe('generateSymmetricKey', () => {
        it('should generate a key using SEA.work', async () => {
            const mockKey = 'symmetric-key';
            (Gun.SEA.work as jest.Mock).mockResolvedValue(mockKey);

            const result = await cryptoService.generateSymmetricKey();
            expect(Gun.SEA.work).toHaveBeenCalled();
            expect(result).toEqual(mockKey);
        });

        it('should throw error if key generation fails', async () => {
            (Gun.SEA.work as jest.Mock).mockResolvedValue(undefined);
            await expect(cryptoService.generateSymmetricKey()).rejects.toThrow('Failed to generate symmetric key');
        });
    });

    describe('encryptSymmetric', () => {
        it('should encrypt data using SEA.encrypt', async () => {
            const data = { msg: 'hello' };
            const key = 'secret-key';
            const encrypted = 'encrypted-data';
            (Gun.SEA.encrypt as jest.Mock).mockResolvedValue(encrypted);

            const result = await cryptoService.encryptSymmetric(data, key);
            expect(Gun.SEA.encrypt).toHaveBeenCalledWith(data, key);
            expect(result).toEqual(encrypted);
        });
    });

    describe('decryptSymmetric', () => {
        it('should decrypt data using SEA.decrypt', async () => {
            const encrypted = 'encrypted-data';
            const key = 'secret-key';
            const decrypted = { msg: 'hello' };
            (Gun.SEA.decrypt as jest.Mock).mockResolvedValue(decrypted);

            const result = await cryptoService.decryptSymmetric(encrypted, key);
            expect(Gun.SEA.decrypt).toHaveBeenCalledWith(encrypted, key);
            expect(result).toEqual(decrypted);
        });
    });

    describe('encryptRoomKeyForUser', () => {
        it('should generate shared secret and encrypt room key', async () => {
            const roomKey = 'room-key';
            const recipientPub = 'recipient-pub';
            const senderPair = { epriv: 'sender-epriv' };
            const secret = 'shared-secret';
            const encryptedKey = 'encrypted-room-key';

            (Gun.SEA.secret as jest.Mock).mockResolvedValue(secret);
            (Gun.SEA.encrypt as jest.Mock).mockResolvedValue(encryptedKey);

            const result = await cryptoService.encryptRoomKeyForUser(roomKey, recipientPub, senderPair);

            expect(Gun.SEA.secret).toHaveBeenCalledWith(recipientPub, senderPair);
            expect(Gun.SEA.encrypt).toHaveBeenCalledWith(roomKey, secret);
            expect(result).toEqual(encryptedKey);
        });

        it('should throw error if secret generation fails', async () => {
            (Gun.SEA.secret as jest.Mock).mockResolvedValue(undefined);
            await expect(cryptoService.encryptRoomKeyForUser('key', 'pub', {})).rejects.toThrow('Failed to generate shared secret');
        });
    });

    describe('decryptRoomKeyFromUser', () => {
        it('should generate shared secret and decrypt room key', async () => {
            const encryptedRoomKey = 'encrypted-room-key';
            const senderPub = 'sender-pub';
            const recipientPair = { epriv: 'recipient-epriv' };
            const secret = 'shared-secret';
            const roomKey = 'room-key';

            (Gun.SEA.secret as jest.Mock).mockResolvedValue(secret);
            (Gun.SEA.decrypt as jest.Mock).mockResolvedValue(roomKey);

            const result = await cryptoService.decryptRoomKeyFromUser(encryptedRoomKey, senderPub, recipientPair);

            expect(Gun.SEA.secret).toHaveBeenCalledWith(senderPub, recipientPair);
            expect(Gun.SEA.decrypt).toHaveBeenCalledWith(encryptedRoomKey, secret);
            expect(result).toEqual(roomKey);
        });

        it('should throw error if secret generation fails', async () => {
            (Gun.SEA.secret as jest.Mock).mockResolvedValue(undefined);
            await expect(cryptoService.decryptRoomKeyFromUser('enc', 'pub', {})).rejects.toThrow('Failed to generate shared secret');
        });
    });
});
