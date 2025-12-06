import { GunService, UserService, RoomService, MessageService, PermissionService } from '../../src';
import { CreateUserDTO, AuthenticateUserDTO, RoomType } from '../../src/types';

// Initialize Services
// Configure peers - using the public one provided by user
const gunService = GunService.getInstance(['https://gunjs-chat.squareweb.app/gun']);

const userService = new UserService(gunService);
const roomService = new RoomService(gunService);
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
    console.log('Message text:', text, 'Current Room:', currentRoomId);

    if (!text || !currentRoomId) {
        console.warn('Missing text or room ID');
        return;
    }

    try {
        console.log('Calling messageService.sendMessage...');
        await messageService.sendMessage({
            roomId: currentRoomId,
            body: text
        }, currentUser.pub);
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
    } else {
        content.textContent = `[${msg.type} message]`;
    }

    div.appendChild(meta);
    div.appendChild(content);
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Initial check
console.log('Gun SDK UI Test Loaded');
