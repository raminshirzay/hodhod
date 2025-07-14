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

    // Enable foreign keys and WAL mode for better performance
    this.db.run('PRAGMA foreign_keys = ON');
    this.db.run('PRAGMA journal_mode = WAL');
    this.db.run('PRAGMA synchronous = NORMAL');
    this.db.run('PRAGMA cache_size = 10000');
    this.db.run('PRAGMA temp_store = MEMORY');
  }

  async init() {
    const run = promisify(this.db.run.bind(this.db));
    
    try {
      console.log('🔄 Creating comprehensive database schema...');
      
      // Enhanced Users table with all features
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
          notificationSettings TEXT DEFAULT '{}',
          privacySettings TEXT DEFAULT '{}',
          twoFactorEnabled INTEGER DEFAULT 0,
          twoFactorSecret TEXT,
          emailVerified INTEGER DEFAULT 1,
          phoneVerified INTEGER DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Enhanced Chats table
      await run(`
        CREATE TABLE IF NOT EXISTS chats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          description TEXT,
          isGroup INTEGER DEFAULT 0,
          avatar TEXT,
          isPremium INTEGER DEFAULT 0,
          isArchived INTEGER DEFAULT 0,
          isMuted INTEGER DEFAULT 0,
          muteUntil DATETIME,
          wallpaper TEXT,
          encryptionKey TEXT,
          lastActivity DATETIME DEFAULT CURRENT_TIMESTAMP,
          createdBy INTEGER,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (createdBy) REFERENCES users(id)
        )
      `);

      // Chat participants with enhanced roles
      await run(`
        CREATE TABLE IF NOT EXISTS chat_participants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chatId INTEGER,
          userId INTEGER,
          role TEXT DEFAULT 'member',
          permissions TEXT DEFAULT '{}',
          joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          leftAt DATETIME,
          isActive INTEGER DEFAULT 1,
          FOREIGN KEY (chatId) REFERENCES chats(id),
          FOREIGN KEY (userId) REFERENCES users(id),
          UNIQUE(chatId, userId)
        )
      `);

      // Enhanced Messages table with all features
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
          thumbnailUrl TEXT,
          replyToId INTEGER,
          forwardedFromId INTEGER,
          isPremium INTEGER DEFAULT 0,
          isEncrypted INTEGER DEFAULT 0,
          animationType TEXT,
          metadata TEXT DEFAULT '{}',
          isEdited INTEGER DEFAULT 0,
          editedAt DATETIME,
          isDeleted INTEGER DEFAULT 0,
          deletedAt DATETIME,
          readBy TEXT DEFAULT '[]',
          deliveredTo TEXT DEFAULT '[]',
          reactions TEXT DEFAULT '{}',
          mentions TEXT DEFAULT '[]',
          hashtags TEXT DEFAULT '[]',
          location TEXT,
          expiresAt DATETIME,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chatId) REFERENCES chats(id),
          FOREIGN KEY (senderId) REFERENCES users(id),
          FOREIGN KEY (replyToId) REFERENCES messages(id),
          FOREIGN KEY (forwardedFromId) REFERENCES messages(id)
        )
      `);

      // Stories table with enhanced features
      await run(`
        CREATE TABLE IF NOT EXISTS stories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          content TEXT,
          mediaUrl TEXT,
          mediaType TEXT DEFAULT 'text',
          thumbnailUrl TEXT,
          backgroundColor TEXT DEFAULT '#1F3934',
          textColor TEXT DEFAULT '#FFFFFF',
          font TEXT DEFAULT 'default',
          duration INTEGER DEFAULT 10,
          viewCount INTEGER DEFAULT 0,
          isActive INTEGER DEFAULT 1,
          allowReplies INTEGER DEFAULT 1,
          allowSharing INTEGER DEFAULT 1,
          music TEXT,
          filters TEXT DEFAULT '[]',
          stickers TEXT DEFAULT '[]',
          location TEXT,
          expiresAt DATETIME,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id)
        )
      `);

      // Story views with enhanced tracking
      await run(`
        CREATE TABLE IF NOT EXISTS story_views (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          storyId INTEGER,
          viewerId INTEGER,
          viewDuration INTEGER DEFAULT 0,
          reactionType TEXT,
          viewedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (storyId) REFERENCES stories(id),
          FOREIGN KEY (viewerId) REFERENCES users(id),
          UNIQUE(storyId, viewerId)
        )
      `);

      // Enhanced Calls table
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
          isRecorded INTEGER DEFAULT 0,
          failureReason TEXT,
          bandwidth TEXT,
          FOREIGN KEY (chatId) REFERENCES chats(id),
          FOREIGN KEY (initiatorId) REFERENCES users(id)
        )
      `);

      // User settings with comprehensive options
      await run(`
        CREATE TABLE IF NOT EXISTS user_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          category TEXT NOT NULL,
          settingKey TEXT NOT NULL,
          settingValue TEXT,
          isEncrypted INTEGER DEFAULT 0,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id),
          UNIQUE(userId, category, settingKey)
        )
      `);

      // System settings with categories
      await run(`
        CREATE TABLE IF NOT EXISTS system_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category TEXT NOT NULL,
          key TEXT NOT NULL,
          value TEXT,
          description TEXT,
          isPublic INTEGER DEFAULT 0,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(category, key)
        )
      `);

      // Contacts and relationships
      await run(`
        CREATE TABLE IF NOT EXISTS contacts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          contactUserId INTEGER,
          displayName TEXT,
          relationship TEXT DEFAULT 'contact',
          isBlocked INTEGER DEFAULT 0,
          isFavorite INTEGER DEFAULT 0,
          addedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id),
          FOREIGN KEY (contactUserId) REFERENCES users(id),
          UNIQUE(userId, contactUserId)
        )
      `);

      // Message reactions
      await run(`
        CREATE TABLE IF NOT EXISTS message_reactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          messageId INTEGER,
          userId INTEGER,
          reaction TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (messageId) REFERENCES messages(id),
          FOREIGN KEY (userId) REFERENCES users(id),
          UNIQUE(messageId, userId, reaction)
        )
      `);

      // File attachments with metadata
      await run(`
        CREATE TABLE IF NOT EXISTS file_attachments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          messageId INTEGER,
          fileName TEXT NOT NULL,
          originalName TEXT NOT NULL,
          fileSize INTEGER,
          mimeType TEXT,
          fileUrl TEXT NOT NULL,
          thumbnailUrl TEXT,
          duration INTEGER,
          dimensions TEXT,
          checksum TEXT,
          isScanned INTEGER DEFAULT 0,
          scanResult TEXT,
          uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (messageId) REFERENCES messages(id)
        )
      `);

      // Notifications system
      await run(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT,
          data TEXT DEFAULT '{}',
          isRead INTEGER DEFAULT 0,
          isPush INTEGER DEFAULT 0,
          isEmail INTEGER DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          readAt DATETIME,
          FOREIGN KEY (userId) REFERENCES users(id)
        )
      `);

      // Sessions for security
      await run(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          sessionToken TEXT UNIQUE NOT NULL,
          deviceInfo TEXT,
          ipAddress TEXT,
          userAgent TEXT,
          isActive INTEGER DEFAULT 1,
          lastActivity DATETIME DEFAULT CURRENT_TIMESTAMP,
          expiresAt DATETIME,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id)
        )
      `);

      // Enhanced Future messages
      await run(`
        CREATE TABLE IF NOT EXISTS future_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chatId INTEGER,
          senderId INTEGER,
          content TEXT NOT NULL,
          type TEXT DEFAULT 'text',
          fileUrl TEXT,
          scheduledFor DATETIME NOT NULL,
          timezone TEXT DEFAULT 'UTC',
          repeatType TEXT,
          repeatInterval INTEGER,
          maxRepeats INTEGER,
          currentRepeats INTEGER DEFAULT 0,
          sent INTEGER DEFAULT 0,
          sentAt DATETIME,
          cancelled INTEGER DEFAULT 0,
          cancelledAt DATETIME,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chatId) REFERENCES chats(id),
          FOREIGN KEY (senderId) REFERENCES users(id)
        )
      `);

      // World brain questions with enhanced features
      await run(`
        CREATE TABLE IF NOT EXISTS world_brain_questions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          question TEXT NOT NULL,
          description TEXT,
          category TEXT,
          tags TEXT DEFAULT '[]',
          askedBy INTEGER,
          status TEXT DEFAULT 'open',
          priority INTEGER DEFAULT 0,
          bounty DECIMAL(10,2) DEFAULT 0,
          finalAnswer TEXT,
          finalAnswerId INTEGER,
          viewCount INTEGER DEFAULT 0,
          upvotes INTEGER DEFAULT 0,
          downvotes INTEGER DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (askedBy) REFERENCES users(id),
          FOREIGN KEY (finalAnswerId) REFERENCES world_brain_answers(id)
        )
      `);

      // World brain answers with enhanced features
      await run(`
        CREATE TABLE IF NOT EXISTS world_brain_answers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          questionId INTEGER,
          userId INTEGER,
          answer TEXT NOT NULL,
          sources TEXT DEFAULT '[]',
          confidence INTEGER DEFAULT 50,
          votes INTEGER DEFAULT 0,
          upvotes INTEGER DEFAULT 0,
          downvotes INTEGER DEFAULT 0,
          isVerified INTEGER DEFAULT 0,
          verifiedBy INTEGER,
          verifiedAt DATETIME,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (questionId) REFERENCES world_brain_questions(id),
          FOREIGN KEY (userId) REFERENCES users(id),
          FOREIGN KEY (verifiedBy) REFERENCES users(id)
        )
      `);

      // AGI companion conversations with context
      await run(`
        CREATE TABLE IF NOT EXISTS agi_conversations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          sessionId TEXT,
          message TEXT NOT NULL,
          response TEXT NOT NULL,
          context TEXT DEFAULT '{}',
          mood TEXT,
          topics TEXT DEFAULT '[]',
          sentiment REAL,
          confidence REAL,
          processingTime INTEGER,
          model TEXT,
          tokens INTEGER,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id)
        )
      `);

      // Digital twin sessions with learning
      await run(`
        CREATE TABLE IF NOT EXISTS twin_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          sessionData TEXT,
          learningData TEXT DEFAULT '{}',
          interactions INTEGER DEFAULT 0,
          accuracy REAL DEFAULT 0.5,
          lastActive DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id)
        )
      `);

      // Payment transactions (real implementation ready)
      await run(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          amount DECIMAL(10,2),
          currency TEXT DEFAULT 'USD',
          status TEXT DEFAULT 'pending',
          type TEXT DEFAULT 'payment',
          description TEXT,
          stripePaymentId TEXT,
          stripeCustomerId TEXT,
          metadata TEXT DEFAULT '{}',
          refundedAmount DECIMAL(10,2) DEFAULT 0,
          refundedAt DATETIME,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id)
        )
      `);

      // Analytics and metrics
      await run(`
        CREATE TABLE IF NOT EXISTS analytics_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          eventType TEXT NOT NULL,
          eventData TEXT DEFAULT '{}',
          sessionId TEXT,
          ipAddress TEXT,
          userAgent TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id)
        )
      `);

      // Create indexes for performance
      await run('CREATE INDEX IF NOT EXISTS idx_messages_chat_timestamp ON messages(chatId, timestamp)');
      await run('CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(senderId)');
      await run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
      await run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
      await run('CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(userId)');
      await run('CREATE INDEX IF NOT EXISTS idx_chat_participants_chat ON chat_participants(chatId)');
      await run('CREATE INDEX IF NOT EXISTS idx_stories_user_active ON stories(userId, isActive)');
      await run('CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(userId, isRead)');
      await run('CREATE INDEX IF NOT EXISTS idx_future_messages_scheduled ON future_messages(scheduledFor, sent)');

      console.log('✅ Database indexes created for optimal performance');

      // Create comprehensive admin user
      console.log('🔄 Creating comprehensive admin user...');
      const adminPasswordHash = await bcrypt.hash('123', 12);
      
      const get = promisify(this.db.get.bind(this.db));
      const existingAdmin = await get('SELECT id FROM users WHERE username = ?', ['admin']);
      
      if (!existingAdmin) {
        await run(`
          INSERT INTO users (
            username, email, passwordHash, role, avatar, bio, status,
            theme, language, emailVerified, phoneVerified
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          'admin',
          'admin@hodhod.com',
          adminPasswordHash,
          'admin',
          'https://ui-avatars.com/api/?name=Admin&background=1F3934&color=F3C883&size=128',
          'System Administrator - Full access to all features',
          'available',
          'light',
          'en',
          1,
          1
        ]);
        console.log('✅ Comprehensive admin user created: username=admin, password=123');
      } else {
        await run(`
          UPDATE users SET 
            passwordHash = ?, 
            role = 'admin',
            emailVerified = 1,
            phoneVerified = 1,
            updatedAt = CURRENT_TIMESTAMP
          WHERE username = 'admin'
        `, [adminPasswordHash]);
        console.log('✅ Admin user updated with enhanced features');
      }

      // Create AI user with enhanced capabilities
      const existingAI = await get('SELECT id FROM users WHERE username = ?', ['HodhodAI']);
      if (!existingAI) {
        await run(`
          INSERT INTO users (
            id, username, email, passwordHash, role, avatar, bio, status,
            theme, language, emailVerified
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          999,
          'HodhodAI',
          'ai@hodhod.com',
          'no-password',
          'ai',
          'https://ui-avatars.com/api/?name=AI&background=F3C883&color=1F3934&size=128',
          'Advanced AI Assistant with multi-modal capabilities',
          'online',
          'light',
          'en',
          1
        ]);
        console.log('✅ Enhanced AI user created');
      }

      // Insert comprehensive system settings
      const defaultSettings = [
        // AI Settings
        ['ai', 'enabled', 'true', 'Enable AI features'],
        ['ai', 'openrouter_api_key', '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', 'OpenRouter API key'],
        ['ai', 'openrouter_enabled', 'true', 'Enable OpenRouter provider'],
        ['ai', 'together_api_key', 'df0e3a796e6b2cf9c259764ddbd6864feaeba068fbbc20b9141025b2f9d2055c', 'Together AI API key'],
        ['ai', 'together_enabled', 'true', 'Enable Together AI provider'],
        ['ai', 'default_model', 'meta-llama/llama-3.2-1b-instruct:free', 'Default AI model'],
        ['ai', 'max_tokens', '2048', 'Maximum tokens per request'],
        ['ai', 'temperature', '0.7', 'AI response creativity'],
        
        // System Settings
        ['system', 'max_file_size', '52428800', 'Maximum file size (50MB)'],
        ['system', 'allowed_file_types', 'jpg,jpeg,png,gif,webp,mp4,webm,mp3,wav,pdf,doc,docx', 'Allowed file types'],
        ['system', 'session_timeout', '86400', 'Session timeout in seconds'],
        ['system', 'rate_limit', '100', 'API rate limit per minute'],
        
        // Features
        ['features', 'twin_enabled', 'true', 'Enable digital twin'],
        ['features', 'world_brain_enabled', 'true', 'Enable world brain'],
        ['features', 'stories_enabled', 'true', 'Enable stories'],
        ['features', 'calls_enabled', 'true', 'Enable voice/video calls'],
        ['features', 'payments_enabled', 'false', 'Enable payment system'],
        ['features', 'encryption_enabled', 'true', 'Enable message encryption'],
        
        // Security
        ['security', 'password_min_length', '3', 'Minimum password length'],
        ['security', 'max_login_attempts', '5', 'Maximum login attempts'],
        ['security', 'lockout_duration', '900', 'Account lockout duration'],
        ['security', 'require_email_verification', 'false', 'Require email verification'],
        
        // Notifications
        ['notifications', 'push_enabled', 'true', 'Enable push notifications'],
        ['notifications', 'email_enabled', 'true', 'Enable email notifications'],
        ['notifications', 'sms_enabled', 'false', 'Enable SMS notifications']
      ];

      for (const [category, key, value, description] of defaultSettings) {
        await run(`
          INSERT OR IGNORE INTO system_settings (category, key, value, description)
          VALUES (?, ?, ?, ?)
        `, [category, key, value, description]);
      }
      console.log('✅ Comprehensive system settings created');

      // Verify database integrity
      const userCount = await this.getUserCount();
      const tableCount = await get("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'");
      console.log(`✅ Database initialized successfully:`);
      console.log(`   - ${userCount} users`);
      console.log(`   - ${tableCount.count} tables`);
      console.log(`   - Full feature set enabled`);
      
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  // Enhanced user methods
  async getUserCount() {
    const get = promisify(this.db.get.bind(this.db));
    const result = await get('SELECT COUNT(*) as count FROM users');
    return result.count;
  }

  async createUser(userData) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      console.log('🔄 Creating user:', userData.username);
      const result = await run(`
        INSERT INTO users (
          username, email, passwordHash, avatar, bio, phoneNumber,
          theme, language, notificationSettings, privacySettings
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userData.username, 
        userData.email, 
        userData.passwordHash, 
        userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username)}&background=1F3934&color=F3C883&size=128`,
        userData.bio || '',
        userData.phoneNumber || '',
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
      await run(`
        UPDATE users SET 
          isOnline = ?, 
          lastSeen = CURRENT_TIMESTAMP,
          updatedAt = CURRENT_TIMESTAMP
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
          values.push(profileData[key]);
        }
      });
      
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

  // Enhanced story methods
  async createStory(storyData) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      const result = await run(`
        INSERT INTO stories (
          userId, content, mediaUrl, mediaType, backgroundColor, textColor, 
          font, duration, allowReplies, allowSharing, music, filters, 
          stickers, location, expiresAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        storyData.userId,
        storyData.content || '',
        storyData.mediaUrl || null,
        storyData.mediaType || 'text',
        storyData.backgroundColor || '#1F3934',
        storyData.textColor || '#FFFFFF',
        storyData.font || 'default',
        storyData.duration || 10,
        storyData.allowReplies !== false ? 1 : 0,
        storyData.allowSharing !== false ? 1 : 0,
        storyData.music || null,
        JSON.stringify(storyData.filters || []),
        JSON.stringify(storyData.stickers || []),
        storyData.location || null,
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

  async viewStory(storyId, viewerId, viewDuration = 0, reactionType = null) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        INSERT OR REPLACE INTO story_views (storyId, viewerId, viewDuration, reactionType)
        VALUES (?, ?, ?, ?)
      `, [storyId, viewerId, viewDuration, reactionType]);
      
      await run(`
        UPDATE stories SET viewCount = viewCount + 1 WHERE id = ?
      `, [storyId]);
    } catch (error) {
      console.error('❌ Error viewing story:', error);
      throw error;
    }
  }

  // Enhanced message methods
  async createMessage(messageData) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      const result = await run(`
        INSERT INTO messages (
          chatId, senderId, content, type, fileUrl, fileName, fileSize, 
          fileMimeType, thumbnailUrl, replyToId, forwardedFromId, isPremium, 
          isEncrypted, animationType, metadata, mentions, hashtags, location, expiresAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        messageData.chatId,
        messageData.senderId,
        messageData.content,
        messageData.type || 'text',
        messageData.fileUrl || null,
        messageData.fileName || null,
        messageData.fileSize || null,
        messageData.fileMimeType || null,
        messageData.thumbnailUrl || null,
        messageData.replyToId || null,
        messageData.forwardedFromId || null,
        messageData.isPremium ? 1 : 0,
        messageData.isEncrypted ? 1 : 0,
        messageData.animationType || null,
        JSON.stringify(messageData.metadata || {}),
        JSON.stringify(messageData.mentions || []),
        JSON.stringify(messageData.hashtags || []),
        messageData.location || null,
        messageData.expiresAt || null
      ]);
      
      // Update chat last activity
      await run(`
        UPDATE chats SET lastActivity = CURRENT_TIMESTAMP WHERE id = ?
      `, [messageData.chatId]);
      
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
               rm.content as replyContent, ru.username as replyUsername,
               fm.content as forwardedContent, fu.username as forwardedUsername
        FROM messages m
        JOIN users u ON m.senderId = u.id
        LEFT JOIN messages rm ON m.replyToId = rm.id
        LEFT JOIN users ru ON rm.senderId = ru.id
        LEFT JOIN messages fm ON m.forwardedFromId = fm.id
        LEFT JOIN users fu ON fm.senderId = fu.id
        WHERE m.chatId = ? AND m.isDeleted = 0
        ORDER BY m.timestamp DESC
        LIMIT ? OFFSET ?
      `, [chatId, limit, offset]);
    } catch (error) {
      console.error('❌ Error getting chat messages:', error);
      throw error;
    }
  }

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
        ORDER BY mr.createdAt DESC
      `, [messageId]);
    } catch (error) {
      console.error('❌ Error getting message reactions:', error);
      throw error;
    }
  }

  // Enhanced chat methods
  async createChat(chatData) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      const result = await run(`
        INSERT INTO chats (
          name, description, isGroup, avatar, isPremium, wallpaper, 
          encryptionKey, createdBy
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
          (SELECT m.timestamp FROM messages m WHERE m.chatId = c.id AND m.isDeleted = 0 ORDER BY m.timestamp DESC LIMIT 1) as lastMessageTime,
          (SELECT u.username FROM messages m JOIN users u ON m.senderId = u.id WHERE m.chatId = c.id AND m.isDeleted = 0 ORDER BY m.timestamp DESC LIMIT 1) as lastMessageSender,
          (SELECT COUNT(*) FROM messages m WHERE m.chatId = c.id AND m.isDeleted = 0 AND JSON_EXTRACT(m.readBy, '$') NOT LIKE '%' || ? || '%') as unreadCount
        FROM chats c
        JOIN chat_participants cp ON c.id = cp.chatId
        WHERE cp.userId = ? AND cp.isActive = 1 AND c.isArchived = 0
        ORDER BY lastMessageTime DESC
      `, [userId, userId]);
    } catch (error) {
      console.error('❌ Error getting user chats:', error);
      throw error;
    }
  }

  async addChatParticipant(chatId, userId, role = 'member', permissions = {}) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        INSERT OR REPLACE INTO chat_participants (chatId, userId, role, permissions)
        VALUES (?, ?, ?, ?)
      `, [chatId, userId, role, JSON.stringify(permissions)]);
    } catch (error) {
      console.error('❌ Error adding chat participant:', error);
      throw error;
    }
  }

  // Enhanced call methods
  async createCall(callData) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      const result = await run(`
        INSERT INTO calls (
          chatId, initiatorId, participants, type, status, startedAt, isRecorded
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
      `, [
        callData.chatId, 
        callData.initiatorId, 
        JSON.stringify(callData.participants || []), 
        callData.type || 'voice', 
        'active',
        callData.isRecorded ? 1 : 0
      ]);
      return result;
    } catch (error) {
      console.error('❌ Error creating call:', error);
      throw error;
    }
  }

  async endCall(callId, duration, quality = 'good', recordingUrl = null) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        UPDATE calls SET 
          status = ?, 
          endedAt = CURRENT_TIMESTAMP, 
          duration = ?, 
          quality = ?,
          recordingUrl = ?
        WHERE id = ?
      `, ['ended', duration, quality, recordingUrl, callId]);
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

  // Future messages with enhanced features
  async createFutureMessage(messageData) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        INSERT INTO future_messages (
          chatId, senderId, content, type, fileUrl, scheduledFor, timezone,
          repeatType, repeatInterval, maxRepeats
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        messageData.chatId,
        messageData.senderId,
        messageData.content,
        messageData.type || 'text',
        messageData.fileUrl || null,
        messageData.scheduledFor,
        messageData.timezone || 'UTC',
        messageData.repeatType || null,
        messageData.repeatInterval || null,
        messageData.maxRepeats || null
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
        WHERE scheduledFor <= datetime('now') 
        AND sent = 0 
        AND cancelled = 0
        AND (maxRepeats IS NULL OR currentRepeats < maxRepeats)
      `);
    } catch (error) {
      console.error('❌ Error getting due messages:', error);
      throw error;
    }
  }

  async markFutureMessageSent(id) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        UPDATE future_messages SET 
          sent = 1, 
          sentAt = CURRENT_TIMESTAMP,
          currentRepeats = currentRepeats + 1
        WHERE id = ?
      `, [id]);
    } catch (error) {
      console.error('❌ Error marking future message sent:', error);
      throw error;
    }
  }

  // World Brain enhanced methods
  async createWorldBrainQuestion(question, askedBy, description = null, category = null, tags = []) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      const result = await run(`
        INSERT INTO world_brain_questions (
          question, description, category, tags, askedBy
        ) VALUES (?, ?, ?, ?, ?)
      `, [question, description, category, JSON.stringify(tags), askedBy]);
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
        ORDER BY q.priority DESC, q.createdAt DESC
      `);
    } catch (error) {
      console.error('❌ Error getting world brain questions:', error);
      throw error;
    }
  }

  async addWorldBrainAnswer(questionId, userId, answer, sources = [], confidence = 50) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        INSERT INTO world_brain_answers (
          questionId, userId, answer, sources, confidence
        ) VALUES (?, ?, ?, ?, ?)
      `, [questionId, userId, answer, JSON.stringify(sources), confidence]);
    } catch (error) {
      console.error('❌ Error adding world brain answer:', error);
      throw error;
    }
  }

  async getQuestionAnswers(questionId) {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(`
        SELECT a.*, u.username, u.avatar,
               v.username as verifierName
        FROM world_brain_answers a
        JOIN users u ON a.userId = u.id
        LEFT JOIN users v ON a.verifiedBy = v.id
        WHERE a.questionId = ?
        ORDER BY a.isVerified DESC, a.votes DESC, a.createdAt DESC
      `, [questionId]);
    } catch (error) {
      console.error('❌ Error getting question answers:', error);
      throw error;
    }
  }

  async voteAnswer(answerId, vote) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      if (vote > 0) {
        await run('UPDATE world_brain_answers SET upvotes = upvotes + 1, votes = votes + 1 WHERE id = ?', [answerId]);
      } else {
        await run('UPDATE world_brain_answers SET downvotes = downvotes + 1, votes = votes - 1 WHERE id = ?', [answerId]);
      }
    } catch (error) {
      console.error('❌ Error voting answer:', error);
      throw error;
    }
  }

  // AGI Companion enhanced methods
  async saveAGIConversation(userId, message, response, context = {}, mood = null, topics = [], sentiment = null, model = null, tokens = 0) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        INSERT INTO agi_conversations (
          userId, sessionId, message, response, context, mood, topics, 
          sentiment, model, tokens
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId, 
        context.sessionId || 'default',
        message, 
        response, 
        JSON.stringify(context),
        mood,
        JSON.stringify(topics),
        sentiment,
        model,
        tokens
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

  // Settings methods
  async getSetting(category, key) {
    const get = promisify(this.db.get.bind(this.db));
    try {
      const result = await get(`
        SELECT value FROM system_settings 
        WHERE category = ? AND key = ?
      `, [category, key]);
      return result?.value;
    } catch (error) {
      console.error('❌ Error getting setting:', error);
      throw error;
    }
  }

  async setSetting(category, key, value, description = null) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        INSERT OR REPLACE INTO system_settings (category, key, value, description, updatedAt)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [category, key, value, description]);
    } catch (error) {
      console.error('❌ Error setting setting:', error);
      throw error;
    }
  }

  async getUserSetting(userId, category, key, defaultValue = null) {
    const get = promisify(this.db.get.bind(this.db));
    try {
      const result = await get(`
        SELECT settingValue FROM user_settings 
        WHERE userId = ? AND category = ? AND settingKey = ?
      `, [userId, category, key]);
      return result ? result.settingValue : defaultValue;
    } catch (error) {
      console.error('❌ Error getting user setting:', error);
      return defaultValue;
    }
  }

  async setUserSetting(userId, category, key, value, isEncrypted = false) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        INSERT OR REPLACE INTO user_settings (
          userId, category, settingKey, settingValue, isEncrypted, updatedAt
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [userId, category, key, value, isEncrypted ? 1 : 0]);
    } catch (error) {
      console.error('❌ Error setting user setting:', error);
      throw error;
    }
  }

  // Admin methods
  async getAllUsers() {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(`
        SELECT id, username, email, role, isOnline, lastSeen, status, bio, 
               phoneNumber, emailVerified, phoneVerified, createdAt, updatedAt 
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
      // Soft delete - mark as deleted but keep data for integrity
      await run(`
        UPDATE users SET 
          isOnline = 0,
          status = 'deleted',
          updatedAt = CURRENT_TIMESTAMP
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
        UPDATE users SET 
          role = ?, 
          updatedAt = CURRENT_TIMESTAMP 
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
      const userCount = await get('SELECT COUNT(*) as count FROM users WHERE status != "deleted"');
      const messageCount = await get('SELECT COUNT(*) as count FROM messages WHERE isDeleted = 0');
      const chatCount = await get('SELECT COUNT(*) as count FROM chats WHERE isArchived = 0');
      const onlineUsers = await get('SELECT COUNT(*) as count FROM users WHERE isOnline = 1');
      const storyCount = await get('SELECT COUNT(*) as count FROM stories WHERE isActive = 1');
      const callCount = await get('SELECT COUNT(*) as count FROM calls WHERE status = "ended"');
      const questionCount = await get('SELECT COUNT(*) as count FROM world_brain_questions');
      const answerCount = await get('SELECT COUNT(*) as count FROM world_brain_answers');
      
      return {
        users: userCount.count,
        messages: messageCount.count,
        chats: chatCount.count,
        onlineUsers: onlineUsers.count,
        stories: storyCount.count,
        calls: callCount.count,
        questions: questionCount.count,
        answers: answerCount.count
      };
    } catch (error) {
      console.error('❌ Error getting system stats:', error);
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

  async getUserNotifications(userId, limit = 50) {
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
        UPDATE notifications SET 
          isRead = 1, 
          readAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [notificationId]);
    } catch (error) {
      console.error('❌ Error marking notification read:', error);
      throw error;
    }
  }

  // Analytics methods
  async logEvent(userId, eventType, eventData = {}, sessionId = null) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        INSERT INTO analytics_events (userId, eventType, eventData, sessionId)
        VALUES (?, ?, ?, ?)
      `, [userId, eventType, JSON.stringify(eventData), sessionId]);
    } catch (error) {
      console.error('❌ Error logging event:', error);
      throw error;
    }
  }

  // Search methods
  async searchMessages(userId, query, limit = 20) {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(`
        SELECT m.*, u.username, c.name as chatName
        FROM messages m
        JOIN users u ON m.senderId = u.id
        JOIN chats c ON m.chatId = c.id
        JOIN chat_participants cp ON m.chatId = cp.chatId
        WHERE cp.userId = ? 
        AND cp.isActive = 1
        AND m.isDeleted = 0
        AND (m.content LIKE ? OR m.fileName LIKE ?)
        ORDER BY m.timestamp DESC
        LIMIT ?
      `, [userId, `%${query}%`, `%${query}%`, limit]);
    } catch (error) {
      console.error('❌ Error searching messages:', error);
      throw error;
    }
  }

  async searchUsers(query, limit = 10) {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(`
        SELECT id, username, email, avatar, bio, status
        FROM users 
        WHERE status != 'deleted'
        AND (username LIKE ? OR email LIKE ? OR bio LIKE ?)
        ORDER BY username
        LIMIT ?
      `, [`%${query}%`, `%${query}%`, `%${query}%`, limit]);
    } catch (error) {
      console.error('❌ Error searching users:', error);
      throw error;
    }
  }

  // Contact methods
  async addContact(userId, contactUserId, displayName = null, relationship = 'contact') {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        INSERT OR REPLACE INTO contacts (
          userId, contactUserId, displayName, relationship
        ) VALUES (?, ?, ?, ?)
      `, [userId, contactUserId, displayName, relationship]);
    } catch (error) {
      console.error('❌ Error adding contact:', error);
      throw error;
    }
  }

  async getUserContacts(userId) {
    const all = promisify(this.db.all.bind(this.db));
    try {
      return await all(`
        SELECT c.*, u.username, u.avatar, u.status, u.isOnline, u.lastSeen
        FROM contacts c
        JOIN users u ON c.contactUserId = u.id
        WHERE c.userId = ? AND c.isBlocked = 0
        ORDER BY c.isFavorite DESC, u.username
      `, [userId]);
    } catch (error) {
      console.error('❌ Error getting user contacts:', error);
      throw error;
    }
  }

  // Session management
  async createSession(userId, sessionToken, deviceInfo, ipAddress, userAgent) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

      await run(`
        INSERT INTO user_sessions (
          userId, sessionToken, deviceInfo, ipAddress, userAgent, expiresAt
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [userId, sessionToken, deviceInfo, ipAddress, userAgent, expiresAt.toISOString()]);
    } catch (error) {
      console.error('❌ Error creating session:', error);
      throw error;
    }
  }

  async validateSession(sessionToken) {
    const get = promisify(this.db.get.bind(this.db));
    try {
      return await get(`
        SELECT s.*, u.username, u.role
        FROM user_sessions s
        JOIN users u ON s.userId = u.id
        WHERE s.sessionToken = ? 
        AND s.isActive = 1 
        AND s.expiresAt > datetime('now')
      `, [sessionToken]);
    } catch (error) {
      console.error('❌ Error validating session:', error);
      throw error;
    }
  }

  async updateSessionActivity(sessionToken) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        UPDATE user_sessions SET 
          lastActivity = CURRENT_TIMESTAMP 
        WHERE sessionToken = ?
      `, [sessionToken]);
    } catch (error) {
      console.error('❌ Error updating session activity:', error);
      throw error;
    }
  }

  async revokeSession(sessionToken) {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        UPDATE user_sessions SET 
          isActive = 0 
        WHERE sessionToken = ?
      `, [sessionToken]);
    } catch (error) {
      console.error('❌ Error revoking session:', error);
      throw error;
    }
  }
}