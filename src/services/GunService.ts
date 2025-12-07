import Gun from 'gun';
import 'gun/sea';
import 'gun/axe';

/**
 * Gun.js service - Wrapper around Gun instance
 */
export class GunService {
    private static instance: GunService;
    private gun: any;
    private userInstance: any;

    private constructor(peers?: string[]) {
        this.gun = Gun({
            peers: peers || [],
            localStorage: true,
            radisk: true,
            axe: false, // Disable AXE to avoid connecting to default peers automatically
        });
        this.userInstance = this.gun.user().recall({ sessionStorage: true });
    }

    /**
     * Get singleton instance of GunService
     */
    public static getInstance(peers?: string[]): GunService {
        if (!GunService.instance) {
            GunService.instance = new GunService(peers);
        }
        return GunService.instance;
    }

    /**
     * Get Gun instance
     */
    public getGun(): any {
        return this.gun;
    }

    /**
     * Get Gun user instance
     */
    public getUser(): any {
        return this.userInstance;
    }

    /**
   * Get a Gun node by path
   */
    public getNode(path: string): any {
        const parts = path.split('/');
        let node = this.gun;
        for (const part of parts) {
            node = node.get(part);
        }
        return node;
    }

    /**
     * Subscribe to changes on a node
     */
    public subscribe(path: string, callback: (data: any) => void): void {
        this.getNode(path).on(callback);
    }

    /**
     * Unsubscribe from a node
     */
    public unsubscribe(path: string): void {
        this.getNode(path).off();
    }

    /**
     * Put data to a node
     */
    public async put(path: string, data: any): Promise<void> {
        return new Promise((resolve, reject) => {
            this.getNode(path).put(data, (ack: any) => {
                if (ack.err) {
                    reject(new Error(ack.err));
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Get data from a node
     */
    public async get(path: string): Promise<any> {
        return new Promise((resolve) => {
            this.getNode(path).once((data: any) => {
                resolve(data);
            });
        });
    }
}
