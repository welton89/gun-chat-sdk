# 📚 Gun.js Chat SDK - Documentação

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Instalação](#instalação)
3. [Arquitetura](#arquitetura)
4. [Tipos TypeScript](#tipos-typescript)
5. [Serviços](#serviços)
6. [Exemplos de Uso](#exemplos-de-uso)
7. [Status do Projeto](#status-do-projeto)

---

## 🎯 Visão Geral

O **Gun.js Chat SDK** é um SDK TypeScript para construir aplicações de chat descentralizadas usando Gun.js. O SDK fornece uma API completa e type-safe para gerenciar usuários, salas, mensagens e permissões.

### Características Principais

- ✅ **TypeScript First**: Totalmente tipado com suporte completo a IntelliSense
- ✅ **Descentralizado**: Baseado em Gun.js para sincronização P2P
- ✅ **Modular**: Arquitetura baseada em serviços independentes
- ✅ **Extensível**: Suporte a múltiplos tipos de salas e mensagens
- ✅ **Seguro**: Sistema de permissões granular

---

## 📦 Instalação

```bash
npm install @gun-chat/sdk
```

### Dependências

- `gun`: ^0.2020.1241
- `uuid`: ^9.0.0

---

## 🏗️ Arquitetura

### Estrutura do Projeto

```
src/
├── types/              # Definições de tipos TypeScript
│   ├── common.types.ts
│   ├── user.types.ts
│   ├── room.types.ts
│   ├── message.types.ts
│   └── index.ts
├── services/           # Serviços do SDK
│   ├── GunService.ts
│   ├── UserService.ts
│   ├── RoomService.ts
│   ├── MessageService.ts
│   ├── PermissionService.ts
│   └── index.ts
└── index.ts           # Entry point do SDK
```

### Camadas

1. **Tipos**: Definições TypeScript para todas as entidades
2. **Serviços**: Lógica de negócio e interação com Gun.js
3. **API Pública**: Exports consolidados para uso externo

---

## 📐 Tipos TypeScript

### Tipos Comuns

```typescript
type Timestamp = number;
type UserId = string;
type RoomId = string;
type MessageId = string;

type UserStatus = 'online' | 'away' | 'offline';
type RoomType = 'public' | 'private' | 'dm' | 'gram' | 'feed';
type MessageType = 'text' | 'image' | 'video' | 'poll' | 'reaction' | 'edit' | 'delete' | 'thread';
type MemberRole = 'owner' | 'admin' | 'member';
```

### User

```typescript
interface User {
  alias: string;
  pub: string;  // Gun SEA public key
  profile: UserProfile;
  createdAt: Timestamp;
}

interface UserProfile {
  avatar?: string;
  bio?: string;
  status: UserStatus;
}
```

### Room

```typescript
interface Room {
  id?: string; // Injetado pelo SDK
  name: string;
  type: RoomType;
  typeMsg: MessageType[];  // Tipos de mensagens permitidas
  owner: UserId;
  createdAt: Timestamp;
  settings: RoomSettings;
  members: Record<UserId, RoomMember>;
}
// ...
```

### Message

```typescript
interface Message {
  id?: string; // Injetado pelo SDK
  type: MessageType;
  from: UserId;
  timestamp: Timestamp;
  content: MessageContent;
  replyTo?: MessageId;
  editedAt?: Timestamp;
  reactions: Record<string, UserId[]>;
  readBy: UserId[];
}

type MessageContent = 
  | TextContent 
  | MediaContent 
  | PollContent 
  | ReactionContent
  | ThreadContent
  | EditContent
  | DeleteContent;
```

---

## 🔧 Serviços

### 1. GunService

Wrapper singleton para a instância Gun.js.

**Métodos:**

```typescript
class GunService {
  static getInstance(peers?: string[]): GunService
  getGun(): any
  getUser(): any
  getNode(path: string): any
  subscribe(path: string, callback: (data: any) => void): void
  unsubscribe(path: string): void
  put(path: string, data: any): Promise<void>
  get(path: string): Promise<any>
}
```

### 2. UserService

Gerenciamento de usuários e autenticação.

**Métodos:**

```typescript
class UserService {
  createUser(dto: CreateUserDTO): Promise<User>
  authenticate(dto: AuthenticateUserDTO): Promise<User>
  getUser(userId: UserId): Promise<User | null>
  updateProfile(dto: UpdateProfileDTO): Promise<void>
  setStatus(userId: UserId, status: UserStatus): Promise<void>
  logout(): void
}
```

### 3. RoomService

Gerenciamento de salas (públicas, privadas, DMs, gram, feed).

**Métodos:**

```typescript
class RoomService {
  createRoom(dto: CreateRoomDTO, ownerId: UserId): Promise<Room>
  getRoomById(roomId: RoomId): Promise<Room | null>
  updateRoom(dto: UpdateRoomDTO): Promise<void>
  deleteRoom(roomId: RoomId): Promise<void>
  addMember(dto: AddMemberDTO): Promise<void>
  removeMember(roomId: RoomId, userId: UserId): Promise<void>
  updateMemberRole(dto: UpdateMemberRoleDTO): Promise<void>
  listRooms(userId: UserId): Promise<Room[]>
}
```

### 4. MessageService

Gerenciamento de mensagens (text, media, poll, thread, reactions).

**Métodos:**

```typescript
class MessageService {
  sendMessage(dto: SendTextMessageDTO, userId: UserId): Promise<Message>
  sendMediaMessage(dto: SendMediaMessageDTO, userId: UserId): Promise<Message>
  createPoll(dto: CreatePollDTO, userId: UserId): Promise<Message>
  createThread(dto: CreateThreadDTO, userId: UserId): Promise<Message>
  editMessage(dto: EditMessageDTO, userId: UserId): Promise<void>
  deleteMessage(roomId: RoomId, messageId: MessageId): Promise<void>
  addReaction(dto: AddReactionDTO): Promise<void>
  removeReaction(dto: AddReactionDTO): Promise<void>
  votePoll(dto: VotePollDTO): Promise<void>
  markAsRead(roomId: RoomId, messageId: MessageId, userId: UserId): Promise<void>
  getMessages(roomId: RoomId, limit?: number, before?: Timestamp): Promise<Message[]>
}
```

### 5. PermissionService

Sistema de permissões granular.

**Métodos:**

```typescript
class PermissionService {
  canSendMessage(userId: UserId, roomId: RoomId, messageType: MessageType): Promise<boolean>
  canManageMembers(userId: UserId, roomId: RoomId): Promise<boolean>
  canDeleteMessage(userId: UserId, roomId: RoomId, messageId: MessageId): Promise<boolean>
  canEditRoom(userId: UserId, roomId: RoomId): Promise<boolean>
  isRoomOwner(userId: UserId, roomId: RoomId): Promise<boolean>
  isRoomAdminOrOwner(userId: UserId, roomId: RoomId): Promise<boolean>
}
```

---

## 💡 Exemplos de Uso

### Inicialização

```typescript
import { GunService, UserService, RoomService, MessageService } from '@gun-chat/sdk';

// Inicializar Gun.js
const gunService = GunService.getInstance(['http://localhost:8765/gun']);

// Criar instâncias dos serviços
const userService = new UserService(gunService);
const roomService = new RoomService(gunService);
const messageService = new MessageService(gunService);
```

### Criar e Autenticar Usuário

```typescript
// Criar novo usuário
const user = await userService.createUser({
  alias: 'joao',
  password: 'senha123',
  profile: {
    bio: 'Desenvolvedor',
    status: 'online'
  }
});

// Fazer login
const authenticatedUser = await userService.authenticate({
  alias: 'joao',
  password: 'senha123'
});

// Atualizar perfil
await userService.updateProfile({
  userId: user.pub,
  profile: {
    avatar: 'https://example.com/avatar.jpg',
    bio: 'Desenvolvedor Full Stack'
  }
});
```

### Criar Sala

```typescript
// Sala pública
const publicRoom = await roomService.createRoom({
  name: 'Sala Geral',
  type: 'public',
  typeMsg: ['text', 'image', 'video', 'poll'],
  settings: {
    description: 'Sala para discussões gerais',
    maxMembers: 100,
    allowInvites: true,
    isNSFW: false
  }
}, user.pub);

// Sala tipo "gram" (feed de posts)
const gramRoom = await roomService.createRoom({
  name: 'Meu Feed',
  type: 'gram',
  typeMsg: ['text', 'image', 'video'],
  settings: {
    description: 'Feed de posts',
    maxMembers: 1000,
    allowInvites: false
  }
}, user.pub);

// DM (mensagem direta)
const dmRoom = await roomService.createRoom({
  name: 'DM com Maria',
  type: 'dm',
  typeMsg: ['text', 'image', 'video', 'reaction']
}, user.pub);
```

### Gerenciar Membros

```typescript
// Adicionar membro
await roomService.addMember({
  roomId: publicRoom.id,
  userId: 'outro-usuario-id',
  role: 'member'
});

// Promover a admin
await roomService.updateMemberRole({
  roomId: publicRoom.id,
  userId: 'outro-usuario-id',
  role: 'admin'
});

// Remover membro
await roomService.removeMember(publicRoom.id, 'outro-usuario-id');
```

### Enviar Mensagens

```typescript
// Mensagem de texto
const textMessage = await messageService.sendMessage({
  roomId: publicRoom.id,
  body: 'Olá, pessoal!'
}, user.pub);

// Mensagem com mídia
const mediaMessage = await messageService.sendMediaMessage({
  roomId: publicRoom.id,
  url: 'https://example.com/image.jpg',
  mimeType: 'image/jpeg',
  size: 1024000
}, user.pub);

// Criar enquete
const poll = await messageService.createPoll({
  roomId: publicRoom.id,
  question: 'Qual sua linguagem favorita?',
  options: ['JavaScript', 'TypeScript', 'Python', 'Rust'],
  allowMultiple: false
}, user.pub);

// Criar thread (resposta)
const thread = await messageService.createThread({
  roomId: publicRoom.id,
  parentMessageId: textMessage.id,
  body: 'Concordo!'
}, user.pub);
```

### Interagir com Mensagens

```typescript
// Adicionar reação
await messageService.addReaction({
  roomId: publicRoom.id,
  messageId: textMessage.id,
  emoji: '👍',
  userId: user.pub
});

// Votar em enquete
await messageService.votePoll({
  roomId: publicRoom.id,
  messageId: poll.id,
  optionIndex: 1, // TypeScript
  userId: user.pub
});

// Editar mensagem
await messageService.editMessage({
  roomId: publicRoom.id,
  messageId: textMessage.id,
  newBody: 'Olá, pessoal! (editado)'
}, user.pub);

// Marcar como lida
await messageService.markAsRead(publicRoom.id, textMessage.id, user.pub);
```

### Verificar Permissões

```typescript
import { PermissionService } from '@gun-chat/sdk';

const permissionService = new PermissionService(roomService, messageService);

// Verificar se pode enviar mensagem
const canSend = await permissionService.canSendMessage(
  user.pub,
  publicRoom.id,
  'poll'
);

// Verificar se pode gerenciar membros
const canManage = await permissionService.canManageMembers(
  user.pub,
  publicRoom.id
);

// Verificar se é admin ou owner
const isAdmin = await permissionService.isRoomAdminOrOwner(
  user.pub,
  publicRoom.id
);
```

---

## 📊 Status do Projeto

### ✅ Concluído

#### Fase 1: Setup e Configuração
- ✅ Projeto TypeScript configurado
- ✅ Jest configurado para testes
- ✅ ESLint + Prettier configurados
- ✅ Estrutura de pastas criada
- ✅ Dependências instaladas

#### Fase 2: Definição de Tipos
- ✅ `common.types.ts` - Tipos base
- ✅ `user.types.ts` - Tipos de usuário
- ✅ `room.types.ts` - Tipos de sala (incluindo gram, feed)
- ✅ `message.types.ts` - Tipos de mensagem (incluindo thread)

### Message

```typescript
interface Message {
  id?: MessageId; // Injetado pelo SDK
  type: MessageType;
  from: UserId;
  timestamp: Timestamp;
  content: MessageContent;
  replyTo?: MessageId;
  editedAt?: Timestamp;
  reactions: Record<string, UserId[]>;
  readBy: UserId[];
}
```

#### Fase 3: Serviços Core
- ✅ `GunService` - Wrapper Gun.js
- ✅ `UserService` - Gerenciamento de usuários
- ✅ `RoomService` - Gerenciamento de salas
- ✅ `MessageService` - Gerenciamento de mensagens
- ✅ `PermissionService` - Sistema de permissões

### 🚧 Próximas Etapas

#### Fase 4: Testes
- [x] Testes unitários para UserService
- [x] Testes unitários para RoomService
- [ ] Testes unitários para MessageService
- [ ] Testes unitários para PermissionService
- [x] Testes de integração (Parcialmente concluídos)
- [ ] Cobertura de testes > 80%

#### Fase 5: Funcionalidades Avançadas
- [ ] Otimização de queries
- [ ] Cache local
- [ ] Sincronização offline
- [ ] Webhooks/Events
- [ ] Documentação de API completa

---

## 🎯 Tipos de Salas Suportados

| Tipo | Descrição | Uso |
|------|-----------|-----|
| `public` | Sala pública, qualquer um pode entrar | Chats gerais, comunidades |
| `private` | Sala privada, apenas por convite | Grupos fechados |
| `dm` | Mensagem direta entre dois usuários | Conversas 1:1 |
| `gram` | Feed de posts (estilo Instagram) | Posts, timeline |
| `feed` | Canal de broadcast (estilo Telegram) | Anúncios, notícias |

---

## 🎯 Tipos de Mensagens Suportados

| Tipo | Descrição |
|------|-----------|
| `text` | Mensagem de texto simples |
| `image` | Imagem |
| `video` | Vídeo |
| `poll` | Enquete com opções de voto |
| `reaction` | Reação emoji a uma mensagem |
| `edit` | Edição de mensagem existente |
| `delete` | Deleção de mensagem |
| `thread` | Resposta/thread a uma mensagem |

---

## 📝 Notas de Desenvolvimento

### Estrutura de Dados Gun.js

```
gun/
├── users/
│   └── {userId}/
│       ├── alias
│       ├── pub
│       ├── profile/
│       └── createdAt
├── rooms/
│   └── {roomId}/
│       ├── name
│       ├── type
│       ├── typeMsg[]
│       ├── owner
│       ├── settings/
│       └── members/
│           └── {userId}/
└── messages/
    └── {roomId}/
        └── {messageId}/
            ├── type
            ├── from
            ├── content/
            ├── reactions/
            └── readBy[]
```

### Permissões Padrão

| Role | sendMessages | manageMembers | deleteMessages |
|------|--------------|---------------|----------------|
| owner | ✅ | ✅ | ✅ |
| admin | ✅ | ✅ | ✅ |
| member | ✅ | ❌ | ❌ (apenas próprias) |

---

## 📄 Licença

MIT

---

## 🤝 Contribuindo

Este é um projeto em desenvolvimento ativo. Contribuições são bem-vindas!
