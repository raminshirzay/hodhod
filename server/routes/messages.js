import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Enhanced file storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    
    // Create subdirectories based on file type
    let subDir = 'files/';
    if (file.mimetype.startsWith('image/')) {
      subDir = 'images/';
    } else if (file.mimetype.startsWith('video/')) {
      subDir = 'videos/';
    } else if (file.mimetype.startsWith('audio/')) {
      subDir = 'audio/';
    } else if (file.mimetype.includes('pdf')) {
      subDir = 'documents/';
    }
    
    const fullPath = uploadDir + subDir;
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    // Generate secure filename
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Enhanced file filtering
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mpeg',
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'application/zip', 'application/x-zip-compressed'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 5 // Maximum 5 files per upload
  }
});

export function messageRouter(db, io) {
  const router = express.Router();

  // Enhanced get chat messages with pagination and filtering
  router.get('/chat/:chatId', async (req, res) => {
    try {
      const chatId = parseInt(req.params.chatId);
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const type = req.query.type; // Filter by message type
      const search = req.query.search; // Search in messages
      
      console.log(`🔍 Getting messages for chat ${chatId}, limit: ${limit}, offset: ${offset}`);
      
      let messages;
      if (search) {
        // Search messages
        messages = await db.searchMessages(req.user?.id || 1, search, limit);
        messages = messages.filter(m => m.chatId === chatId);
      } else {
        messages = await db.getChatMessages(chatId, limit, offset);
      }
      
      // Get reactions for each message
      for (let message of messages) {
        message.reactions = await db.getMessageReactions(message.id);
        message.metadata = JSON.parse(message.metadata || '{}');
        message.mentions = JSON.parse(message.mentions || '[]');
        message.hashtags = JSON.parse(message.hashtags || '[]');
      }
      
      console.log(`✅ Retrieved ${messages.length} messages`);
      res.json({
        success: true,
        messages,
        pagination: {
          limit,
          offset,
          hasMore: messages.length === limit
        }
      });
    } catch (error) {
      console.error('❌ Error getting chat messages:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to retrieve messages',
        error: error.message 
      });
    }
  });

  // Enhanced file upload with multiple files and metadata
  router.post('/upload', upload.array('files', 5), async (req, res) => {
    try {
      console.log('📁 Enhanced file upload request');
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ 
          success: false,
          message: 'No files uploaded',
          code: 'NO_FILES'
        });
      }
      
      const uploadedFiles = [];
      
      for (const file of req.files) {
        console.log(`📄 Processing file: ${file.originalname}`);
        
        // Generate thumbnail for images and videos
        let thumbnailUrl = null;
        if (file.mimetype.startsWith('image/')) {
          // In a real implementation, you'd generate thumbnails here
          thumbnailUrl = `/uploads/thumbnails/thumb_${file.filename}`;
        }
        
        // Calculate file checksum for integrity
        const fileBuffer = fs.readFileSync(file.path);
        const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        
        const fileData = {
          fileName: file.filename,
          originalName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          fileUrl: `/${file.path.replace(/\\/g, '/')}`,
          thumbnailUrl,
          checksum,
          uploadedAt: new Date().toISOString()
        };
        
        uploadedFiles.push(fileData);
        console.log(`✅ File processed: ${file.originalname}`);
      }
      
      res.json({
        success: true,
        message: `${uploadedFiles.length} file(s) uploaded successfully`,
        files: uploadedFiles
      });
    } catch (error) {
      console.error('❌ Enhanced upload error:', error);
      res.status(500).json({ 
        success: false,
        message: 'File upload failed',
        error: error.message 
      });
    }
  });

  // Enhanced create chat with comprehensive features
  router.post('/chat', async (req, res) => {
    try {
      console.log('💬 Enhanced chat creation request');
      const { 
        name, 
        description, 
        isGroup, 
        participants, 
        createdBy, 
        isPremium, 
        wallpaper,
        encryptionEnabled 
      } = req.body;
      
      // Validation
      if (!createdBy) {
        return res.status(400).json({ 
          success: false,
          message: 'Creator ID is required',
          code: 'MISSING_CREATOR'
        });
      }
      
      if (isGroup && (!name || name.trim().length === 0)) {
        return res.status(400).json({ 
          success: false,
          message: 'Group name is required',
          code: 'MISSING_GROUP_NAME'
        });
      }
      
      // Generate encryption key if enabled
      let encryptionKey = null;
      if (encryptionEnabled) {
        encryptionKey = crypto.randomBytes(32).toString('hex');
      }
      
      const chat = await db.createChat({
        name: name?.trim(),
        description: description?.trim(),
        isGroup: !!isGroup,
        avatar: isGroup ? `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1F3934&color=F3C883&size=128` : null,
        isPremium: !!isPremium,
        wallpaper,
        encryptionKey,
        createdBy
      });
      
      console.log(`✅ Chat created with ID: ${chat.lastID}`);
      
      // Add creator as admin
      await db.addChatParticipant(chat.lastID, createdBy, 'admin', {
        canAddMembers: true,
        canRemoveMembers: true,
        canEditInfo: true,
        canDeleteMessages: true
      });
      
      // Add other participants
      if (participants && participants.length > 0) {
        for (const participantId of participants) {
          if (participantId !== createdBy) {
            await db.addChatParticipant(chat.lastID, participantId, 'member', {
              canAddMembers: false,
              canRemoveMembers: false,
              canEditInfo: false,
              canDeleteMessages: false
            });
            
            // Create notification for new participant
            await db.createNotification(
              participantId,
              'chat_invitation',
              'New Chat Invitation',
              `You've been added to ${isGroup ? `the group "${name}"` : 'a new chat'}`,
              { chatId: chat.lastID, invitedBy: createdBy }
            );
          }
        }
      }
      
      // Log chat creation
      await db.logEvent(createdBy, 'chat_created', {
        chatId: chat.lastID,
        isGroup,
        participantCount: (participants?.length || 0) + 1
      });
      
      res.status(201).json({ 
        success: true,
        message: 'Chat created successfully',
        chatId: chat.lastID,
        encryptionEnabled: !!encryptionEnabled
      });
    } catch (error) {
      console.error('❌ Enhanced chat creation error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to create chat',
        error: error.message 
      });
    }
  });

  // Enhanced get user chats with comprehensive data
  router.get('/chats/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const archived = req.query.archived === 'true';
      const muted = req.query.muted === 'true';
      
      console.log(`📋 Getting chats for user ${userId}`);
      
      let chats = await db.getUserChats(userId);
      
      // Filter based on query parameters
      if (archived) {
        chats = chats.filter(chat => chat.isArchived);
      } else {
        chats = chats.filter(chat => !chat.isArchived);
      }
      
      if (muted) {
        chats = chats.filter(chat => chat.isMuted);
      }
      
      // Enhance chat data
      for (let chat of chats) {
        // Get participant count for groups
        if (chat.isGroup) {
          const participants = await db.getChatParticipants(chat.id);
          chat.participantCount = participants.length;
          chat.participants = participants.slice(0, 5); // First 5 for preview
        }
        
        // Parse metadata
        chat.lastMessageTime = chat.lastMessageTime ? new Date(chat.lastMessageTime).toISOString() : null;
      }
      
      console.log(`✅ Retrieved ${chats.length} chats`);
      res.json({
        success: true,
        chats
      });
    } catch (error) {
      console.error('❌ Error getting user chats:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to retrieve chats',
        error: error.message 
      });
    }
  });

  // Enhanced send message with comprehensive features
  router.post('/send', async (req, res) => {
    try {
      console.log('📤 Enhanced message send request');
      const {
        chatId,
        senderId,
        content,
        type = 'text',
        fileUrl,
        fileName,
        fileSize,
        fileMimeType,
        replyToId,
        forwardedFromId,
        mentions = [],
        hashtags = [],
        location,
        expiresAt,
        animationType,
        metadata = {}
      } = req.body;
      
      // Validation
      if (!chatId || !senderId) {
        return res.status(400).json({
          success: false,
          message: 'Chat ID and sender ID are required',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }
      
      if (!content && !fileUrl) {
        return res.status(400).json({
          success: false,
          message: 'Message content or file is required',
          code: 'EMPTY_MESSAGE'
        });
      }
      
      // Check if user is participant of the chat
      const userChats = await db.getUserChats(senderId);
      const isParticipant = userChats.some(chat => chat.id === chatId);
      
      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: 'You are not a participant of this chat',
          code: 'NOT_PARTICIPANT'
        });
      }
      
      // Process mentions and hashtags
      const processedMentions = mentions.filter(mention => typeof mention === 'number');
      const processedHashtags = hashtags.filter(tag => typeof tag === 'string' && tag.startsWith('#'));
      
      // Create message
      const messageData = {
        chatId,
        senderId,
        content: content?.trim(),
        type,
        fileUrl,
        fileName,
        fileSize,
        fileMimeType,
        replyToId,
        forwardedFromId,
        mentions: processedMentions,
        hashtags: processedHashtags,
        location,
        expiresAt,
        animationType,
        metadata: {
          ...metadata,
          clientTimestamp: new Date().toISOString(),
          platform: req.headers['user-agent'] || 'unknown'
        }
      };
      
      const result = await db.createMessage(messageData);
      console.log(`✅ Message created with ID: ${result.lastID}`);
      
      // Get sender info for real-time broadcast
      const sender = await db.getUserById(senderId);
      
      // Prepare message for broadcast
      const broadcastMessage = {
        id: result.lastID,
        chatId,
        senderId,
        username: sender.username,
        userAvatar: sender.avatar,
        content: content?.trim(),
        type,
        fileUrl,
        fileName,
        fileSize,
        fileMimeType,
        replyToId,
        forwardedFromId,
        mentions: processedMentions,
        hashtags: processedHashtags,
        location,
        animationType,
        metadata: messageData.metadata,
        timestamp: new Date().toISOString()
      };
      
      // Broadcast to chat participants
      io.to(`chat_${chatId}`).emit('new_message', broadcastMessage);
      
      // Send notifications to mentioned users
      for (const mentionedUserId of processedMentions) {
        if (mentionedUserId !== senderId) {
          await db.createNotification(
            mentionedUserId,
            'mention',
            'You were mentioned',
            `${sender.username} mentioned you in a message`,
            { chatId, messageId: result.lastID }
          );
          
          io.to(`user_${mentionedUserId}`).emit('notification', {
            type: 'mention',
            title: 'You were mentioned',
            message: `${sender.username} mentioned you`,
            chatId,
            messageId: result.lastID
          });
        }
      }
      
      // Log message sent event
      await db.logEvent(senderId, 'message_sent', {
        chatId,
        messageId: result.lastID,
        type,
        hasFile: !!fileUrl,
        hasMentions: processedMentions.length > 0,
        hasHashtags: processedHashtags.length > 0
      });
      
      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        messageId: result.lastID,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Enhanced message send error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send message',
        error: error.message
      });
    }
  });

  // Add message reaction
  router.post('/react', async (req, res) => {
    try {
      const { messageId, userId, reaction } = req.body;
      
      if (!messageId || !userId || !reaction) {
        return res.status(400).json({
          success: false,
          message: 'Message ID, user ID, and reaction are required'
        });
      }
      
      await db.addMessageReaction(messageId, userId, reaction);
      
      // Get updated reactions
      const reactions = await db.getMessageReactions(messageId);
      
      // Broadcast reaction update
      const message = await db.getMessageById(messageId);
      if (message) {
        io.to(`chat_${message.chatId}`).emit('message_reaction', {
          messageId,
          reactions,
          userId,
          reaction
        });
      }
      
      res.json({
        success: true,
        message: 'Reaction added successfully',
        reactions
      });
    } catch (error) {
      console.error('❌ Error adding reaction:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add reaction',
        error: error.message
      });
    }
  });

  // Edit message
  router.put('/edit/:messageId', async (req, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const { content, userId } = req.body;
      
      if (!content || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Content and user ID are required'
        });
      }
      
      // Check if user owns the message
      const message = await db.getMessageById(messageId);
      if (!message || message.senderId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only edit your own messages'
        });
      }
      
      await db.editMessage(messageId, content.trim());
      
      // Broadcast edit
      io.to(`chat_${message.chatId}`).emit('message_edited', {
        messageId,
        content: content.trim(),
        editedAt: new Date().toISOString()
      });
      
      res.json({
        success: true,
        message: 'Message edited successfully'
      });
    } catch (error) {
      console.error('❌ Error editing message:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to edit message',
        error: error.message
      });
    }
  });

  // Delete message
  router.delete('/:messageId', async (req, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }
      
      // Check if user owns the message or has admin rights
      const message = await db.getMessageById(messageId);
      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found'
        });
      }
      
      const canDelete = message.senderId === userId; // Add admin check later
      
      if (!canDelete) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own messages'
        });
      }
      
      await db.deleteMessage(messageId);
      
      // Broadcast deletion
      io.to(`chat_${message.chatId}`).emit('message_deleted', {
        messageId,
        deletedAt: new Date().toISOString()
      });
      
      res.json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error) {
      console.error('❌ Error deleting message:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete message',
        error: error.message
      });
    }
  });

  // Search messages
  router.get('/search', async (req, res) => {
    try {
      const { q: query, userId, chatId, type, limit = 20 } = req.query;
      
      if (!query || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Search query and user ID are required'
        });
      }
      
      let results = await db.searchMessages(parseInt(userId), query, parseInt(limit));
      
      // Filter by chat if specified
      if (chatId) {
        results = results.filter(msg => msg.chatId === parseInt(chatId));
      }
      
      // Filter by type if specified
      if (type) {
        results = results.filter(msg => msg.type === type);
      }
      
      res.json({
        success: true,
        results,
        query,
        count: results.length
      });
    } catch (error) {
      console.error('❌ Error searching messages:', error);
      res.status(500).json({
        success: false,
        message: 'Search failed',
        error: error.message
      });
    }
  });

  return router;
}