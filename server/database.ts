import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

export class Database {
  private db: sqlite3.Database;
  private dbPath: string;

  constructor() {
    // Create data directory if it doesn't exist
    const dataDir = './data';
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('✅ Created data directory:', dataDir);
    }

    this.dbPath = path.join(dataDir, 'database.sqlite');
    console.log('📁 Database path:', this.dbPath);
    
    // Enable verbose mode for debugging
    sqlite3.verbose();
    
    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        console.error('❌ Error opening database:', err);
        throw err;
      } else {
        console.log('✅ Connected to SQLite database at:', this.dbPath);
      }
    });

    // Enable foreign keys
    this.db.run('PRAGMA foreign_keys = ON');
    this.db.run('PRAGMA journal_mode = WAL');
  }

  async init() {
    const run = promisify(this.db.run.bind(this.db));
    
    try {
      console.log('🔄 Creating database tables...');
      
      // Users table
      await run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          passwordHash TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          avatar TEXT,
          isOnline INTEGER DEFAULT 0,
          lastSeen DATETIME DEFAULT CURRENT_TIMESTAMP,
          twinEnabled INTEGER DEFAULT 0,
          twinPersonality TEXT,
          premiumUntil DATETIME,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Users table created/verified');

      // Chats table
      await run(`
        CREATE TABLE IF NOT EXISTS chats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          description TEXT,
          isGroup INTEGER DEFAULT 0,
          avatar TEXT,
          isPremium INTEGER DEFAULT 0,
          createdBy INTEGER,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (createdBy) REFERENCES users(id)
        )
      `);
      console.log('✅ Chats table created/verified');

      // Chat participants
      await run(`
        CREATE TABLE IF NOT EXISTS chat_participants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chatId INTEGER,
          userId INTEGER,
          role TEXT DEFAULT 'member',
          joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chatId) REFERENCES chats(id),
          FOREIGN KEY (userId) REFERENCES users(id),
          UNIQUE(chatId, userId)
        )
      `);
      console.log('✅ Chat participants table created/verified');

      // Messages table
      await run(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chatId INTEGER,
          senderId INTEGER,
          content TEXT NOT NULL,
          type TEXT DEFAULT 'text',
          fileUrl TEXT,
          fileName TEXT,
          fileSize INTEGER,
          replyToId INTEGER,
          isPremium INTEGER DEFAULT 0,
          animationType TEXT,
          metadata TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chatId) REFERENCES chats(id),
          FOREIGN KEY (senderId) REFERENCES users(id),
          FOREIGN KEY (replyToId) REFERENCES messages(id)
        )
      `);
      console.log('✅ Messages table created/verified');

      // Calls table
      await run(`
        CREATE TABLE IF NOT EXISTS calls (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chatId INTEGER,
          initiatorId INTEGER,
          participants TEXT,
          status TEXT DEFAULT 'pending',
          startedAt DATETIME,
          endedAt DATETIME,
          duration INTEGER,
          type TEXT DEFAULT 'voice',
          FOREIGN KEY (chatId) REFERENCES chats(id),
          FOREIGN KEY (initiatorId) REFERENCES users(id)
        )
      `);
      console.log('✅ Calls table created/verified');

      // Embeddings table for memory
      await run(`
        CREATE TABLE IF NOT EXISTS embeddings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          messageId INTEGER,
          userId INTEGER,
          content TEXT,
          embedding TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (messageId) REFERENCES messages(id),
          FOREIGN KEY (userId) REFERENCES users(id)
        )
      `);
      console.log('✅ Embeddings table created/verified');

      // Future messages table
      await run(`
        CREATE TABLE IF NOT EXISTS future_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chatId INTEGER,
          senderId INTEGER,
          content TEXT NOT NULL,
          scheduledFor DATETIME NOT NULL,
          sent INTEGER DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chatId) REFERENCES chats(id),
          FOREIGN KEY (senderId) REFERENCES users(id)
        )
      `);
      console.log('✅ Future messages table created/verified');

      // World brain questions
      await run(`
        CREATE TABLE IF NOT EXISTS world_brain_questions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          question TEXT NOT NULL,
          askedBy INTEGER,
          status TEXT DEFAULT 'open',
          finalAnswer TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (askedBy) REFERENCES users(id)
        )
      `);
      console.log('✅ World brain questions table created/verified');

      // World brain answers
      await run(`
        CREATE TABLE IF NOT EXISTS world_brain_answers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          questionId INTEGER,
          userId INTEGER,
          answer TEXT NOT NULL,
          votes INTEGER DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (questionId) REFERENCES world_brain_questions(id),
          FOREIGN KEY (userId) REFERENCES users(id)
        )
      `);
      console.log('✅ World brain answers table created/verified');

      // System settings
      await run(`
        CREATE TABLE IF NOT EXISTS system_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL,
          value TEXT,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ System settings table created/verified');

      // Digital twin sessions
      await run(`
        CREATE TABLE IF NOT EXISTS twin_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          sessionData TEXT,
          lastActive DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id)
        )
      `);
      console.log('✅ Twin sessions table created/verified');

      // AGI companion conversations
      await run(`
        CREATE TABLE IF NOT EXISTS agi_conversations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          message TEXT NOT NULL,
          response TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id)
        )
      `);
      console.log('✅ AGI conversations table created/verified');

      // Payment transactions
      await run(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          amount DECIMAL(10,2),
          currency TEXT DEFAULT 'USD',
          status TEXT DEFAULT 'pending',
          stripePaymentId TEXT,
          description TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id)
        )
      `);
      console.log('✅ Transactions table created/verified');

      // Create admin user with proper password hash
      console.log('🔄 Creating admin user...');
      const adminPasswordHash = await bcrypt.hash('admin123', 10);
      await run(`
        INSERT OR IGNORE INTO users (username, email, passwordHash, role)
        VALUES ('admin', 'admin@hodhod.com', ?, 'admin')
      `, [adminPasswordHash]);
      console.log('✅ Admin user created/verified');

      // Insert AI user for responses
      await run(`
        INSERT OR IGNORE INTO users (id, username, email, passwordHash, role, avatar)
        VALUES (999, 'HodhodAI', 'ai@hodhod.com', 'no-password', 'ai', 'https://ui-avatars.com/api/?name=AI&background=F3C883&color=1F3934')
      `);
      console.log('✅ AI user created/verified');

      // Insert default settings
      await run(`
        INSERT OR IGNORE INTO system_settings (key, value)
        VALUES 
          ('ai_enabled', 'true'),
          ('openrouter_api_key', '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'),
          ('stripe_enabled', 'false'),
          ('max_file_size', '10485760'),
          ('twin_enabled', 'true'),
          ('world_brain_enabled', 'true')
      `);
      console.log('✅ Default settings created/verified');

      // Verify database integrity
      const userCount = await this.getUserCount();
      console.log(`✅ Database initialized successfully with ${userCount} users`);
      
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  async getUserCount() {
    const get = promisify(this.db.get.bind(this.db));
    const result = await get('SELECT COUNT(*) as count FROM users');
    return result.count;
  }

  // User methods with enhanced error handling
  async createUser(userData: any) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      console.log('🔄 Creating user:', userData.username);
      const result = await run(
        'INSERT INTO users (username, email, passwordHash, avatar) VALUES (?, ?, ?, ?)',
        [userData.username, userData.email, userData.passwordHash, userData.avatar ?? null]
      );
      console.log('✅ User created with ID:', result.lastID);
      return result;
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string) {
    const get = promisify(this.db.get.bind(this.db));
    try {
      console.log('🔍 Looking up user by email:', email);
      const user = await get('SELECT * FROM users WHERE email = ?', [email]);
      console.log('✅ User lookup result:', user ? 'Found' : 'Not found');
      return user;
    } catch (error) {
      console.error('❌ Error getting user by email:', error);
      throw error;
    }
  }

  async getUserById(id: number) {
    const get = promisify(this.db.get.bind(this.db));
    try {
      const user = await get('SELECT * FROM users WHERE id = ?', [id]);
      return user;
    } catch (error) {
      console.error('❌ Error getting user by ID:', error);
      throw error;
    }
  }

  async updateUserStatus(userId: number, isOnline: boolean) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(
        'UPDATE users SET isOnline = ?, lastSeen = CURRENT_TIMESTAMP WHERE id = ?',
        [isOnline ? 1 : 0, userId]
      );
    } catch (error) {
      console.error('❌ Error updating user status:', error);
      throw error;
    }
  }

  async updateUserTwin(userId: number, twinEnabled: boolean, twinPersonality?: string) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(
        'UPDATE users SET twinEnabled = ?, twinPersonality = ? WHERE id = ?',
        [twinEnabled ? 1 : 0, twinPersonality ?? null, userId]
      );
    } catch (error) {
      console.error('❌ Error updating user twin:', error);
      throw error;
    }
  }

  // Chat methods
  async createChat(chatData: any) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      const result = await run(
        'INSERT INTO chats (name, description, isGroup, avatar, isPremium, createdBy) VALUES (?, ?, ?, ?, ?, ?)',
        [
          chatData.name ?? null, 
          chatData.description ?? null, 
          chatData.isGroup ? 1 : 0, 
          chatData.avatar ?? null, 
          chatData.isPremium ? 1 : 0, 
          chatData.createdBy
        ]
      );
      return result;
    } catch (error) {
      console.error('❌ Error creating chat:', error);
      throw error;
    }
  }

  async getUserChats(userId: number) {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(`
        SELECT c.*, cp.role as userRole,
          (SELECT COUNT(*) FROM messages m WHERE m.chatId = c.id) as messageCount,
          (SELECT m.content FROM messages m WHERE m.chatId = c.id ORDER BY m.timestamp DESC LIMIT 1) as lastMessage,
          (SELECT m.timestamp FROM messages m WHERE m.chatId = c.id ORDER BY m.timestamp DESC LIMIT 1) as lastMessageTime
        FROM chats c
        JOIN chat_participants cp ON c.id = cp.chatId
        WHERE cp.userId = ?
        ORDER BY lastMessageTime DESC
      `, [userId]);
    } catch (error) {
      console.error('❌ Error getting user chats:', error);
      throw error;
    }
  }

  async addChatParticipant(chatId: number, userId: number, role: string = 'member') {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(
        'INSERT OR IGNORE INTO chat_participants (chatId, userId, role) VALUES (?, ?, ?)',
        [chatId, userId, role]
      );
    } catch (error) {
      console.error('❌ Error adding chat participant:', error);
      throw error;
    }
  }

  // Message methods
  async createMessage(messageData: any) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      const result = await run(
        'INSERT INTO messages (chatId, senderId, content, type, fileUrl, fileName, fileSize, replyToId, isPremium, animationType, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          messageData.chatId,
          messageData.senderId,
          messageData.content,
          messageData.type ?? 'text',
          messageData.fileUrl ?? null,
          messageData.fileName ?? null,
          messageData.fileSize ?? null,
          messageData.replyToId ?? null,
          messageData.isPremium ? 1 : 0,
          messageData.animationType ?? null,
          JSON.stringify(messageData.metadata ?? {})
        ]
      );
      return result;
    } catch (error) {
      console.error('❌ Error creating message:', error);
      throw error;
    }
  }

  async getChatMessages(chatId: number, limit: number = 50, offset: number = 0) {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(`
        SELECT m.*, u.username, u.avatar as userAvatar
        FROM messages m
        JOIN users u ON m.senderId = u.id
        WHERE m.chatId = ?
        ORDER BY m.timestamp DESC
        LIMIT ? OFFSET ?
      `, [chatId, limit, offset]);
    } catch (error) {
      console.error('❌ Error getting chat messages:', error);
      throw error;
    }
  }

  // Call methods
  async createCall(callData: any) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      const result = await run(
        'INSERT INTO calls (chatId, initiatorId, participants, type, status, startedAt) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [callData.chatId, callData.initiatorId, JSON.stringify(callData.participants ?? []), callData.type ?? 'voice', 'active']
      );
      return result;
    } catch (error) {
      console.error('❌ Error creating call:', error);
      throw error;
    }
  }

  async endCall(callId: number, duration: number) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(
        'UPDATE calls SET status = ?, endedAt = CURRENT_TIMESTAMP, duration = ? WHERE id = ?',
        ['ended', duration, callId]
      );
    } catch (error) {
      console.error('❌ Error ending call:', error);
      throw error;
    }
  }

  // Future messages
  async createFutureMessage(messageData: any) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(
        'INSERT INTO future_messages (chatId, senderId, content, scheduledFor) VALUES (?, ?, ?, ?)',
        [messageData.chatId, messageData.senderId, messageData.content, messageData.scheduledFor]
      );
    } catch (error) {
      console.error('❌ Error creating future message:', error);
      throw error;
    }
  }

  async getDueMessages() {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(
        'SELECT * FROM future_messages WHERE scheduledFor <= datetime("now") AND sent = 0'
      );
    } catch (error) {
      console.error('❌ Error getting due messages:', error);
      throw error;
    }
  }

  async markFutureMessageSent(id: number) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run('UPDATE future_messages SET sent = 1 WHERE id = ?', [id]);
    } catch (error) {
      console.error('❌ Error marking future message sent:', error);
      throw error;
    }
  }

  // AGI Companion
  async saveAGIConversation(userId: number, message: string, response: string) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(
        'INSERT INTO agi_conversations (userId, message, response) VALUES (?, ?, ?)',
        [userId, message, response]
      );
    } catch (error) {
      console.error('❌ Error saving AGI conversation:', error);
      throw error;
    }
  }

  async getAGIHistory(userId: number, limit: number = 10) {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(
        'SELECT * FROM agi_conversations WHERE userId = ? ORDER BY timestamp DESC LIMIT ?',
        [userId, limit]
      );
    } catch (error) {
      console.error('❌ Error getting AGI history:', error);
      throw error;
    }
  }

  // Settings
  async getSetting(key: string) {
    const get = promisify(this.db.get.bind(this.db));
    try {
      const result = await get('SELECT value FROM system_settings WHERE key = ?', [key]);
      return result?.value;
    } catch (error) {
      console.error('❌ Error getting setting:', error);
      throw error;
    }
  }

  async setSetting(key: string, value: string) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(
        'INSERT OR REPLACE INTO system_settings (key, value, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [key, value]
      );
    } catch (error) {
      console.error('❌ Error setting setting:', error);
      throw error;
    }
  }

  // World Brain methods
  async createWorldBrainQuestion(question: string, askedBy: number) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      const result = await run(
        'INSERT INTO world_brain_questions (question, askedBy) VALUES (?, ?)',
        [question, askedBy]
      );
      return result;
    } catch (error) {
      console.error('❌ Error creating world brain question:', error);
      throw error;
    }
  }

  async getWorldBrainQuestions() {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(`
        SELECT q.*, u.username as askedByUsername,
          (SELECT COUNT(*) FROM world_brain_answers a WHERE a.questionId = q.id) as answerCount
        FROM world_brain_questions q
        JOIN users u ON q.askedBy = u.id
        ORDER BY q.createdAt DESC
      `);
    } catch (error) {
      console.error('❌ Error getting world brain questions:', error);
      throw error;
    }
  }

  async addWorldBrainAnswer(questionId: number, userId: number, answer: string) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(
        'INSERT INTO world_brain_answers (questionId, userId, answer) VALUES (?, ?, ?)',
        [questionId, userId, answer]
      );
    } catch (error) {
      console.error('❌ Error adding world brain answer:', error);
      throw error;
    }
  }

  async getQuestionAnswers(questionId: number) {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(`
        SELECT a.*, u.username
        FROM world_brain_answers a
        JOIN users u ON a.userId = u.id
        WHERE a.questionId = ?
        ORDER BY a.votes DESC, a.createdAt DESC
      `, [questionId]);
    } catch (error) {
      console.error('❌ Error getting question answers:', error);
      throw error;
    }
  }

  async voteAnswer(answerId: number, vote: number) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run('UPDATE world_brain_answers SET votes = votes + ? WHERE id = ?', [vote, answerId]);
    } catch (error) {
      console.error('❌ Error voting answer:', error);
      throw error;
    }
  }

  // Memory methods
  async searchMemory(userId: number, query: string) {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(`
        SELECT m.*, u.username
        FROM messages m
        JOIN users u ON m.senderId = u.id
        JOIN chat_participants cp ON m.chatId = cp.chatId
        WHERE cp.userId = ? AND m.content LIKE ?
        ORDER BY m.timestamp DESC
        LIMIT 10
      `, [userId, `%${query}%`]);
    } catch (error) {
      console.error('❌ Error searching memory:', error);
      throw error;
    }
  }

  async getAllUsers() {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all('SELECT id, username, email, role, isOnline, lastSeen, createdAt FROM users ORDER BY createdAt DESC');
    } catch (error) {
      console.error('❌ Error getting all users:', error);
      throw error;
    }
  }

  async deleteUser(userId: number) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run('DELETE FROM users WHERE id = ?', [userId]);
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      throw error;
    }
  }

  async updateUserRole(userId: number, role: string) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
    } catch (error) {
      console.error('❌ Error updating user role:', error);
      throw error;
    }
  }

  async getSystemStats() {
    const get = promisify(this.db.get.bind(this.db));
    try {
      const userCount = await get('SELECT COUNT(*) as count FROM users');
      const messageCount = await get('SELECT COUNT(*) as count FROM messages');
      const chatCount = await get('SELECT COUNT(*) as count FROM chats');
      const onlineUsers = await get('SELECT COUNT(*) as count FROM users WHERE isOnline = 1');
      
      return {
        users: userCount.count,
        messages: messageCount.count,
        chats: chatCount.count,
        onlineUsers: onlineUsers.count
      };
    } catch (error) {
      console.error('❌ Error getting system stats:', error);
      throw error;
    }
  }

  // Transaction methods
  async createTransaction(transactionData: any) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      const result = await run(
        'INSERT INTO transactions (userId, amount, currency, status, stripePaymentId, description) VALUES (?, ?, ?, ?, ?, ?)',
        [transactionData.userId, transactionData.amount, transactionData.currency ?? 'USD', transactionData.status ?? 'pending', transactionData.stripePaymentId ?? null, transactionData.description ?? null]
      );
      return result;
    } catch (error) {
      console.error('❌ Error creating transaction:', error);
      throw error;
    }
  }

  async updateTransaction(transactionId: number, status: string) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run('UPDATE transactions SET status = ? WHERE id = ?', [status, transactionId]);
    } catch (error) {
      console.error('❌ Error updating transaction:', error);
      throw error;
    }
  }
}