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
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Enhanced CORS configuration for Bolt.new
app.use(cors({
  origin: "*",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 200
}));

// Enhanced middleware with better error handling
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      console.error('Invalid JSON received:', e.message);
      res.status(400).json({ error: 'Invalid JSON' });
      return;
    }
  }
}));

app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create necessary directories
const uploadsDir = './uploads';
const dbDir = './data';

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory');
}

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('✅ Created data directory');
}

app.use('/uploads', express.static(uploadsDir));

// Initialize database with proper error handling
let db;
let socketManager;

// Enhanced startup function with better error handling
async function startServer() {
  try {
    console.log('🔄 Starting Hodhod Messenger server...');
    console.log('🔄 Node.js version:', process.version);
    console.log('🔄 Working directory:', process.cwd());
    
    // Initialize database
    console.log('🔄 Initializing database...');
    db = new Database();
    await db.init();
    console.log('✅ Database initialized successfully');

    // Test database connection
    try {
      const testUser = await db.getUserById(1);
      console.log('✅ Database connection test successful');
    } catch (dbError) {
      console.error('❌ Database connection test failed:', dbError);
      throw dbError;
    }

    // Initialize socket manager
    console.log('🔄 Initializing socket manager...');
    socketManager = new SocketManager(io, db);
    console.log('✅ Socket manager initialized');

    // Enhanced middleware for request logging
    app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
      if (req.body && Object.keys(req.body).length > 0) {
        console.log('Body:', JSON.stringify(req.body, null, 2));
      }
      next();
    });

    // Routes with enhanced error handling
    app.use('/api/auth', (req, res, next) => {
      console.log('Auth route accessed:', req.method, req.url);
      next();
    }, authRouter(db));

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

    // Enhanced health check
    app.get('/api/health', async (req, res) => {
      console.log('Health check requested');
      try {
        // Test database
        await db.getUserById(1);
        res.json({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          message: 'Hodhod Messenger API is running',
          database: 'connected',
          version: '1.0.0'
        });
      } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({
          status: 'error',
          timestamp: new Date().toISOString(),
          message: 'Database connection failed',
          error: error.message
        });
      }
    });

    // Test route with database check
    app.get('/api/test', async (req, res) => {
      console.log('Test route accessed');
      try {
        const stats = await db.getSystemStats();
        res.json({ 
          message: 'Server is working!',
          database: 'connected',
          stats
        });
      } catch (error) {
        console.error('Test route error:', error);
        res.status(500).json({
          message: 'Server error',
          error: error.message
        });
      }
    });

    // Enhanced error handling middleware
    app.use((err, req, res, next) => {
      console.error('=== SERVER ERROR ===');
      console.error('URL:', req.url);
      console.error('Method:', req.method);
      console.error('Headers:', req.headers);
      console.error('Body:', req.body);
      console.error('Error:', err);
      console.error('Stack:', err.stack);
      console.error('===================');
      
      res.status(500).json({ 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        timestamp: new Date().toISOString()
      });
    });

    // Enhanced 404 handler
    app.use('*', (req, res) => {
      console.log('404 - Route not found:', req.method, req.originalUrl);
      console.log('Available routes: /api/auth, /api/messages, /api/health, /api/test');
      res.status(404).json({ 
        message: 'Route not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    });

    // Cron job for future messages with error handling
    cron.schedule('* * * * *', async () => {
      try {
        const dueMessages = await db.getDueMessages();
        for (const message of dueMessages) {
          try {
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
          } catch (messageError) {
            console.error('Error processing individual future message:', messageError);
          }
        }
      } catch (error) {
        console.error('Error processing future messages:', error);
      }
    });

    const PORT = process.env.PORT || 3001;
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log('='.repeat(50));
      console.log(`🚀 Hodhod Messenger server running on port ${PORT}`);
      console.log(`📊 Admin panel: http://localhost:${PORT}/admin`);
      console.log(`🧠 World Brain: http://localhost:${PORT}/worldbrain`);
      console.log(`🤖 AGI Companion: http://localhost:${PORT}/agi`);
      console.log(`🔗 API Health: http://localhost:${PORT}/api/health`);
      console.log(`🔗 API Test: http://localhost:${PORT}/api/test`);
      console.log(`🔗 Auth Test: http://localhost:${PORT}/api/auth/test`);
      console.log('✅ Server is ready to accept connections');
      console.log('='.repeat(50));
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Error details:', error.stack);
    process.exit(1);
  }
}

// Enhanced error handlers
process.on('uncaughtException', (error) => {
  console.error('=== UNCAUGHT EXCEPTION ===');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  console.error('========================');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('=== UNHANDLED REJECTION ===');
  console.error('Promise:', promise);
  console.error('Reason:', reason);
  console.error('=========================');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

startServer();