import { GunService, UserService, RoomService, MessageService, PermissionService, CryptoService } from '../../src';
import { CreateUserDTO, AuthenticateUserDTO, RoomType } from '../../src/types';

// Initialize Services
// Configure peers - using the public one provided by user
const gunService = GunService.getInstance(['https://gunjs-chat.squareweb.app/gun']);

const cryptoService = new CryptoService();
const userService = new UserService(gunService);
const roomService = new RoomService(gunService, cryptoService);
const messageService = new MessageService(gunService);
// PermissionService is not strictly needed for the basic UI flow but good to have
const permissionService = new PermissionService(roomService, messageService);

// State
let currentUser: any = null;
let currentRoomId: string | null = null;
let rooms: any[] = [];

// DOM Elements
const app = document.getElementById('app')!;
const authSection = document.getElementById('auth-section')!;
const chatSection = document.getElementById('chat-section')!;
const authForm = document.getElementById('auth-form') as HTMLFormElement;
const userStatus = document.getElementById('user-status')!;
const currentUserSpan = document.getElementById('current-user')!;
const logoutBtn = document.getElementById('logout-btn')!;
const roomList = document.getElementById('room-list')!;
const messagesContainer = document.getElementById('messages-container')!;
const messageForm = document.getElementById('message-form') as HTMLFormElement;
const messageInput = document.getElementById('message-input') as HTMLInputElement;
const chatHeader = document.getElementById('chat-header')!;
const currentRoomName = document.getElementById('current-room-name')!;
const roomIdDisplay = document.getElementById('room-id-display')!;
const createRoomBtn = document.getElementById('create-room-btn')!;
const modalOverlay = document.getElementById('modal-overlay')!;
const cancelRoomBtn = document.getElementById('cancel-room-btn')!;
const confirmRoomBtn = document.getElementById('confirm-room-btn')!;
const newRoomName = document.getElementById('new-room-name') as HTMLInputElement;
const newRoomType = document.getElementById('new-room-type') as HTMLSelectElement;
const tabBtns = document.querySelectorAll('.tab-btn');
const registerFields = document.getElementById('register-fields')!;
const authSubmit = document.getElementById('auth-submit')!;
const authError = document.getElementById('auth-error')!;

// Thread State & DOM
let replyingToMessageId: string | null = null;
// We need to define createReplyIndicator before using it if we use it here, 
// OR we can just initialize it lazily or move the function up.
// Better to just create it if not exists here or use a getter.
// But createReplyIndicator uses messageForm which is defined above.
const replyIndicator = document.getElementById('reply-indicator') || createReplyIndicator();

function createReplyIndicator() {
    const div = document.createElement('div');
    div.id = 'reply-indicator';
    div.className = 'hidden bg-gray-100 p-2 text-sm flex justify-between items-center mb-2 rounded';

    // Insert before the input-group container
    const inputGroup = messageForm.querySelector('.input-group');
    if (inputGroup) {
        messageForm.insertBefore(div, inputGroup);
    } else {
        messageForm.prepend(div);
    }
    return div;
}

// Auth Logic
let authMode: 'login' | 'register' = 'login';

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        authMode = (btn as HTMLElement).dataset.tab as 'login' | 'register';

        if (authMode === 'register') {
            registerFields.classList.remove('hidden');
            authSubmit.textContent = 'Register';
        } else {
            registerFields.classList.add('hidden');
            authSubmit.textContent = 'Login';
        }
    });
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alias = (document.getElementById('alias') as HTMLInputElement).value;
    const password = (document.getElementById('password') as HTMLInputElement).value;
    const bio = (document.getElementById('bio') as HTMLInputElement).value;

    try {
        authError.textContent = '';
        if (authMode === 'register') {
            const dto: CreateUserDTO = { alias, password, profile: { bio, status: 'online' } };
            currentUser = await userService.createUser(dto);
        } else {
            const dto: AuthenticateUserDTO = { alias, password };
            currentUser = await userService.authenticate(dto);
        }

        onLoginSuccess();
    } catch (err: any) {
        console.error(err);
        authError.textContent = err.message || 'Authentication failed';
    }
});

logoutBtn.addEventListener('click', () => {
    userService.logout();
    currentUser = null;
    currentRoomId = null;
    onLogout();
});

function onLoginSuccess() {
    authSection.classList.add('hidden');
    chatSection.classList.remove('hidden');
    userStatus.classList.remove('hidden');
    currentUserSpan.textContent = `Logged in as: ${currentUser.alias}`;
    loadRooms();
}

function onLogout() {
    authSection.classList.remove('hidden');
    chatSection.classList.add('hidden');
    userStatus.classList.add('hidden');
    currentUserSpan.textContent = '';
    messagesContainer.innerHTML = '<div class="empty-state">Select a room to start chatting</div>';
    chatHeader.classList.add('hidden');
    messageForm.classList.add('hidden');
}

// Room Logic
createRoomBtn.addEventListener('click', () => {
    modalOverlay.classList.remove('hidden');
});

cancelRoomBtn.addEventListener('click', () => {
    modalOverlay.classList.add('hidden');
});

confirmRoomBtn.addEventListener('click', async () => {
    const name = newRoomName.value;
    const type = newRoomType.value as RoomType;

    if (!name) return;

    if (!currentUser || !currentUser.pub) {
        alert('You must be logged in to create a room');
        return;
    }

    try {
        await roomService.createRoom({
            name,
            type
        }, currentUser.pub);
        modalOverlay.classList.add('hidden');
        newRoomName.value = '';
        loadRooms(); // Refresh list
    } catch (err) {
        console.error('Failed to create room', err);
        alert('Failed to create room');
    }
});

async function loadRooms() {
    // In a real app we might subscribe, but for now let's just list
    // Since listRooms might not be fully implemented to return all public rooms (Gun is graph),
    // we might rely on what the user has joined or created.
    // For this test, let's try to list rooms the user is part of.
    try {
        console.log('Loading rooms for user:', currentUser.pub);
        rooms = await roomService.listRooms(currentUser.pub);
        console.log('Rooms loaded:', rooms);
        renderRooms();
    } catch (err) {
        console.error('Failed to list rooms', err);
    }
}

function renderRooms() {
    console.log('Rendering rooms:', rooms.length);
    roomList.innerHTML = '';
    rooms.forEach(room => {
        const li = document.createElement('li');
        li.className = `room-item ${currentRoomId === room.id ? 'active' : ''}`;
        li.textContent = room.name;
        li.onclick = () => selectRoom(room);
        roomList.appendChild(li);
    });
}

async function selectRoom(room: any) {
    currentRoomId = room.id; // Assuming room object has id (it should from Gun node)
    // Wait, Room interface doesn't strictly have 'id' property in the type definition in implementation_plan
    // but Gun nodes usually have a key or we pass it. 
    // Let's check RoomService.listRooms implementation later.
    // For now assume we can get an ID.

    // If room.id is missing, we might need to fetch it or use the pub/path.
    // Let's assume listRooms returns objects that include the ID (root key).

    currentRoomName.textContent = room.name;
    roomIdDisplay.textContent = `ID: ${room.id || '?'}`; // Debug

    renderRooms(); // Update active state

    chatHeader.classList.remove('hidden');
    messageForm.classList.remove('hidden');
    messagesContainer.innerHTML = ''; // Clear previous messages

    loadMessages();
}

// Message Logic
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Message submit triggered');
    const text = messageInput.value;

    // Check if it's a poll command (simple CLI-like for MVP)
    if (text.startsWith('/poll ')) {
        // Format: /poll Question | Opt1 | Opt2
        const parts = text.replace('/poll ', '').split('|').map(s => s.trim());
        if (parts.length >= 3) {
            const question = parts[0];
            const options = parts.slice(1);
            try {
                if (!currentRoomId) throw new Error('No room selected');
                await messageService.createPoll({
                    roomId: currentRoomId,
                    question,
                    options,
                    allowMultiple: false
                }, currentUser.pub);
                messageInput.value = '';
                loadMessages();
                return;
            } catch (err) {
                console.error('Failed to create poll', err);
            }
        }
    }

    console.log('Message text:', text, 'Current Room:', currentRoomId);

    if (!text || !currentRoomId) {
        console.warn('Missing text or room ID');
        return;
    }

    try {
        console.log('Calling messageService.sendMessage...');

        if (replyingToMessageId) {
            await messageService.createThread({
                roomId: currentRoomId,
                parentMessageId: replyingToMessageId,
                body: text
            }, currentUser.pub);
            cancelThread(); // Reset thread state
        } else {
            await messageService.sendMessage({
                roomId: currentRoomId,
                body: text
            }, currentUser.pub);
        }
        console.log('Message sent successfully');
        messageInput.value = '';
        // Messages should auto-update via subscription if we implement it, 
        // but for now let's just reload or append if we can.
        // The getMessages is a one-time fetch. We need a subscription for real-time.
        // Let's just re-fetch for this simple test.
        loadMessages();
    } catch (err) {
        console.error('Failed to send message', err);
    }
});

async function loadMessages() {
    if (!currentRoomId) return;

    try {
        const messages = await messageService.getMessages(currentRoomId);
        // Sort by timestamp
        messages.sort((a, b) => a.timestamp - b.timestamp);

        messagesContainer.innerHTML = '';
        messages.forEach(msg => {
            renderMessage(msg);
        });
    } catch (err) {
        console.error('Failed to load messages', err);
    }
}

function renderMessage(msg: any) {
    const div = document.createElement('div');
    const isOwn = msg.from === currentUser.pub;
    div.className = `message ${isOwn ? 'own' : ''}`;

    const meta = document.createElement('div');
    meta.className = 'message-meta';
    const fromDisplay = msg.from ? msg.from.slice(0, 8) : 'Unknown';
    meta.textContent = `${isOwn ? 'You' : fromDisplay} • ${new Date(msg.timestamp).toLocaleTimeString()}`;

    const content = document.createElement('div');
    // Handle different content types
    if (msg.type === 'text') {
        content.textContent = (msg.content as any).body;
    } else if (msg.type === 'image') {
        const img = document.createElement('img');
        img.src = (msg.content as any).url;
        img.style.maxWidth = '200px';
        img.style.borderRadius = '8px';
        content.appendChild(img);
    } else if (msg.type === 'poll') {
        const pollContent = msg.content as any;
        content.className = 'bg-blue-50 p-2 rounded';
        const question = document.createElement('div');
        question.className = 'font-bold mb-2';
        question.textContent = pollContent.question;
        content.appendChild(question);

        pollContent.options.forEach((opt: string, idx: number) => {
            const optDiv = document.createElement('div');
            optDiv.className = 'flex items-center justify-between mb-1 p-1 hover:bg-blue-100 rounded cursor-pointer';

            const label = document.createElement('span');
            label.textContent = opt;

            // Calculate votes
            const votes = msg.poll?.votes?.[idx] || [];
            const count = document.createElement('span');
            count.className = 'text-xs font-bold';
            count.textContent = `${votes.length} votes`;

            optDiv.onclick = () => votePoll(msg, idx);

            optDiv.appendChild(label);
            optDiv.appendChild(count);
            content.appendChild(optDiv);
        });
    } else {
        content.textContent = `[${msg.type} message]`;
    }

    div.appendChild(meta);
    div.appendChild(content);

    // Thread/Reply Button
    const actions = document.createElement('div');
    actions.className = 'message-actions';

    const replyBtn = document.createElement('button');
    replyBtn.textContent = 'Reply';
    replyBtn.className = 'text-xs text-blue-500 hover:underline ml-2';
    replyBtn.onclick = () => initiateThread(msg);
    actions.appendChild(replyBtn);

    div.appendChild(actions);

    // Render thread indicator if it's a thread message
    if (msg.type === 'thread') {
        const threadMeta = document.createElement('div');
        threadMeta.className = 'text-xs text-gray-500 italic mt-1';
        threadMeta.textContent = `Replying to message...`; // Ideally fetch parent
        div.appendChild(threadMeta);
    }

    // Reaction Buttons
    const reactionsDiv = document.createElement('div');
    reactionsDiv.className = 'flex gap-2 mt-1';

    ['👍', '❤️', '😂'].forEach(emoji => {
        const btn = document.createElement('button');
        btn.textContent = emoji;
        btn.className = 'text-xs hover:bg-gray-200 rounded px-1';
        btn.onclick = () => toggleReaction(msg, emoji);
        reactionsDiv.appendChild(btn);
    });

    // Display existing reactions
    if (msg.reactions) {
        Object.entries(msg.reactions).forEach(([emoji, users]) => {
            if ((users as string[]).length > 0) {
                const count = document.createElement('span');
                count.className = 'text-xs bg-gray-100 rounded px-1 ml-1';
                count.textContent = `${emoji} ${(users as string[]).length}`;
                reactionsDiv.appendChild(count);
            }
        });
    }

    div.appendChild(reactionsDiv);

    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Reaction Logic
async function toggleReaction(msg: any, emoji: string) {
    if (!currentUser || !currentRoomId) return;

    try {
        // Simple toggle logic: if user already reacted, remove; else add
        // For MVP, let's just add. Remove logic requires checking if user is in the list.
        const users = msg.reactions?.[emoji] || [];
        const hasReacted = users.includes(currentUser.pub);

        if (hasReacted) {
            await messageService.removeReaction({
                roomId: currentRoomId,
                messageId: msg.id,
                emoji,
                userId: currentUser.pub
            });
        } else {
            await messageService.addReaction({
                roomId: currentRoomId,
                messageId: msg.id,
                emoji,
                userId: currentUser.pub
            });
        }
        // Refresh messages to show update
        loadMessages();
    } catch (err) {
        console.error('Failed to toggle reaction', err);
    }
}

// Poll Logic
async function votePoll(msg: any, optionIndex: number) {
    if (!currentUser || !currentRoomId) return;

    try {
        await messageService.votePoll({
            roomId: currentRoomId,
            messageId: msg.id,
            optionIndex,
            userId: currentUser.pub
        });
        loadMessages();
    } catch (err) {
        console.error('Failed to vote', err);
    }
}

// Thread Logic
// replyingToMessageId and replyIndicator moved to top state/DOM section



function initiateThread(msg: any) {
    replyingToMessageId = msg.id;
    replyIndicator.textContent = `Replying to: ${msg.content.body || 'Media'}`;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '✕';
    cancelBtn.className = 'ml-2 text-red-500 font-bold';
    cancelBtn.onclick = cancelThread;

    replyIndicator.appendChild(cancelBtn);
    replyIndicator.classList.remove('hidden');
    messageInput.focus();
}

function cancelThread() {
    replyingToMessageId = null;
    replyIndicator.classList.add('hidden');
    replyIndicator.innerHTML = '';
}

// Image Upload Logic
const imageInput = document.getElementById('image-input') as HTMLInputElement;

imageInput.addEventListener('change', async (e) => {
    const file = imageInput.files?.[0];
    if (!file || !currentRoomId) return;

    // Convert to Base64 (simple implementation for MVP)
    const reader = new FileReader();
    reader.onload = async () => {
        const base64 = reader.result as string;

        if (!currentRoomId) {
            console.error('No room selected');
            return;
        }

        try {
            console.log('Sending image...');
            await messageService.sendMediaMessage({
                roomId: currentRoomId,
                url: base64, // In a real app, upload to storage and send URL
                mimeType: file.type || 'application/octet-stream',
                size: file.size
            }, currentUser.pub);
            console.log('Image sent');
            loadMessages();
        } catch (err) {
            console.error('Failed to send image', err);
        }
    };
    reader.readAsDataURL(file);

    // Reset input
    imageInput.value = '';
});

// Initial check
console.log('Gun SDK UI Test Loaded');

// Restore session
async function init() {
    try {
        console.log('Attempting to restore session...');
        const user = await userService.restoreSession();
        if (user) {
            console.log('Session restored for:', user.alias);
            currentUser = user;
            onLoginSuccess();
        } else {
            console.log('No session found, showing login');
        }
    } catch (err) {
        console.error('Error restoring session:', err);
    }
}

init();
