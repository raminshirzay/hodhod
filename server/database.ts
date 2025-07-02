import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import bcrypt from 'bcryptjs';

export class Database {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3.Database('database.sqlite');
  }

  async init() {
    const run = promisify(this.db.run.bind(this.db));
    
    // Users table
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        avatar TEXT,
        isOnline BOOLEAN DEFAULT 0,
        lastSeen DATETIME DEFAULT CURRENT_TIMESTAMP,
        twinEnabled BOOLEAN DEFAULT 0,
        twinPersonality TEXT,
        premiumUntil DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Chats table
    await run(`
      CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        description TEXT,
        isGroup BOOLEAN DEFAULT 0,
        avatar TEXT,
        isPremium BOOLEAN DEFAULT 0,
        createdBy INTEGER,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (createdBy) REFERENCES users(id)
      )
    `);

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
        isPremium BOOLEAN DEFAULT 0,
        animationType TEXT,
        metadata TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chatId) REFERENCES chats(id),
        FOREIGN KEY (senderId) REFERENCES users(id),
        FOREIGN KEY (replyToId) REFERENCES messages(id)
      )
    `);

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

    // Future messages table
    await run(`
      CREATE TABLE IF NOT EXISTS future_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chatId INTEGER,
        senderId INTEGER,
        content TEXT NOT NULL,
        scheduledFor DATETIME NOT NULL,
        sent BOOLEAN DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chatId) REFERENCES chats(id),
        FOREIGN KEY (senderId) REFERENCES users(id)
      )
    `);

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

    // System settings
    await run(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

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

    // Create admin user with proper password hash
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    await run(`
      INSERT OR IGNORE INTO users (username, email, passwordHash, role)
      VALUES ('admin', 'admin@hodhod.com', ?, 'admin')
    `, [adminPasswordHash]);

    // Insert AI user for responses
    await run(`
      INSERT OR IGNORE INTO users (id, username, email, passwordHash, role, avatar)
      VALUES (999, 'HodhodAI', 'ai@hodhod.com', 'no-password', 'ai', 'https://ui-avatars.com/api/?name=AI&background=F3C883&color=1F3934')
    `);

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

    console.log('✅ Database initialized successfully');
  }

  // User methods
  async createUser(userData: any) {
    const run = promisify(this.db.run.bind(this.db));
    const result = await run(
      'INSERT INTO users (username, email, passwordHash, avatar) VALUES (?, ?, ?, ?)',
      [userData.username, userData.email, userData.passwordHash, userData.avatar ?? null]
    );
    return result;
  }

  async getUserByEmail(email: string) {
    const get = promisify(this.db.get.bind(this.db));
    return await get('SELECT * FROM users WHERE email = ?', [email]);
  }

  async getUserById(id: number) {
    const get = promisify(this.db.get.bind(this.db));
    return await get('SELECT * FROM users WHERE id = ?', [id]);
  }

  async updateUserStatus(userId: number, isOnline: boolean) {
    const run = promisify(this.db.run.bind(this.db));
    await run(
      'UPDATE users SET isOnline = ?, lastSeen = CURRENT_TIMESTAMP WHERE id = ?',
      [isOnline, userId]
    );
  }

  async updateUserTwin(userId: number, twinEnabled: boolean, twinPersonality?: string) {
    const run = promisify(this.db.run.bind(this.db));
    await run(
      'UPDATE users SET twinEnabled = ?, twinPersonality = ? WHERE id = ?',
      [twinEnabled, twinPersonality ?? null, userId]
    );
  }

  // Chat methods
  async createChat(chatData: any) {
    const run = promisify(this.db.run.bind(this.db));
    const result = await run(
      'INSERT INTO chats (name, description, isGroup, avatar, isPremium, createdBy) VALUES (?, ?, ?, ?, ?, ?)',
      [chatData.name ?? null, chatData.description ?? null, chatData.isGroup ?? false, chatData.avatar ?? null, chatData.isPremium ?? false, chatData.createdBy]
    );
    return result;
  }

  async getUserChats(userId: number) {
    const all = promisify(this.db.all.bind(this.db));
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
  }

  async addChatParticipant(chatId: number, userId: number, role: string = 'member') {
    const run = promisify(this.db.run.bind(this.db));
    await run(
      'INSERT OR IGNORE INTO chat_participants (chatId, userId, role) VALUES (?, ?, ?)',
      [chatId, userId, role]
    );
  }

  // Message methods
  async createMessage(messageData: any) {
    const run = promisify(this.db.run.bind(this.db));
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
        messageData.isPremium ?? false,
        messageData.animationType ?? null,
        JSON.stringify(messageData.metadata ?? {})
      ]
    );
    return result;
  }

  async getChatMessages(chatId: number, limit: number = 50, offset: number = 0) {
    const all = promisify(this.db.all.bind(this.db));
    return await all(`
      SELECT m.*, u.username, u.avatar as userAvatar
      FROM messages m
      JOIN users u ON m.senderId = u.id
      WHERE m.chatId = ?
      ORDER BY m.timestamp DESC
      LIMIT ? OFFSET ?
    `, [chatId, limit, offset]);
  }

  // Call methods
  async createCall(callData: any) {
    const run = promisify(this.db.run.bind(this.db));
    const result = await run(
      'INSERT INTO calls (chatId, initiatorId, participants, type, status, startedAt) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [callData.chatId, callData.initiatorId, JSON.stringify(callData.participants ?? []), callData.type ?? 'voice', 'active']
    );
    return result;
  }

  async endCall(callId: number, duration: number) {
    const run = promisify(this.db.run.bind(this.db));
    await run(
      'UPDATE calls SET status = ?, endedAt = CURRENT_TIMESTAMP, duration = ? WHERE id = ?',
      ['ended', duration, callId]
    );
  }

  // Future messages
  async createFutureMessage(messageData: any) {
    const run = promisify(this.db.run.bind(this.db));
    await run(
      'INSERT INTO future_messages (chatId, senderId, content, scheduledFor) VALUES (?, ?, ?, ?)',
      [messageData.chatId, messageData.senderId, messageData.content, messageData.scheduledFor]
    );
  }

  async getDueMessages() {
    const all = promisify(this.db.all.bind(this.db));
    return await all(
      'SELECT * FROM future_messages WHERE scheduledFor <= datetime("now") AND sent = 0'
    );
  }

  async markFutureMessageSent(id: number) {
    const run = promisify(this.db.run.bind(this.db));
    await run('UPDATE future_messages SET sent = 1 WHERE id = ?', [id]);
  }

  // AGI Companion
  async saveAGIConversation(userId: number, message: string, response: string) {
    const run = promisify(this.db.run.bind(this.db));
    await run(
      'INSERT INTO agi_conversations (userId, message, response) VALUES (?, ?, ?)',
      [userId, message, response]
    );
  }

  async getAGIHistory(userId: number, limit: number = 10) {
    const all = promisify(this.db.all.bind(this.db));
    return await all(
      'SELECT * FROM agi_conversations WHERE userId = ? ORDER BY timestamp DESC LIMIT ?',
      [userId, limit]
    );
  }

  // Settings
  async getSetting(key: string) {
    const get = promisify(this.db.get.bind(this.db));
    const result = await get('SELECT value FROM system_settings WHERE key = ?', [key]);
    return result?.value;
  }

  async setSetting(key: string, value: string) {
    const run = promisify(this.db.run.bind(this.db));
    await run(
      'INSERT OR REPLACE INTO system_settings (key, value, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP)',
      [key, value]
    );
  }

  // World Brain methods
  async createWorldBrainQuestion(question: string, askedBy: number) {
    const run = promisify(this.db.run.bind(this.db));
    const result = await run(
      'INSERT INTO world_brain_questions (question, askedBy) VALUES (?, ?)',
      [question, askedBy]
    );
    return result;
  }

  async getWorldBrainQuestions() {
    const all = promisify(this.db.all.bind(this.db));
    return await all(`
      SELECT q.*, u.username as askedByUsername,
        (SELECT COUNT(*) FROM world_brain_answers a WHERE a.questionId = q.id) as answerCount
      FROM world_brain_questions q
      JOIN users u ON q.askedBy = u.id
      ORDER BY q.createdAt DESC
    `);
  }

  async addWorldBrainAnswer(questionId: number, userId: number, answer: string) {
    const run = promisify(this.db.run.bind(this.db));
    await run(
      'INSERT INTO world_brain_answers (questionId, userId, answer) VALUES (?, ?, ?)',
      [questionId, userId, answer]
    );
  }

  async getQuestionAnswers(questionId: number) {
    const all = promisify(this.db.all.bind(this.db));
    return await all(`
      SELECT a.*, u.username
      FROM world_brain_answers a
      JOIN users u ON a.userId = u.id
      WHERE a.questionId = ?
      ORDER BY a.votes DESC, a.createdAt DESC
    `, [questionId]);
  }

  async voteAnswer(answerId: number, vote: number) {
    const run = promisify(this.db.run.bind(this.db));
    await run('UPDATE world_brain_answers SET votes = votes + ? WHERE id = ?', [vote, answerId]);
  }

  // Memory methods
  async searchMemory(userId: number, query: string) {
    const all = promisify(this.db.all.bind(this.db));
    return await all(`
      SELECT m.*, u.username
      FROM messages m
      JOIN users u ON m.senderId = u.id
      JOIN chat_participants cp ON m.chatId = cp.chatId
      WHERE cp.userId = ? AND m.content LIKE ?
      ORDER BY m.timestamp DESC
      LIMIT 10
    `, [userId, `%${query}%`]);
  }

  async getAllUsers() {
    const all = promisify(this.db.all.bind(this.db));
    return await all('SELECT id, username, email, role, isOnline, lastSeen, createdAt FROM users ORDER BY createdAt DESC');
  }

  async deleteUser(userId: number) {
    const run = promisify(this.db.run.bind(this.db));
    await run('DELETE FROM users WHERE id = ?', [userId]);
  }

  async updateUserRole(userId: number, role: string) {
    const run = promisify(this.db.run.bind(this.db));
    await run('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
  }

  async getSystemStats() {
    const get = promisify(this.db.get.bind(this.db));
    
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
  }

  // Transaction methods
  async createTransaction(transactionData: any) {
    const run = promisify(this.db.run.bind(this.db));
    const result = await run(
      'INSERT INTO transactions (userId, amount, currency, status, stripePaymentId, description) VALUES (?, ?, ?, ?, ?, ?)',
      [transactionData.userId, transactionData.amount, transactionData.currency ?? 'USD', transactionData.status ?? 'pending', transactionData.stripePaymentId ?? null, transactionData.description ?? null]
    );
    return result;
  }

  async updateTransaction(transactionId: number, status: string) {
    const run = promisify(this.db.run.bind(this.db));
    await run('UPDATE transactions SET status = ? WHERE id = ?', [status, transactionId]);
  }
}