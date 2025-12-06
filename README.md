# Gun.js Chat SDK

TypeScript SDK para chat descentralizado usando Gun.js.

## 🚀 Instalação

```bash
npm install @gun-chat/sdk
```

## 📖 Uso Básico

```typescript
import { GunService, UserService, RoomService, MessageService } from '@gun-chat/sdk';

// Inicializar SDK
const gunService = GunService.getInstance(['http://localhost:8765/gun']);
const userService = new UserService(gunService);
const roomService = new RoomService(gunService);
const messageService = new MessageService(gunService);

// Criar usuário
const user = await userService.createUser({
  alias: 'username',
  password: 'password123'
});

// Criar sala
const room = await roomService.createRoom({
  name: 'Minha Sala',
  type: 'public'
}, user.pub);

// Enviar mensagem
await messageService.sendMessage({
  roomId: room.id,
  body: 'Olá, mundo!'
}, user.pub);
```

## 📚 Documentação Completa

Veja [DOCUMENTATION.md](./DOCUMENTATION.md) para documentação completa incluindo:

- Arquitetura do SDK
- Todos os tipos TypeScript
- API completa de todos os serviços
- Exemplos de uso detalhados
- Tipos de salas e mensagens suportados

## 🏗️ Desenvolvimento

```bash
# Instalar dependências
npm install

# Compilar TypeScript
npm run build

# Rodar testes
npm test

# Cobertura de testes
npm run test:coverage

# Lint
npm run lint
```

## ✨ Funcionalidades

- ✅ **5 Serviços Core**: GunService, UserService, RoomService, MessageService, PermissionService
- ✅ **Tipos de Sala**: public, private, dm, gram, feed
- ✅ **Tipos de Mensagem**: text, image, video, poll, thread, reaction
- ✅ **Sistema de Permissões**: Granular por role (owner, admin, member)
- ✅ **TypeScript**: Totalmente tipado

## 📊 Status

- ✅ Fase 1: Setup e Configuração
- ✅ Fase 2: Definição de Tipos
- ✅ Fase 3: Serviços Core
- 🚧 Fase 4: Testes (Em andamento - Unitários e Integração parciais)

## 📝 Licença

MIT
