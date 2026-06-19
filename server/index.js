import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Chat Schema
const chatSchema = new mongoose.Schema({
    title: String,
    messages: Array,
    updatedAt: { type: Date, default: Date.now }
});

const Chat = mongoose.model('Chat', chatSchema);

// Room Schema
const roomSchema = new mongoose.Schema({
    roomId: { type: String, required: true, unique: true },
    adminId: String, // ID to identify the creator
    createdAt: { type: Date, default: Date.now }
});

const Room = mongoose.model('Room', roomSchema);

// API Endpoints for Chat History
app.get('/api/chats', async (req, res) => {
    try {
        const chats = await Chat.find().sort({ updatedAt: -1 });
        res.json(chats);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
});

app.post('/api/chats', async (req, res) => {
    const { id, title, messages } = req.body;
    try {
        if (id) {
            const updatedChat = await Chat.findByIdAndUpdate(
                id, 
                { title, messages, updatedAt: Date.now() }, 
                { new: true }
            );
            return res.json(updatedChat);
        } else {
            const newChat = new Chat({ title, messages });
            const savedChat = await newChat.save();
            return res.json(savedChat);
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to save chat' });
    }
});

app.delete('/api/chats/:id', async (req, res) => {
    try {
        await Chat.findByIdAndDelete(req.params.id);
        res.json({ message: 'Chat deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete chat' });
    }
});

// API Endpoints for Rooms
app.post('/api/rooms', async (req, res) => {
    const { roomId, adminId } = req.body;
    try {
        const newRoom = new Room({ roomId, adminId });
        await newRoom.save();
        res.json({ message: 'Room created successfully', roomId });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create room' });
    }
});

app.get('/api/rooms/:id', async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.id });
        if (room) {
            res.json({ exists: true, adminId: room.adminId });
        } else {
            res.status(404).json({ exists: false, message: 'Invalid room code' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/rooms/:id', async (req, res) => {
    const { adminId } = req.body;
    try {
        const room = await Room.findOne({ roomId: req.params.id });
        if (!room) return res.status(404).json({ error: 'Room not found' });
        
        if (room.adminId !== adminId) {
            return res.status(403).json({ error: 'Only the creator can delete this room' });
        }

        await Room.deleteOne({ roomId: req.params.id });
        
        // Notify all clients in the room via socket
        io.to(req.params.id).emit('room-deleted', { message: 'The room has been deleted by the admin' });
        
        res.json({ message: 'Room deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete room' });
    }
});



app.get('/api/rooms/my-rooms/:adminId', async (req, res) => {
    try {
        const rooms = await Room.find({ adminId: req.params.adminId }).sort({ createdAt: -1 });
        res.json(rooms);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch your rooms' });
    }
});

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Default Vite port
        methods: ["GET", "POST"]
    }
});

const userSocketMap = {};

function getAllConnectedUsers(roomId) {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => {
        return {
            socketId,
            username: userSocketMap[socketId],
        };
    });
}

io.on('connection', (socket) => {
    console.log('Socket connected', socket.id);

    socket.on('join', async ({ roomId, username }) => {
        // Verify room existence in MongoDB before joining
        const room = await Room.findOne({ roomId });
        if (!room) {
            socket.emit('error', { message: 'Invalid room code' });
            return;
        }

        userSocketMap[socket.id] = username;
        socket.join(roomId);
        const clients = getAllConnectedUsers(roomId);
        
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit('joined', {
                clients,
                username,
                socketId: socket.id,
            });
        });
    });


    socket.on('code-change', ({ roomId, code, type }) => {
        socket.in(roomId).emit('code-change', { code, type });
    });

    socket.on('sync-code', ({ socketId, code, type }) => {
        io.to(socketId).emit('code-change', { code, type });
    });

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit('disconnected', {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
