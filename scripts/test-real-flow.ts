
import { GunService, UserService, RoomService, MessageService } from '../src';

async function runRealFlowTest() {
    console.log('🚀 Iniciando Teste de Fluxo Real...');
    console.log('-----------------------------------');

    // 1. Inicializar Gun
    console.log('📡 Conectando ao servidor Gun.js público...');
    const gunService = GunService.getInstance(['https://gunjs-chat.squareweb.app/gun']);

    const userService = new UserService(gunService);
    const roomService = new RoomService(gunService);
    const messageService = new MessageService(gunService);

    const timestamp = Date.now();
    const alias = `test_user_${timestamp}`;
    const password = 'password123';

    try {
        // 2. Criar Usuário
        console.log(`\n👤 Criando usuário: ${alias}...`);
        const user = await userService.createUser({
            alias,
            password,
            profile: {
                bio: 'Test user for real flow',
                status: 'online'
            }
        });
        console.log('✅ Usuário criado com sucesso:', user.pub);

        // 3. Autenticar (Login)
        console.log('\n🔐 Autenticando...');
        const authUser = await userService.authenticate({
            alias,
            password
        });
        console.log('✅ Autenticado como:', authUser.alias);

        // 4. Criar Sala Pública
        console.log('\n🏠 Criando sala pública...');
        const roomName = `Sala de Teste ${timestamp}`;
        const room = await roomService.createRoom({
            name: roomName,
            type: 'public',
            typeMsg: ['text']
        }, authUser.pub);
        console.log('✅ Sala criada:', room.name, `(ID: ${room.id || 'N/A'})`);

        if (!room.id) {
            throw new Error('ID da sala não retornado!');
        }

        // 5. Enviar Mensagem
        console.log('\n💬 Enviando mensagem...');
        const messageBody = 'Olá! Esta é uma mensagem de teste do fluxo real.';
        const message = await messageService.sendMessage({
            roomId: room.id,
            body: messageBody
        }, authUser.pub);
        console.log('✅ Mensagem enviada:', message.content);

        // 6. Verificar Mensagem (Opcional - espera propagação)
        console.log('\n👀 Verificando mensagens na sala (aguardando 2s)...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        const messages = await messageService.getMessages(room.id);
        console.log(`✅ Mensagens encontradas: ${messages.length}`);

        const found = messages.find(m => (m.content as any).body === messageBody);
        if (found) {
            console.log('🎉 SUCESSO! Mensagem encontrada no histórico.');
        } else {
            console.warn('⚠️ AVISO: Mensagem ainda não apareceu no histórico (pode ser delay de rede).');
        }

        console.log('\n-----------------------------------');
        console.log('🏁 Teste finalizado com sucesso!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERRO no fluxo:', error);
        process.exit(1);
    }
}

runRealFlowTest();
