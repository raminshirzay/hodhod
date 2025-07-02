import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cron from 'node-cron';
import { Database } from './database.js';
import { authRouter } from './routes/auth.js';
import { messageRouter } from './routes/messages.js';
import { aiRouter } from './routes/ai.js';
import { adminRouter } from './routes/admin.js';
import { editorRouter } from './routes/editor.js';
import { memoryRouter } from './routes/memory.js';
import { groupRouter } from './routes/group.js';
import { worldBrainRouter } from './routes/worldBrain.js';
import { futureMessagesRouter } from './routes/futureMessages.js';
import { callRouter } from './routes/calls.js';
import { paymentRouter } from './routes/payments.js';
import { twinRouter } from './routes/twin.js';
import { agiRouter } from './routes/agi.js';
import { SocketManager } from './socketManager.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Create uploads directory
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

// Initialize database
const db = new Database();

// Initialize database and start server
async function startServer() {
  try {
    console.log('🔄 Starting Hodhod Messenger server...');
    console.log('🔄 Initializing database...');
    
    await db.init();
    console.log('✅ Database initialized successfully');

    // Initialize socket manager
    const socketManager = new SocketManager(io, db);
    console.log('✅ Socket manager initialized');

    // Routes
    app.use('/api/auth', authRouter(db));
    app.use('/api/messages', messageRouter(db, io));
    app.use('/api/ai', aiRouter(db));
    app.use('/api/admin', adminRouter(db, io));
    app.use('/api/editor', editorRouter(db));
    app.use('/api/memory', memoryRouter(db));
    app.use('/api/group', groupRouter(db));
    app.use('/api/worldbrain', worldBrainRouter(db));
    app.use('/api/future', futureMessagesRouter(db, io));
    app.use('/api/calls', callRouter(db, io));
    app.use('/api/payments', paymentRouter(db));
    app.use('/api/twin', twinRouter(db));
    app.use('/api/agi', agiRouter(db));

    console.log('✅ Routes initialized');

    // Health check
    app.get('/api/health', (req, res) => {
      console.log('Health check requested');
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        message: 'Hodhod Messenger API is running'
      });
    });

    // Test route
    app.get('/api/test', (req, res) => {
      console.log('Test route accessed');
      res.json({ message: 'Server is working!' });
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error('Server error:', err);
      res.status(500).json({ 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
      });
    });

    // 404 handler
    app.use('*', (req, res) => {
      console.log('404 - Route not found:', req.originalUrl);
      res.status(404).json({ message: 'Route not found' });
    });

    // Cron job for future messages
    cron.schedule('* * * * *', async () => {
      try {
        const dueMessages = await db.getDueMessages();
        for (const message of dueMessages) {
          // Send the message
          const newMessage = await db.createMessage({
            chatId: message.chatId,
            senderId: message.senderId,
            content: message.content,
            type: 'future',
            metadata: { originalScheduledTime: message.scheduledFor }
          });
          
          // Mark as sent
          await db.markFutureMessageSent(message.id);
          
          // Get sender info
          const sender = await db.getUserById(message.senderId);
          
          // Notify via socket
          io.to(`chat_${message.chatId}`).emit('new_message', {
            id: newMessage.lastID,
            chatId: message.chatId,
            senderId: message.senderId,
            username: sender?.username || 'Unknown',
            userAvatar: sender?.avatar,
            content: message.content,
            type: 'future',
            timestamp: new Date().toISOString(),
            metadata: { originalScheduledTime: message.scheduledFor }
          });
        }
      } catch (error) {
        console.error('Error processing future messages:', error);
      }
    });

    const PORT = process.env.PORT || 3001;
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Hodhod Messenger server running on port ${PORT}`);
      console.log(`📊 Admin panel: http://localhost:${PORT}/admin`);
      console.log(`🧠 World Brain: http://localhost:${PORT}/worldbrain`);
      console.log(`🤖 AGI Companion: http://localhost:${PORT}/agi`);
      console.log(`🔗 API Health: http://localhost:${PORT}/api/health`);
      console.log(`🔗 API Test: http://localhost:${PORT}/api/test`);
      console.log('✅ Server is ready to accept connections');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Error details:', error.stack);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();