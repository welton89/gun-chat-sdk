
import { GunService } from '../src';

async function listAllUsers() {
    console.log('🔍 Iniciando varredura de usuários...');
    console.log('-----------------------------------');

    const gunService = GunService.getInstance(['https://gunjs-chat.squareweb.app/gun']);
    const gun = gunService.getGun();

    console.log('📡 Conectado ao Gun.js. Buscando nó "users"...');

    const users: any[] = [];

    // Timeout de segurança para parar a busca
    const timeout = setTimeout(() => {
        console.log('\n-----------------------------------');
        console.log(`⏱️ Tempo esgotado. Encontrados ${users.length} usuários.`);
        console.table(users);
        process.exit(0);
    }, 5000);

    // Iterar sobre o nó 'users'
    gun.get('users').map().once((data: any, key: string) => {
        if (data && data.alias) {
            // Tentar extrair dados úteis
            const user = {
                pub: key,
                alias: data.alias,
                status: data.profile?.status || 'unknown',
                bio: data.profile?.bio || '',
                createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : 'N/A'
            };
            users.push(user);
            process.stdout.write('.'); // Feedback visual
        }
    });
}

listAllUsers();
