import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

dotenv.config();

const app = express();
app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:5173",
    credentials: true
}));
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch((err) => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

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
    adminId: String, // Maps to User._id in secure authentication system
    createdAt: { type: Date, default: Date.now }
});

const Room = mongoose.model('Room', roomSchema);

// Authentication Middleware
const JWT_SECRET = process.env.JWT_SECRET || 'webdev_playground_fallback_secret_key_12345';

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'Access token required' });
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = user;
        next();
    });
}

// Authentication Endpoints
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        
        const token = jwt.sign({ userId: newUser._id, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ 
            message: 'User registered successfully', 
            token, 
            user: { id: newUser._id, username: newUser.username } 
        });
    } catch (err) {
        console.error("Registration error:", err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ 
            token, 
            user: { id: user._id, username: user.username } 
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Verification endpoint for current user session
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

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
app.post('/api/rooms', authenticateToken, async (req, res) => {
    const { roomId } = req.body;
    try {
        const newRoom = new Room({ roomId, adminId: req.user.userId });
        await newRoom.save();
        res.json({ message: 'Room created successfully', roomId });
    } catch (err) {
        console.error("Create room error:", err);
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

app.delete('/api/rooms/:id', authenticateToken, async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.id });
        if (!room) return res.status(404).json({ error: 'Room not found' });
        
        if (room.adminId !== req.user.userId) {
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

app.get('/api/rooms/my-rooms/:adminId', authenticateToken, async (req, res) => {
    if (req.user.userId !== req.params.adminId) {
        return res.status(403).json({ error: 'Unauthorized to view these rooms' });
    }
    try {
        const rooms = await Room.find({ adminId: req.params.adminId }).sort({ createdAt: -1 });
        res.json(rooms);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch your rooms' });
    }
});

// Express Gemini Streaming Chat Endpoint
app.post('/api/ai/chat', async (req, res) => {
    const { messages, html, css, js, userMsgText } = req.body;
    
    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    try {
        const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
        const modelName = process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || "gemini-2.5-flash-lite";
        
        if (!apiKey) {
            res.write(`data: ${JSON.stringify({ error: "Gemini API key is not configured on the server." })}\n\n`);
            res.end();
            return;
        }

        const chatModel = new ChatGoogleGenerativeAI({
            apiKey: apiKey,
            model: modelName,
            modelName: modelName,
            maxOutputTokens: 4096,
            temperature: 0.7,
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            ],
        });

        const systemInstruction = `You are a world-class senior developer helping the user in a live code playground.

OUTPUT RULES:
1. FOR WEBSITE/UI REQUESTS: You MUST provide ALL THREE BLOCKS: \`\`\`html, \`\`\`css, AND \`\`\`js.
2. FOR LOGIC/DSA QUESTIONS: Provide ONLY the JavaScript block (\`\`\`js\`).

GENERAL GUIDELINES:
- Always provide the full code within the block(s).
- Briefly explain your logic.
- Wrap code in triple backticks.`;

        const langchainMessages = [new SystemMessage(systemInstruction)];
        
        if (Array.isArray(messages)) {
            messages.slice(-5).forEach(m => {
                if (m.sender === 'user') langchainMessages.push(new HumanMessage(m.text));
                else if (m.sender === 'ai') langchainMessages.push(new AIMessage(m.text));
            });
        }

        const contextualPrompt = `CURRENT CODE IN EDITOR:
--- HTML ---
${html}
--- CSS ---
${css}
--- JS ---
${js}
USER REQUEST: ${userMsgText}
INSTRUCTION: Update the code. You MUST provide the updated HTML, CSS, and JS blocks.`;

        langchainMessages.push(new HumanMessage(contextualPrompt));

        const stream = await chatModel.stream(langchainMessages);

        for await (const chunk of stream) {
            if (chunk && chunk.content) {
                res.write(`data: ${JSON.stringify({ text: chunk.content })}\n\n`);
            }
        }
        res.end();
    } catch (error) {
        console.error("AI Assistant Server Error:", error);
        res.write(`data: ${JSON.stringify({ error: error.message || "An error occurred during generation." })}\n\n`);
        res.end();
    }
});

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.ALLOWED_ORIGIN || "http://localhost:5173",
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

