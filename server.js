const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// The frontend lives beside server.js.
app.use(express.static(__dirname));

const servers = new Map();
const userSockets = new Map();
const DEFAULT_SERVER = 'general';
const ADMIN_PASSWORD = process.env.NOVAGRAM_ADMIN_PASSWORD;

servers.set(DEFAULT_SERVER, {
    name: 'General Chat',
    users: new Map(),
    password: null
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.emit('serversList', getServersList());

    socket.on('createServer', (data = {}) => {
        const serverName = String(data.serverName || '').trim().slice(0, 30);
        const password = String(data.password || '').slice(0, 100);
        if (!serverName) {
            socket.emit('joinError', 'Enter a room name first');
            return;
        }

        const serverId = generateServerId();
        servers.set(serverId, {
            name: serverName,
            users: new Map(),
            password: password || null
        });

        io.emit('serversList', getServersList());
        socket.emit('serverCreated', { serverId, serverName });
        console.log(`Room "${serverName}" created (${serverId})`);
    });

    socket.on('joinServer', (data = {}) => {
        const serverId = String(data.serverId || '');
        const username = String(data.username || '').trim().slice(0, 20);
        const password = String(data.password || '');

        if (username.length < 2) {
            socket.emit('joinError', 'Username must be at least 2 characters');
            return;
        }
        if (!servers.has(serverId)) {
            socket.emit('joinError', 'Room not found');
            return;
        }

        const room = servers.get(serverId);
        if (room.password && room.password !== password) {
            socket.emit('joinError', 'Incorrect password');
            return;
        }

        leaveCurrentServer(socket.id);
        room.users.set(socket.id, username);
        userSockets.set(socket.id, { username, serverId });
        socket.join(serverId);
        socket.to(serverId).emit('userJoined', username);
        socket.emit('serverJoined', {
            serverId,
            serverName: room.name,
            userList: Array.from(room.users.values())
        });
        io.to(serverId).emit('userList', Array.from(room.users.values()));
        console.log(`${username} joined "${room.name}"`);
    });

    socket.on('leaveServer', () => {
        leaveCurrentServer(socket.id);
        socket.emit('serverLeft');
    });

    socket.on('resetAllServers', (password) => {
        if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
            socket.emit('adminError', 'Admin actions are disabled or the password is wrong');
            return;
        }
        resetAllServers();
        socket.emit('adminSuccess', 'All rooms have been reset');
    });

    socket.on('endChatForAll', (password) => {
        if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
            socket.emit('adminError', 'Admin actions are disabled or the password is wrong');
            return;
        }
        endChatForAllUsers();
        socket.emit('adminSuccess', 'Everyone has been disconnected');
    });

    socket.on('join', (username) => {
        socket.emit('joinServer', {
            serverId: DEFAULT_SERVER,
            username,
            password: null
        });
    });

    socket.on('message', (data = {}) => {
        const userInfo = userSockets.get(socket.id);
        const message = String(data.message || '').trim().slice(0, 500);
        if (!userInfo || !message || !servers.has(userInfo.serverId)) return;

        io.to(userInfo.serverId).emit('message', {
            username: userInfo.username,
            message,
            timestamp: new Date().toLocaleTimeString()
        });
    });

    socket.on('typing', (isTyping) => {
        const userInfo = userSockets.get(socket.id);
        if (userInfo && servers.has(userInfo.serverId)) {
            socket.to(userInfo.serverId).emit('typing', {
                username: userInfo.username,
                isTyping: Boolean(isTyping)
            });
        }
    });

    socket.on('disconnect', () => {
        leaveCurrentServer(socket.id);
        console.log('User disconnected:', socket.id);
    });
});

function generateServerId() {
    return Math.random().toString(36).slice(2, 15);
}

function getServersList() {
    return Array.from(servers, ([id, room]) => ({
        id,
        name: room.name,
        userCount: room.users.size,
        hasPassword: Boolean(room.password)
    }));
}

function leaveCurrentServer(socketId) {
    const userInfo = userSockets.get(socketId);
    if (!userInfo || !servers.has(userInfo.serverId)) return;

    const room = servers.get(userInfo.serverId);
    room.users.delete(socketId);
    userSockets.delete(socketId);

    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
        socket.leave(userInfo.serverId);
        socket.to(userInfo.serverId).emit('userLeft', userInfo.username);
        io.to(userInfo.serverId).emit('userList', Array.from(room.users.values()));
    }

    if (room.users.size === 0 && userInfo.serverId !== DEFAULT_SERVER) {
        servers.delete(userInfo.serverId);
        io.emit('serversList', getServersList());
    }
}

function resetAllServers() {
    for (const [socketId, userInfo] of userSockets) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
            socket.leave(userInfo.serverId);
            socket.emit('forceDisconnect', 'The rooms were reset by an admin');
        }
    }

    servers.clear();
    userSockets.clear();
    servers.set(DEFAULT_SERVER, {
        name: 'General Chat',
        users: new Map(),
        password: null
    });
    io.emit('serversList', getServersList());
    io.emit('systemMessage', 'Rooms were reset. You can join again.');
}

function endChatForAllUsers() {
    for (const [socketId] of userSockets) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) socket.emit('forceDisconnect', 'The chat was ended by an admin');
    }

    for (const [serverId, room] of servers) {
        room.users.clear();
        io.to(serverId).emit('userList', []);
    }
    userSockets.clear();
    io.emit('serversList', getServersList());
    io.emit('systemMessage', 'The chat session has ended.');
}

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Novagram is running on http://localhost:${PORT}`);
    console.log('Other devices on your network can use one of these addresses:');

    const os = require('os');
    for (const interfaces of Object.values(os.networkInterfaces())) {
        for (const address of interfaces || []) {
            if (address.family === 'IPv4' && !address.internal) {
                console.log(`  http://${address.address}:${PORT}`);
            }
        }
    }
});
