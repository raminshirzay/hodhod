import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

export class Database {
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

    // Enable foreign keys and WAL mode
    this.db.run('PRAGMA foreign_keys = ON');
    this.db.run('PRAGMA journal_mode = WAL');
  }

  async init() {
    const run = promisify(this.db.run.bind(this.db));
    
    try {
      console.log('🔄 Creating database schema...');
      
      // Users table with all required columns
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
          phoneNumber TEXT,
          bio TEXT,
          status TEXT DEFAULT 'available',
          theme TEXT DEFAULT 'light',
          language TEXT DEFAULT 'en',
          timezone TEXT DEFAULT 'UTC',
          emailVerified INTEGER DEFAULT 1,
          phoneVerified INTEGER DEFAULT 0,
          twoFactorEnabled INTEGER DEFAULT 0,
          notificationSettings TEXT DEFAULT '{}',
          privacySettings TEXT DEFAULT '{}',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Users table created');

      // Chats table
      await run(`
        CREATE TABLE IF NOT EXISTS chats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          description TEXT,
          isGroup INTEGER DEFAULT 0,
          avatar TEXT,
          isPremium INTEGER DEFAULT 0,
          wallpaper TEXT,
          encryptionKey TEXT,
          createdBy INTEGER,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (createdBy) REFERENCES users(id)
        )
      `);
      console.log('✅ Chats table created');

      // Chat participants
      await run(`
        CREATE TABLE IF NOT EXISTS chat_participants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chatId INTEGER,
          userId INTEGER,
          role TEXT DEFAULT 'member',
          permissions TEXT DEFAULT '{}',
          joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chatId) REFERENCES chats(id) ON DELETE CASCADE,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(chatId, userId)
        )
      `);
      console.log('✅ Chat participants table created');

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
          fileMimeType TEXT,
          replyToId INTEGER,
          forwardedFromId INTEGER,
          isPremium INTEGER DEFAULT 0,
          animationType TEXT,
          mentions TEXT DEFAULT '[]',
          hashtags TEXT DEFAULT '[]',
          location TEXT,
          expiresAt DATETIME,
          metadata TEXT DEFAULT '{}',
          isEdited INTEGER DEFAULT 0,
          editedAt DATETIME,
          isDeleted INTEGER DEFAULT 0,
          deletedAt DATETIME,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chatId) REFERENCES chats(id) ON DELETE CASCADE,
          FOREIGN KEY (senderId) REFERENCES users(id),
          FOREIGN KEY (replyToId) REFERENCES messages(id)
        )
      `);
      console.log('✅ Messages table created');

      // Message reactions
      await run(`
        CREATE TABLE IF NOT EXISTS message_reactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          messageId INTEGER,
          userId INTEGER,
          reaction TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (messageId) REFERENCES messages(id) ON DELETE CASCADE,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(messageId, userId, reaction)
        )
      `);
      console.log('✅ Message reactions table created');

      // User sessions
      await run(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          sessionToken TEXT UNIQUE NOT NULL,
          deviceInfo TEXT,
          ipAddress TEXT,
          userAgent TEXT,
          isActive INTEGER DEFAULT 1,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          expiresAt DATETIME,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ User sessions table created');

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
          quality TEXT,
          recordingUrl TEXT,
          FOREIGN KEY (chatId) REFERENCES chats(id),
          FOREIGN KEY (initiatorId) REFERENCES users(id)
        )
      `);
      console.log('✅ Calls table created');

      // Future messages table
      await run(`
        CREATE TABLE IF NOT EXISTS future_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chatId INTEGER,
          senderId INTEGER,
          content TEXT NOT NULL,
          scheduledFor DATETIME NOT NULL,
          repeatType TEXT,
          repeatInterval INTEGER,
          sent INTEGER DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chatId) REFERENCES chats(id) ON DELETE CASCADE,
          FOREIGN KEY (senderId) REFERENCES users(id)
        )
      `);
      console.log('✅ Future messages table created');

      // World brain questions
      await run(`
        CREATE TABLE IF NOT EXISTS world_brain_questions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          question TEXT NOT NULL,
          askedBy INTEGER,
          category TEXT,
          tags TEXT DEFAULT '[]',
          status TEXT DEFAULT 'open',
          finalAnswer TEXT,
          confidence REAL DEFAULT 0,
          views INTEGER DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (askedBy) REFERENCES users(id)
        )
      `);
      console.log('✅ World brain questions table created');

      // World brain answers
      await run(`
        CREATE TABLE IF NOT EXISTS world_brain_answers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          questionId INTEGER,
          userId INTEGER,
          answer TEXT NOT NULL,
          votes INTEGER DEFAULT 0,
          confidence REAL DEFAULT 0,
          isVerified INTEGER DEFAULT 0,
          verifiedBy INTEGER,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (questionId) REFERENCES world_brain_questions(id) ON DELETE CASCADE,
          FOREIGN KEY (userId) REFERENCES users(id),
          FOREIGN KEY (verifiedBy) REFERENCES users(id)
        )
      `);
      console.log('✅ World brain answers table created');

      // AGI conversations
      await run(`
        CREATE TABLE IF NOT EXISTS agi_conversations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          sessionId TEXT,
          message TEXT NOT NULL,
          response TEXT NOT NULL,
          context TEXT DEFAULT '{}',
          model TEXT,
          provider TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ AGI conversations table created');

      // Stories table
      await run(`
        CREATE TABLE IF NOT EXISTS stories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          content TEXT,
          mediaUrl TEXT,
          mediaType TEXT,
          backgroundColor TEXT,
          textColor TEXT,
          views INTEGER DEFAULT 0,
          expiresAt DATETIME,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ Stories table created');

      // Story views
      await run(`
        CREATE TABLE IF NOT EXISTS story_views (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          storyId INTEGER,
          viewerId INTEGER,
          viewedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (storyId) REFERENCES stories(id) ON DELETE CASCADE,
          FOREIGN KEY (viewerId) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(storyId, viewerId)
        )
      `);
      console.log('✅ Story views table created');

      // Contacts table
      await run(`
        CREATE TABLE IF NOT EXISTS contacts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          contactId INTEGER,
          displayName TEXT,
          relationship TEXT DEFAULT 'friend',
          isBlocked INTEGER DEFAULT 0,
          isFavorite INTEGER DEFAULT 0,
          addedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (contactId) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(userId, contactId)
        )
      `);
      console.log('✅ Contacts table created');

      // Notifications table
      await run(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          data TEXT DEFAULT '{}',
          isRead INTEGER DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ Notifications table created');

      // System settings
      await run(`
        CREATE TABLE IF NOT EXISTS system_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL,
          value TEXT,
          category TEXT DEFAULT 'general',
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ System settings table created');

      // Event logs for analytics
      await run(`
        CREATE TABLE IF NOT EXISTS event_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          eventType TEXT NOT NULL,
          eventData TEXT DEFAULT '{}',
          ipAddress TEXT,
          userAgent TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id)
        )
      `);
      console.log('✅ Event logs table created');

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
          metadata TEXT DEFAULT '{}',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id)
        )
      `);
      console.log('✅ Transactions table created');

      // Create indexes for performance
      console.log('🔄 Creating database indexes...');
      
      await run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
      await run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
      await run('CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chatId, timestamp)');
      await run('CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(senderId)');
      await run('CREATE INDEX IF NOT EXISTS idx_chat_participants ON chat_participants(chatId, userId)');
      await run('CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(userId, isActive)');
      await run('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId, isRead)');
      await run('CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(userId, expiresAt)');
      await run('CREATE INDEX IF NOT EXISTS idx_events_user ON event_logs(userId, eventType)');
      
      console.log('✅ Database indexes created');

      // Create static admin user
      console.log('🔄 Creating static admin user...');
      const adminPasswordHash = await bcrypt.hash('admin123', 12);
      
      await run(`
        INSERT OR REPLACE INTO users (
          id, username, email, passwordHash, role, avatar, 
          emailVerified, phoneVerified, status, theme, language
        ) VALUES (
          1, 'admin', 'admin@hodhod.com', ?, 'admin', 
          'https://ui-avatars.com/api/?name=Admin&background=1F3934&color=F3C883&size=128',
          1, 0, 'available', 'light', 'en'
        )
      `, [adminPasswordHash]);
      
      console.log('✅ Static admin user created: admin@hodhod.com / admin123');

      // Create AI user for responses
      await run(`
        INSERT OR REPLACE INTO users (
          id, username, email, passwordHash, role, avatar,
          emailVerified, status
        ) VALUES (
          999, 'HodhodAI', 'ai@hodhod.com', 'no-password', 'ai', 
          'https://ui-avatars.com/api/?name=AI&background=F3C883&color=1F3934&size=128',
          1, 'available'
        )
      `);
      console.log('✅ AI user created');

      // Insert default system settings
      const defaultSettings = [
        ['ai_enabled', 'true', 'ai'],
        ['openrouter_api_key', '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', 'ai'],
        ['together_api_key', '', 'ai'],
        ['openrouter_enabled', 'true', 'ai'],
        ['together_enabled', 'false', 'ai'],
        ['ai_default_provider', 'openrouter', 'ai'],
        ['ai_default_model', 'meta-llama/llama-3.2-1b-instruct:free', 'ai'],
        ['ai_temperature', '0.7', 'ai'],
        ['ai_max_tokens', '2048', 'ai'],
        ['stripe_enabled', 'false', 'payments'],
        ['max_file_size', '52428800', 'files'], // 50MB
        ['twin_enabled', 'true', 'features'],
        ['world_brain_enabled', 'true', 'features'],
        ['stories_enabled', 'true', 'features'],
        ['calls_enabled', 'true', 'features'],
        ['encryption_enabled', 'true', 'security'],
        ['app_name', 'Hodhod Messenger', 'general'],
        ['app_version', '1.0.0', 'general']
      ];

      for (const [key, value, category] of defaultSettings) {
        await run(`
          INSERT OR REPLACE INTO system_settings (key, value, category) 
          VALUES (?, ?, ?)
        `, [key, value, category]);
      }
      console.log('✅ Default system settings created');

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

  // Enhanced user methods
  async createUser(userData) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      console.log('🔄 Creating user:', userData.username);
      const result = await run(`
        INSERT INTO users (
          username, email, passwordHash, avatar, phoneNumber, bio, 
          theme, language, notificationSettings, privacySettings
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userData.username, 
        userData.email, 
        userData.passwordHash, 
        userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username)}&background=1F3934&color=F3C883&size=128`,
        userData.phoneNumber || '',
        userData.bio || '',
        userData.theme || 'light',
        userData.language || 'en',
        JSON.stringify(userData.notificationSettings || {}),
        JSON.stringify(userData.privacySettings || {})
      ]);
      console.log('✅ User created with ID:', result.lastID);
      return result;
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  }

  async getUserByEmail(email) {
    const get = promisify(this.db.get.bind(this.db));
    try {
      const user = await get('SELECT * FROM users WHERE email = ? AND isDeleted = 0', [email]);
      return user;
    } catch (error) {
      console.error('❌ Error getting user by email:', error);
      throw error;
    }
  }

  async getUserByUsername(username) {
    const get = promisify(this.db.get.bind(this.db));
    try {
      const user = await get('SELECT * FROM users WHERE username = ? AND isDeleted = 0', [username]);
      return user;
    } catch (error) {
      console.error('❌ Error getting user by username:', error);
      throw error;
    }
  }

  async getUserById(id) {
    const get = promisify(this.db.get.bind(this.db));
    try {
      const user = await get('SELECT * FROM users WHERE id = ? AND isDeleted = 0', [id]);
      return user;
    } catch (error) {
      console.error('❌ Error getting user by ID:', error);
      throw error;
    }
  }

  async updateUserStatus(userId, isOnline) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        UPDATE users 
        SET isOnline = ?, lastSeen = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [isOnline ? 1 : 0, userId]);
    } catch (error) {
      console.error('❌ Error updating user status:', error);
      throw error;
    }
  }

  async updateUserProfile(userId, profileData) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      const fields = [];
      const values = [];
      
      Object.keys(profileData).forEach(key => {
        if (profileData[key] !== undefined) {
          fields.push(`${key} = ?`);
          values.push(typeof profileData[key] === 'object' ? JSON.stringify(profileData[key]) : profileData[key]);
        }
      });
      
      if (fields.length > 0) {
        fields.push('updatedAt = CURRENT_TIMESTAMP');
        values.push(userId);
        
        await run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
      }
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      throw error;
    }
  }

  async updateUserTwin(userId, twinEnabled, twinPersonality) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        UPDATE users 
        SET twinEnabled = ?, twinPersonality = ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [twinEnabled ? 1 : 0, twinPersonality || null, userId]);
    } catch (error) {
      console.error('❌ Error updating user twin:', error);
      throw error;
    }
  }

  // Enhanced chat methods
  async createChat(chatData) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      const result = await run(`
        INSERT INTO chats (
          name, description, isGroup, avatar, isPremium, 
          wallpaper, encryptionKey, createdBy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        chatData.name || null, 
        chatData.description || null, 
        chatData.isGroup ? 1 : 0, 
        chatData.avatar || null, 
        chatData.isPremium ? 1 : 0,
        chatData.wallpaper || null,
        chatData.encryptionKey || null,
        chatData.createdBy
      ]);
      return result;
    } catch (error) {
      console.error('❌ Error creating chat:', error);
      throw error;
    }
  }

  async getUserChats(userId) {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(`
        SELECT c.*, cp.role as userRole,
          (SELECT COUNT(*) FROM messages m WHERE m.chatId = c.id AND m.isDeleted = 0) as messageCount,
          (SELECT m.content FROM messages m WHERE m.chatId = c.id AND m.isDeleted = 0 ORDER BY m.timestamp DESC LIMIT 1) as lastMessage,
          (SELECT m.timestamp FROM messages m WHERE m.chatId = c.id AND m.isDeleted = 0 ORDER BY m.timestamp DESC LIMIT 1) as lastMessageTime
        FROM chats c
        JOIN chat_participants cp ON c.id = cp.chatId
        WHERE cp.userId = ?
        ORDER BY lastMessageTime DESC NULLS LAST
      `, [userId]);
    } catch (error) {
      console.error('❌ Error getting user chats:', error);
      throw error;
    }
  }

  async addChatParticipant(chatId, userId, role = 'member', permissions = {}) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        INSERT OR IGNORE INTO chat_participants (chatId, userId, role, permissions) 
        VALUES (?, ?, ?, ?)
      `, [chatId, userId, role, JSON.stringify(permissions)]);
    } catch (error) {
      console.error('❌ Error adding chat participant:', error);
      throw error;
    }
  }

  async getChatParticipants(chatId) {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(`
        SELECT cp.*, u.username, u.avatar, u.isOnline, u.lastSeen
        FROM chat_participants cp
        JOIN users u ON cp.userId = u.id
        WHERE cp.chatId = ? AND u.isDeleted = 0
        ORDER BY cp.joinedAt
      `, [chatId]);
    } catch (error) {
      console.error('❌ Error getting chat participants:', error);
      throw error;
    }
  }

  // Enhanced message methods
  async createMessage(messageData) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      const result = await run(`
        INSERT INTO messages (
          chatId, senderId, content, type, fileUrl, fileName, fileSize, fileMimeType,
          replyToId, forwardedFromId, isPremium, animationType, mentions, hashtags,
          location, expiresAt, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        messageData.chatId,
        messageData.senderId,
        messageData.content,
        messageData.type || 'text',
        messageData.fileUrl || null,
        messageData.fileName || null,
        messageData.fileSize || null,
        messageData.fileMimeType || null,
        messageData.replyToId || null,
        messageData.forwardedFromId || null,
        messageData.isPremium ? 1 : 0,
        messageData.animationType || null,
        JSON.stringify(messageData.mentions || []),
        JSON.stringify(messageData.hashtags || []),
        messageData.location || null,
        messageData.expiresAt || null,
        JSON.stringify(messageData.metadata || {})
      ]);
      return result;
    } catch (error) {
      console.error('❌ Error creating message:', error);
      throw error;
    }
  }

  async getChatMessages(chatId, limit = 50, offset = 0) {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(`
        SELECT m.*, u.username, u.avatar as userAvatar
        FROM messages m
        JOIN users u ON m.senderId = u.id
        WHERE m.chatId = ? AND m.isDeleted = 0
        ORDER BY m.timestamp DESC
        LIMIT ? OFFSET ?
      `, [chatId, limit, offset]);
    } catch (error) {
      console.error('❌ Error getting chat messages:', error);
      throw error;
    }
  }

  async getMessageById(messageId) {
    const get = promisify(this.db.get.bind(this.db));
    try {
      return await get(`
        SELECT m.*, u.username, u.avatar as userAvatar
        FROM messages m
        JOIN users u ON m.senderId = u.id
        WHERE m.id = ? AND m.isDeleted = 0
      `, [messageId]);
    } catch (error) {
      console.error('❌ Error getting message by ID:', error);
      throw error;
    }
  }

  async editMessage(messageId, content) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        UPDATE messages 
        SET content = ?, isEdited = 1, editedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [content, messageId]);
    } catch (error) {
      console.error('❌ Error editing message:', error);
      throw error;
    }
  }

  async deleteMessage(messageId) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        UPDATE messages 
        SET isDeleted = 1, deletedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [messageId]);
    } catch (error) {
      console.error('❌ Error deleting message:', error);
      throw error;
    }
  }

  async searchMessages(userId, query, limit = 20) {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(`
        SELECT m.*, u.username, u.avatar as userAvatar, c.name as chatName
        FROM messages m
        JOIN users u ON m.senderId = u.id
        JOIN chats c ON m.chatId = c.id
        JOIN chat_participants cp ON c.id = cp.chatId
        WHERE cp.userId = ? AND m.content LIKE ? AND m.isDeleted = 0
        ORDER BY m.timestamp DESC
        LIMIT ?
      `, [userId, `%${query}%`, limit]);
    } catch (error) {
      console.error('❌ Error searching messages:', error);
      throw error;
    }
  }

  // Message reactions
  async addMessageReaction(messageId, userId, reaction) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        INSERT OR REPLACE INTO message_reactions (messageId, userId, reaction) 
        VALUES (?, ?, ?)
      `, [messageId, userId, reaction]);
    } catch (error) {
      console.error('❌ Error adding message reaction:', error);
      throw error;
    }
  }

  async getMessageReactions(messageId) {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(`
        SELECT mr.*, u.username
        FROM message_reactions mr
        JOIN users u ON mr.userId = u.id
        WHERE mr.messageId = ?
        ORDER BY mr.createdAt
      `, [messageId]);
    } catch (error) {
      console.error('❌ Error getting message reactions:', error);
      throw error;
    }
  }

  // Call methods
  async createCall(callData) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      const result = await run(`
        INSERT INTO calls (
          chatId, initiatorId, participants, type, status, startedAt
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        callData.chatId, 
        callData.initiatorId, 
        JSON.stringify(callData.participants || []), 
        callData.type || 'voice', 
        'active'
      ]);
      return result;
    } catch (error) {
      console.error('❌ Error creating call:', error);
      throw error;
    }
  }

  async endCall(callId, duration, quality = null, recordingUrl = null) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        UPDATE calls 
        SET status = 'ended', endedAt = CURRENT_TIMESTAMP, duration = ?, quality = ?, recordingUrl = ?
        WHERE id = ?
      `, [duration, quality, recordingUrl, callId]);
    } catch (error) {
      console.error('❌ Error ending call:', error);
      throw error;
    }
  }

  // Future messages
  async createFutureMessage(messageData) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        INSERT INTO future_messages (
          chatId, senderId, content, scheduledFor, repeatType, repeatInterval
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        messageData.chatId, 
        messageData.senderId, 
        messageData.content, 
        messageData.scheduledFor,
        messageData.repeatType || null,
        messageData.repeatInterval || null
      ]);
    } catch (error) {
      console.error('❌ Error creating future message:', error);
      throw error;
    }
  }

  async getDueMessages() {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(`
        SELECT * FROM future_messages 
        WHERE scheduledFor <= datetime('now') AND sent = 0
      `);
    } catch (error) {
      console.error('❌ Error getting due messages:', error);
      throw error;
    }
  }

  async markFutureMessageSent(id) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run('UPDATE future_messages SET sent = 1 WHERE id = ?', [id]);
    } catch (error) {
      console.error('❌ Error marking future message sent:', error);
      throw error;
    }
  }

  // AGI Companion
  async saveAGIConversation(userId, message, response, context = {}, model = null, provider = null) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        INSERT INTO agi_conversations (
          userId, sessionId, message, response, context, model, provider
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        userId, 
        `session_${userId}_${Date.now()}`, 
        message, 
        response, 
        JSON.stringify(context),
        model,
        provider
      ]);
    } catch (error) {
      console.error('❌ Error saving AGI conversation:', error);
      throw error;
    }
  }

  async getAGIHistory(userId, limit = 10) {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(`
        SELECT * FROM agi_conversations 
        WHERE userId = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `, [userId, limit]);
    } catch (error) {
      console.error('❌ Error getting AGI history:', error);
      throw error;
    }
  }

  // World Brain methods
  async createWorldBrainQuestion(question, askedBy, category = null, tags = []) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      const result = await run(`
        INSERT INTO world_brain_questions (question, askedBy, category, tags) 
        VALUES (?, ?, ?, ?)
      `, [question, askedBy, category, JSON.stringify(tags)]);
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

  async addWorldBrainAnswer(questionId, userId, answer, confidence = 0) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        INSERT INTO world_brain_answers (questionId, userId, answer, confidence) 
        VALUES (?, ?, ?, ?)
      `, [questionId, userId, answer, confidence]);
    } catch (error) {
      console.error('❌ Error adding world brain answer:', error);
      throw error;
    }
  }

  async getQuestionAnswers(questionId) {
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

  async voteAnswer(answerId, vote) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        UPDATE world_brain_answers 
        SET votes = votes + ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [vote, answerId]);
    } catch (error) {
      console.error('❌ Error voting answer:', error);
      throw error;
    }
  }

  // Stories methods
  async createStory(userId, content, mediaUrl = null, mediaType = null, backgroundColor = null, textColor = null) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
      const result = await run(`
        INSERT INTO stories (
          userId, content, mediaUrl, mediaType, backgroundColor, textColor, expiresAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [userId, content, mediaUrl, mediaType, backgroundColor, textColor, expiresAt]);
      return result;
    } catch (error) {
      console.error('❌ Error creating story:', error);
      throw error;
    }
  }

  async getUserStories(userId) {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(`
        SELECT s.*, u.username, u.avatar
        FROM stories s
        JOIN users u ON s.userId = u.id
        WHERE s.userId = ? AND s.expiresAt > datetime('now')
        ORDER BY s.createdAt DESC
      `, [userId]);
    } catch (error) {
      console.error('❌ Error getting user stories:', error);
      throw error;
    }
  }

  async viewStory(storyId, viewerId) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        INSERT OR IGNORE INTO story_views (storyId, viewerId) 
        VALUES (?, ?)
      `, [storyId, viewerId]);
      
      await run(`
        UPDATE stories 
        SET views = views + 1 
        WHERE id = ?
      `, [storyId]);
    } catch (error) {
      console.error('❌ Error viewing story:', error);
      throw error;
    }
  }

  // Notification methods
  async createNotification(userId, type, title, message, data = {}) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        INSERT INTO notifications (userId, type, title, message, data) 
        VALUES (?, ?, ?, ?, ?)
      `, [userId, type, title, message, JSON.stringify(data)]);
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }
  }

  async getUserNotifications(userId, limit = 20) {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(`
        SELECT * FROM notifications 
        WHERE userId = ? 
        ORDER BY createdAt DESC 
        LIMIT ?
      `, [userId, limit]);
    } catch (error) {
      console.error('❌ Error getting user notifications:', error);
      throw error;
    }
  }

  async markNotificationRead(notificationId) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        UPDATE notifications 
        SET isRead = 1 
        WHERE id = ?
      `, [notificationId]);
    } catch (error) {
      console.error('❌ Error marking notification read:', error);
      throw error;
    }
  }

  // Session management
  async createSession(userId, sessionToken, deviceInfo, ipAddress, userAgent) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
      await run(`
        INSERT INTO user_sessions (
          userId, sessionToken, deviceInfo, ipAddress, userAgent, expiresAt
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [userId, sessionToken, deviceInfo, ipAddress, userAgent, expiresAt]);
    } catch (error) {
      console.error('❌ Error creating session:', error);
      throw error;
    }
  }

  async revokeSession(sessionToken) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        UPDATE user_sessions 
        SET isActive = 0 
        WHERE sessionToken = ?
      `, [sessionToken]);
    } catch (error) {
      console.error('❌ Error revoking session:', error);
      throw error;
    }
  }

  // Event logging
  async logEvent(userId, eventType, eventData = {}, ipAddress = null, userAgent = null) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        INSERT INTO event_logs (userId, eventType, eventData, ipAddress, userAgent) 
        VALUES (?, ?, ?, ?, ?)
      `, [userId, eventType, JSON.stringify(eventData), ipAddress, userAgent]);
    } catch (error) {
      console.error('❌ Error logging event:', error);
      // Don't throw error for logging failures
    }
  }

  // Settings methods
  async getSetting(key) {
    const get = promisify(this.db.get.bind(this.db));
    try {
      const result = await get('SELECT value FROM system_settings WHERE key = ?', [key]);
      return result?.value;
    } catch (error) {
      console.error('❌ Error getting setting:', error);
      throw error;
    }
  }

  async setSetting(key, value, category = 'general') {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        INSERT OR REPLACE INTO system_settings (key, value, category, updatedAt) 
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [key, value, category]);
    } catch (error) {
      console.error('❌ Error setting setting:', error);
      throw error;
    }
  }

  async getUserSetting(userId, category, key, defaultValue = null) {
    const get = promisify(this.db.get.bind(this.db));
    try {
      const result = await get(`
        SELECT value FROM system_settings 
        WHERE key = ?
      `, [`user_${userId}_${category}_${key}`]);
      return result?.value || defaultValue;
    } catch (error) {
      console.error('❌ Error getting user setting:', error);
      return defaultValue;
    }
  }

  // Admin methods
  async getAllUsers() {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(`
        SELECT id, username, email, role, isOnline, lastSeen, createdAt, status
        FROM users 
        WHERE isDeleted = 0
        ORDER BY createdAt DESC
      `);
    } catch (error) {
      console.error('❌ Error getting all users:', error);
      throw error;
    }
  }

  async deleteUser(userId) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        UPDATE users 
        SET isDeleted = 1, deletedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [userId]);
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      throw error;
    }
  }

  async updateUserRole(userId, role) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        UPDATE users 
        SET role = ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [role, userId]);
    } catch (error) {
      console.error('❌ Error updating user role:', error);
      throw error;
    }
  }

  async getSystemStats() {
    const get = promisify(this.db.get.bind(this.db));
    try {
      const userCount = await get('SELECT COUNT(*) as count FROM users WHERE isDeleted = 0');
      const messageCount = await get('SELECT COUNT(*) as count FROM messages WHERE isDeleted = 0');
      const chatCount = await get('SELECT COUNT(*) as count FROM chats');
      const onlineUsers = await get('SELECT COUNT(*) as count FROM users WHERE isOnline = 1 AND isDeleted = 0');
      const callCount = await get('SELECT COUNT(*) as count FROM calls WHERE status = "ended"');
      const storyCount = await get('SELECT COUNT(*) as count FROM stories WHERE expiresAt > datetime("now")');
      
      return {
        users: userCount.count,
        messages: messageCount.count,
        chats: chatCount.count,
        onlineUsers: onlineUsers.count,
        calls: callCount.count,
        activeStories: storyCount.count
      };
    } catch (error) {
      console.error('❌ Error getting system stats:', error);
      throw error;
    }
  }

  // Transaction methods
  async createTransaction(transactionData) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      const result = await run(`
        INSERT INTO transactions (
          userId, amount, currency, status, stripePaymentId, description, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        transactionData.userId, 
        transactionData.amount, 
        transactionData.currency || 'USD', 
        transactionData.status || 'pending', 
        transactionData.stripePaymentId || null, 
        transactionData.description || null,
        JSON.stringify(transactionData.metadata || {})
      ]);
      return result;
    } catch (error) {
      console.error('❌ Error creating transaction:', error);
      throw error;
    }
  }

  async updateTransaction(transactionId, status) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        UPDATE transactions 
        SET status = ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [status, transactionId]);
    } catch (error) {
      console.error('❌ Error updating transaction:', error);
      throw error;
    }
  }
}