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
    this.db.run('PRAGMA synchronous = NORMAL');
  }

  async init() {
    const run = promisify(this.db.run.bind(this.db));
    
    try {
      console.log('🔄 Creating database tables...');
      
      // Users table with enhanced fields
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
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
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
          lastActivity DATETIME DEFAULT CURRENT_TIMESTAMP,
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

      // Messages table with enhanced features
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
          isEdited INTEGER DEFAULT 0,
          isDeleted INTEGER DEFAULT 0,
          readBy TEXT DEFAULT '[]',
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chatId) REFERENCES chats(id),
          FOREIGN KEY (senderId) REFERENCES users(id),
          FOREIGN KEY (replyToId) REFERENCES messages(id)
        )
      `);
      console.log('✅ Messages table created/verified');

      // Stories table
      await run(`
        CREATE TABLE IF NOT EXISTS stories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          content TEXT,
          mediaUrl TEXT,
          mediaType TEXT DEFAULT 'text',
          backgroundColor TEXT DEFAULT '#1F3934',
          textColor TEXT DEFAULT '#FFFFFF',
          font TEXT DEFAULT 'default',
          duration INTEGER DEFAULT 10,
          viewCount INTEGER DEFAULT 0,
          isActive INTEGER DEFAULT 1,
          expiresAt DATETIME,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id)
        )
      `);
      console.log('✅ Stories table created/verified');

      // Story views table
      await run(`
        CREATE TABLE IF NOT EXISTS story_views (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          storyId INTEGER,
          viewerId INTEGER,
          viewedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (storyId) REFERENCES stories(id),
          FOREIGN KEY (viewerId) REFERENCES users(id),
          UNIQUE(storyId, viewerId)
        )
      `);
      console.log('✅ Story views table created/verified');

      // Calls table with enhanced features
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
          quality TEXT DEFAULT 'good',
          recordingUrl TEXT,
          FOREIGN KEY (chatId) REFERENCES chats(id),
          FOREIGN KEY (initiatorId) REFERENCES users(id)
        )
      `);
      console.log('✅ Calls table created/verified');

      // User settings table
      await run(`
        CREATE TABLE IF NOT EXISTS user_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          settingKey TEXT,
          settingValue TEXT,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id),
          UNIQUE(userId, settingKey)
        )
      `);
      console.log('✅ User settings table created/verified');

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

      // Create static admin user
      console.log('🔄 Creating static admin user...');
      const adminPasswordHash = await bcrypt.hash('123', 12);
      
      // First, check if admin exists
      const get = promisify(this.db.get.bind(this.db));
      const existingAdmin = await get('SELECT id FROM users WHERE username = ?', ['admin']);
      
      if (!existingAdmin) {
        await run(`
          INSERT INTO users (username, email, passwordHash, role, avatar, bio, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          'admin',
          'admin@hodhod.com',
          adminPasswordHash,
          'admin',
          'https://ui-avatars.com/api/?name=Admin&background=1F3934&color=F3C883&size=128',
          'System Administrator',
          'available'
        ]);
        console.log('✅ Static admin user created: username=admin, password=123');
      } else {
        // Update existing admin password
        await run(`
          UPDATE users SET passwordHash = ?, role = 'admin' WHERE username = 'admin'
        `, [adminPasswordHash]);
        console.log('✅ Admin user password updated: username=admin, password=123');
      }

      // Create AI user for responses
      const existingAI = await get('SELECT id FROM users WHERE username = ?', ['HodhodAI']);
      if (!existingAI) {
        await run(`
          INSERT INTO users (id, username, email, passwordHash, role, avatar, bio, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          999,
          'HodhodAI',
          'ai@hodhod.com',
          'no-password',
          'ai',
          'https://ui-avatars.com/api/?name=AI&background=F3C883&color=1F3934&size=128',
          'Your AI Assistant',
          'online'
        ]);
        console.log('✅ AI user created');
      }

      // Insert default system settings
      const defaultSettings = [
        ['ai_enabled', 'true'],
        ['openrouter_api_key', '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'],
        ['openrouter_enabled', 'true'],
        ['together_api_key', 'df0e3a796e6b2cf9c259764ddbd6864feaeba068fbbc20b9141025b2f9d2055c'],
        ['together_enabled', 'true'],
        ['stripe_enabled', 'false'],
        ['max_file_size', '10485760'],
        ['twin_enabled', 'true'],
        ['world_brain_enabled', 'true'],
        ['stories_enabled', 'true'],
        ['calls_enabled', 'true']
      ];

      for (const [key, value] of defaultSettings) {
        await run(`
          INSERT OR IGNORE INTO system_settings (key, value)
          VALUES (?, ?)
        `, [key, value]);
      }
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

  // Enhanced user methods
  async createUser(userData) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      console.log('🔄 Creating user:', userData.username);
      const result = await run(
        'INSERT INTO users (username, email, passwordHash, avatar, bio, phoneNumber) VALUES (?, ?, ?, ?, ?, ?)',
        [
          userData.username, 
          userData.email, 
          userData.passwordHash, 
          userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username)}&background=1F3934&color=F3C883&size=128`,
          userData.bio || '',
          userData.phoneNumber || ''
        ]
      );
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
      console.log('🔍 Looking up user by email:', email);
      const user = await get('SELECT * FROM users WHERE email = ?', [email]);
      console.log('✅ User lookup result:', user ? 'Found' : 'Not found');
      return user;
    } catch (error) {
      console.error('❌ Error getting user by email:', error);
      throw error;
    }
  }

  async getUserByUsername(username) {
    const get = promisify(this.db.get.bind(this.db));
    try {
      const user = await get('SELECT * FROM users WHERE username = ?', [username]);
      return user;
    } catch (error) {
      console.error('❌ Error getting user by username:', error);
      throw error;
    }
  }

  async getUserById(id) {
    const get = promisify(this.db.get.bind(this.db));
    try {
      const user = await get('SELECT * FROM users WHERE id = ?', [id]);
      return user;
    } catch (error) {
      console.error('❌ Error getting user by ID:', error);
      throw error;
    }
  }

  async updateUserStatus(userId, isOnline) {
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

  async updateUserProfile(userId, profileData) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      const fields = [];
      const values = [];
      
      if (profileData.bio !== undefined) {
        fields.push('bio = ?');
        values.push(profileData.bio);
      }
      if (profileData.phoneNumber !== undefined) {
        fields.push('phoneNumber = ?');
        values.push(profileData.phoneNumber);
      }
      if (profileData.status !== undefined) {
        fields.push('status = ?');
        values.push(profileData.status);
      }
      if (profileData.avatar !== undefined) {
        fields.push('avatar = ?');
        values.push(profileData.avatar);
      }
      
      if (fields.length > 0) {
        fields.push('updatedAt = CURRENT_TIMESTAMP');
        values.push(userId);
        
        await run(
          `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
          values
        );
      }
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      throw error;
    }
  }

  // Story methods
  async createStory(storyData) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // Stories expire after 24 hours
      
      const result = await run(`
        INSERT INTO stories (userId, content, mediaUrl, mediaType, backgroundColor, textColor, font, duration, expiresAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        storyData.userId,
        storyData.content || '',
        storyData.mediaUrl || null,
        storyData.mediaType || 'text',
        storyData.backgroundColor || '#1F3934',
        storyData.textColor || '#FFFFFF',
        storyData.font || 'default',
        storyData.duration || 10,
        expiresAt.toISOString()
      ]);
      return result;
    } catch (error) {
      console.error('❌ Error creating story:', error);
      throw error;
    }
  }

  async getActiveStories() {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(`
        SELECT s.*, u.username, u.avatar as userAvatar,
               (SELECT COUNT(*) FROM story_views sv WHERE sv.storyId = s.id) as viewCount
        FROM stories s
        JOIN users u ON s.userId = u.id
        WHERE s.isActive = 1 AND s.expiresAt > datetime('now')
        ORDER BY s.createdAt DESC
      `);
    } catch (error) {
      console.error('❌ Error getting active stories:', error);
      throw error;
    }
  }

  async getUserStories(userId) {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(`
        SELECT s.*,
               (SELECT COUNT(*) FROM story_views sv WHERE sv.storyId = s.id) as viewCount
        FROM stories s
        WHERE s.userId = ? AND s.isActive = 1 AND s.expiresAt > datetime('now')
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
      
      // Update view count
      await run(`
        UPDATE stories SET viewCount = viewCount + 1 WHERE id = ?
      `, [storyId]);
    } catch (error) {
      console.error('❌ Error viewing story:', error);
      throw error;
    }
  }

  async getStoryViewers(storyId) {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(`
        SELECT u.username, u.avatar, sv.viewedAt
        FROM story_views sv
        JOIN users u ON sv.viewerId = u.id
        WHERE sv.storyId = ?
        ORDER BY sv.viewedAt DESC
      `, [storyId]);
    } catch (error) {
      console.error('❌ Error getting story viewers:', error);
      throw error;
    }
  }

  // User settings methods
  async getUserSetting(userId, key, defaultValue = null) {
    const get = promisify(this.db.get.bind(this.db));
    try {
      const result = await get(
        'SELECT settingValue FROM user_settings WHERE userId = ? AND settingKey = ?',
        [userId, key]
      );
      return result ? result.settingValue : defaultValue;
    } catch (error) {
      console.error('❌ Error getting user setting:', error);
      return defaultValue;
    }
  }

  async setUserSetting(userId, key, value) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        INSERT OR REPLACE INTO user_settings (userId, settingKey, settingValue, updatedAt)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [userId, key, value]);
    } catch (error) {
      console.error('❌ Error setting user setting:', error);
      throw error;
    }
  }

  async getAllUserSettings(userId) {
    const all = promisify(this.db.all.bind(this.db));
    try {
      const settings = await all(
        'SELECT settingKey, settingValue FROM user_settings WHERE userId = ?',
        [userId]
      );
      
      const settingsObj = {};
      settings.forEach(setting => {
        settingsObj[setting.settingKey] = setting.settingValue;
      });
      
      return settingsObj;
    } catch (error) {
      console.error('❌ Error getting all user settings:', error);
      throw error;
    }
  }

  // System settings
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

  async setSetting(key, value) {
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

  // Enhanced chat methods
  async createChat(chatData) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      const result = await run(
        'INSERT INTO chats (name, description, isGroup, avatar, isPremium, createdBy) VALUES (?, ?, ?, ?, ?, ?)',
        [
          chatData.name || null, 
          chatData.description || null, 
          chatData.isGroup ? 1 : 0, 
          chatData.avatar || null, 
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

  async getUserChats(userId) {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(`
        SELECT c.*, cp.role as userRole,
          (SELECT COUNT(*) FROM messages m WHERE m.chatId = c.id) as messageCount,
          (SELECT m.content FROM messages m WHERE m.chatId = c.id ORDER BY m.timestamp DESC LIMIT 1) as lastMessage,
          (SELECT m.timestamp FROM messages m WHERE m.chatId = c.id ORDER BY m.timestamp DESC LIMIT 1) as lastMessageTime,
          (SELECT u.username FROM messages m JOIN users u ON m.senderId = u.id WHERE m.chatId = c.id ORDER BY m.timestamp DESC LIMIT 1) as lastMessageSender
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

  async addChatParticipant(chatId, userId, role = 'member') {
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

  // Enhanced message methods
  async createMessage(messageData) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      const result = await run(
        'INSERT INTO messages (chatId, senderId, content, type, fileUrl, fileName, fileSize, replyToId, isPremium, animationType, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          messageData.chatId,
          messageData.senderId,
          messageData.content,
          messageData.type || 'text',
          messageData.fileUrl || null,
          messageData.fileName || null,
          messageData.fileSize || null,
          messageData.replyToId || null,
          messageData.isPremium ? 1 : 0,
          messageData.animationType || null,
          JSON.stringify(messageData.metadata || {})
        ]
      );
      
      // Update chat last activity
      await run(
        'UPDATE chats SET lastActivity = CURRENT_TIMESTAMP WHERE id = ?',
        [messageData.chatId]
      );
      
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
        SELECT m.*, u.username, u.avatar as userAvatar,
               rm.content as replyContent, ru.username as replyUsername
        FROM messages m
        JOIN users u ON m.senderId = u.id
        LEFT JOIN messages rm ON m.replyToId = rm.id
        LEFT JOIN users ru ON rm.senderId = ru.id
        WHERE m.chatId = ? AND m.isDeleted = 0
        ORDER BY m.timestamp DESC
        LIMIT ? OFFSET ?
      `, [chatId, limit, offset]);
    } catch (error) {
      console.error('❌ Error getting chat messages:', error);
      throw error;
    }
  }

  async markMessageAsRead(messageId, userId) {
    const run = promisify(this.db.run.bind(this.db));
    const get = promisify(this.db.get.bind(this.db));
    try {
      const message = await get('SELECT readBy FROM messages WHERE id = ?', [messageId]);
      if (message) {
        const readBy = JSON.parse(message.readBy || '[]');
        if (!readBy.includes(userId)) {
          readBy.push(userId);
          await run(
            'UPDATE messages SET readBy = ? WHERE id = ?',
            [JSON.stringify(readBy), messageId]
          );
        }
      }
    } catch (error) {
      console.error('❌ Error marking message as read:', error);
      throw error;
    }
  }

  // Call methods
  async createCall(callData) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      const result = await run(
        'INSERT INTO calls (chatId, initiatorId, participants, type, status, startedAt) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [callData.chatId, callData.initiatorId, JSON.stringify(callData.participants || []), callData.type || 'voice', 'active']
      );
      return result;
    } catch (error) {
      console.error('❌ Error creating call:', error);
      throw error;
    }
  }

  async endCall(callId, duration, quality = 'good') {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(
        'UPDATE calls SET status = ?, endedAt = CURRENT_TIMESTAMP, duration = ?, quality = ? WHERE id = ?',
        ['ended', duration, quality, callId]
      );
    } catch (error) {
      console.error('❌ Error ending call:', error);
      throw error;
    }
  }

  async getCallHistory(userId, limit = 20) {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(`
        SELECT c.*, u.username as initiatorName, u.avatar as initiatorAvatar,
               ch.name as chatName
        FROM calls c
        JOIN users u ON c.initiatorId = u.id
        LEFT JOIN chats ch ON c.chatId = ch.id
        WHERE c.participants LIKE ? OR c.initiatorId = ?
        ORDER BY c.startedAt DESC
        LIMIT ?
      `, [`%${userId}%`, userId, limit]);
    } catch (error) {
      console.error('❌ Error getting call history:', error);
      throw error;
    }
  }

  // Admin methods
  async getAllUsers() {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(`
        SELECT id, username, email, role, isOnline, lastSeen, status, bio, phoneNumber, createdAt, updatedAt 
        FROM users 
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
      await run('DELETE FROM users WHERE id = ?', [userId]);
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      throw error;
    }
  }

  async updateUserRole(userId, role) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run('UPDATE users SET role = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [role, userId]);
    } catch (error) {
      console.error('❌ Error updating user role:', error);
      throw error;
    }
  }

  async getSystemStats() {
    const get = promisify(this.db.get.bind(this.db));
    try {
      const userCount = await get('SELECT COUNT(*) as count FROM users');
      const messageCount = await get('SELECT COUNT(*) as count FROM messages WHERE isDeleted = 0');
      const chatCount = await get('SELECT COUNT(*) as count FROM chats');
      const onlineUsers = await get('SELECT COUNT(*) as count FROM users WHERE isOnline = 1');
      const storyCount = await get('SELECT COUNT(*) as count FROM stories WHERE isActive = 1');
      const callCount = await get('SELECT COUNT(*) as count FROM calls WHERE status = "ended"');
      
      return {
        users: userCount.count,
        messages: messageCount.count,
        chats: chatCount.count,
        onlineUsers: onlineUsers.count,
        stories: storyCount.count,
        calls: callCount.count
      };
    } catch (error) {
      console.error('❌ Error getting system stats:', error);
      throw error;
    }
  }
}