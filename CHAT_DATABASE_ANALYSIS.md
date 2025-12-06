# 📊 Análise Comparativa: Estruturas de Dados dos Principais Apps de Chat

## 🎯 Objetivo
Analisar as estruturas de banco de dados do WhatsApp, Matrix, Telegram e Discord para criar uma arquitetura otimizada para nosso chat Gun.js.

---

## 1️⃣ WhatsApp

### 🏗️ Arquitetura
- **Backend**: Apache Cassandra (NoSQL) + Mnesia (Erlang DBMS)
- **Local**: SQLite (Android/iOS)
- **Sharding**: Distribuído para escalabilidade

### 📋 Estrutura de Dados

#### **Users**
```
- userID (PK)
- name
- phoneNumber (único)
- profilePicture
- lastActiveTime
- status
```

#### **Messages**
```
- messageID (PK)
- chatID (FK)
- senderID (FK)
- type (text, image, video, audio, document)
- content
- mediaURL
- timestamp
- status (sent, delivered, read)
- replyToMessageID
```

#### **Chats/Groups**
```
- chatID (PK)
- type (direct, group)
- groupName
- createdBy (FK)
- profilePictureURL
- isPublic
```

#### **GroupMembers** (Junction Table)
```
- groupID (FK)
- userID (FK)
- role (admin, member)
- joinedAt
```

### ✨ Funcionalidades Chave
- ✅ Mensagens criptografadas (E2E)
- ✅ Status de entrega/leitura
- ✅ Grupos com admins
- ✅ Mídia compartilhada
- ✅ Respostas a mensagens
- ✅ Listas personalizadas de chats

---

## 2️⃣ Matrix Protocol

### 🏗️ Arquitetura
- **Descentralizado**: Federação de homeservers
- **Estrutura**: DAG (Directed Acyclic Graph) de eventos
- **Versionamento**: Room versions (imutáveis)

### 📋 Estrutura de Dados

#### **Rooms**
```
- roomID (PK)
- roomAlias (ex: #sala:server.com)
- roomVersion
- roomType (public, private)
- powerLevels (permissões por usuário)
```

#### **Events** (Base de tudo)
```
- eventID (PK)
- type (m.room.message, m.room.member, etc)
- sender (userID)
- roomID (FK)
- content (JSON)
- timestamp
- prevEvents (DAG)
```

#### **Message Events**
```
type: m.room.message
content:
  - msgtype (text, image, video, file)
  - body (texto)
  - url (mídia)
  - info (metadados)
```

#### **State Events** (Persistentes)
```
type: m.room.name, m.room.topic, m.room.member
content:
  - name/topic
  - membership (join, leave, invite, ban)
```

### ✨ Funcionalidades Chave
- ✅ Eventos extensíveis (JSON)
- ✅ Edições e reações
- ✅ Threads
- ✅ Enquetes
- ✅ Localização (ao vivo/estática)
- ✅ Chamadas VoIP
- ✅ E2E encryption
- ✅ Redação de eventos (moderação)
- ✅ Read receipts
- ✅ Typing indicators

---

## 3️⃣ Telegram

### 🏗️ Arquitetura
- **Backend**: Distribuído globalmente
- **Indexação**: Otimizada para busca rápida
- **Mídia**: Armazenamento separado

### 📋 Estrutura de Dados

#### **Users**
```
- userID (PK)
- username (único, opcional)
- phoneNumber
- firstName
- lastName
- profilePicture
- status
- createdAt
- updatedAt
```

#### **Chats** (Conceito Geral)
```
- chatID (PK)
- chatType (private, group, channel)
```

#### **Groups**
```
- groupID (PK)
- groupName
- creatorID (FK)
- description
- memberCount
- isPublic
```

#### **Channels**
```
- channelID (PK)
- channelName
- creatorID (FK)
- description
- subscriberCount
- isPublic
- isForum
```

#### **Messages**
```
- messageID (PK)
- channelID/groupID (FK)
- fromUserID (FK)
- messageText
- date
- editDate
- replyToMessageID
- reactions (JSON)
- mediaType
- mediaURL
```

#### **Media**
```
- mediaID (PK)
- messageID (FK)
- mediaType (image, video, audio, document)
- storageURL
- uploadTimestamp
- fileSize
```

### ✨ Funcionalidades Chave
- ✅ Canais de broadcast
- ✅ Grupos com até 200k membros
- ✅ Fóruns (tópicos)
- ✅ Bots e automação
- ✅ Reações customizadas
- ✅ Edição de mensagens
- ✅ Mensagens agendadas
- ✅ Pastas de chat

---

## 4️⃣ Discord

### 🏗️ Arquitetura
- **Backend**: ScyllaDB (evolução do Cassandra)
- **Particionamento**: Por `channel_id`
- **IDs**: Snowflake (timestamp + sequência)

### 📋 Estrutura de Dados

#### **Guilds** (Servidores)
```
- guildID (PK, Snowflake)
- name
- ownerID (FK)
- icon
- splash
- memberCount
- verificationLevel
- features (array)
- rulesChannelID
- systemChannelID
```

#### **Channels**
```
- channelID (PK, Snowflake)
- guildID (FK)
- name
- type (text, voice, category, announcement)
- topic
- position
- parentID (categoria)
- permissionOverwrites
- nsfw (boolean)
```

#### **Messages**
```
Partition Key: channelID
Clustering Key: messageID (desc)

- channelID (PK)
- messageID (PK, Snowflake)
- authorID (FK)
- content
- timestamp (implícito no Snowflake)
- editedTimestamp
- attachments (JSON)
- embeds (JSON)
- mentions (array)
- reactions (JSON)
- type
```

#### **Roles**
```
- roleID (PK)
- guildID (FK)
- name
- permissions (bitfield)
- color
- position
- mentionable
```

### ✨ Funcionalidades Chave
- ✅ Hierarquia de canais (categorias)
- ✅ Threads
- ✅ Fóruns
- ✅ Embeds ricos
- ✅ Reações
- ✅ Stickers
- ✅ Chamadas de voz/vídeo
- ✅ Sistema de permissões granular
- ✅ Bots e webhooks

---

## 📊 Comparação de Funcionalidades

| Funcionalidade | WhatsApp | Matrix | Telegram | Discord |
|---|---|---|---|---|
| **DMs** | ✅ | ✅ | ✅ | ✅ |
| **Grupos** | ✅ | ✅ (Rooms) | ✅ | ✅ (Guilds) |
| **Canais** | ❌ | ✅ | ✅ | ✅ |
| **Threads** | ❌ | ✅ | ❌ | ✅ |
| **Reações** | ✅ | ✅ | ✅ | ✅ |
| **Enquetes** | ❌ | ✅ | ✅ | ❌ |
| **Editar Mensagens** | ✅ | ✅ | ✅ | ✅ |
| **Deletar Mensagens** | ✅ | ✅ (Redact) | ✅ | ✅ |
| **E2E Encryption** | ✅ | ✅ | ✅ (Secret Chats) | ❌ |
| **Typing Indicators** | ✅ | ✅ | ✅ | ✅ |
| **Read Receipts** | ✅ | ✅ | ✅ | ❌ |
| **Chamadas** | ✅ | ✅ | ✅ | ✅ |
| **Compartilhar Mídia** | ✅ | ✅ | ✅ | ✅ |
| **Bots** | ❌ | ✅ | ✅ | ✅ |
| **Permissões Granulares** | ❌ | ✅ | ✅ | ✅ |

---

## 🎯 Recomendações para Gun.js Chat

### Estrutura Proposta

#### **1. Users**
```javascript
{
  [userId]: {
    alias: "username",
    pub: "public_key",  // Gun SEA
    profile: {
      avatar: "url",
      bio: "text",
      status: "online|away|offline"
    },
    createdAt: timestamp
  }
}
```

#### **2. Rooms** (Inspirado em Matrix + Discord)
```javascript
{
  [roomId]: {
    name: "Nome da Sala",
    type: "public|private|dm|gram|feed",
    typeMsg: [],
    owner: userId,
    createdAt: timestamp,
    settings: {
      description: "...",
      avatar: "url",
      maxMembers: 100,
      allowInvites: true,
      isNSFW: false
    },
    members: {
      [userId]: {
        role: "owner|admin|member",
        joinedAt: timestamp,
        permissions: {
          sendMessages: true,
          manageMembers: false,
          deleteMessages: false
        }
      }
    }
  }
}
```

#### **3. Messages** (Inspirado em Matrix Events)
```javascript
{
  [roomId]: {
    [messageId]: {
      type: "text|image|video|poll|reaction|edit|delete|thread",
      from: userId,
      timestamp: timestamp,
      content: {
        // Para text
        body: "mensagem",
        
        // Para mídia
        url: "...",
        mimeType: "...",
        
        // Para poll
        question: "...",
        options: ["A", "B", "C"],
        votes: { optionIndex: [userId1, userId2] },
        
        // Para reaction
        targetMessageId: "...",
        emoji: "👍"
      },
      replyTo: messageId,  // Thread/Reply
      editedAt: timestamp,
      reactions: {
        "👍": [userId1, userId2],
        "❤️": [userId3]
      },
      readBy: [userId1, userId2]
    }
  }
}
```

#### **4. DMs** (Criptografados)
```javascript
{
  [conversationId]: {  // hash(userId1 + userId2)
    participants: [userId1, userId2],
    encrypted: true,
    messages: {
      // Mesma estrutura de messages
    }
  }
}
```

### 🔑 Funcionalidades Prioritárias

**Fase 1 - MVP:**
- ✅ Salas públicas/privadas
- ✅ DMs
- ✅ Mensagens de texto
- ✅ Reações
- ✅ Editar/Deletar mensagens

**Fase 2 - Avançado:**
- ✅ Compartilhar mídia
- ✅ Enquetes
- ✅ Threads/Respostas
- ✅ Typing indicators
- ✅ Read receipts

**Fase 3 - Premium:**
- ✅ Permissões granulares
- ✅ Categorias de canais
- ✅ Bots/Webhooks
- ✅ Chamadas (WebRTC)

---

## 💡 Vantagens da Estrutura Proposta

1. **Flexível**: Baseada em eventos como Matrix
2. **Escalável**: Particionamento por sala como Discord
3. **Descentralizada**: Gun.js nativo
4. **Extensível**: JSON permite novos tipos de eventos
5. **Performática**: Indexação por sala + timestamp
6. **Segura**: Gun SEA para criptografia

---

## 📚 Referências

- WhatsApp: Cassandra + SQLite
- Matrix: Event-based DAG
- Telegram: Sharded architecture
- Discord: Snowflake IDs + ScyllaDB
