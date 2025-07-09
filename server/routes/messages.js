import express from 'express';
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

export function messageRouter(db, io) {
  const router = express.Router();

  // Get chat messages
  router.get('/chat/:chatId', async (req, res) => {
    try {
      const chatId = parseInt(req.params.chatId);
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      
      const messages = await db.getChatMessages(chatId, limit, offset);
      res.json(messages);
    } catch (error) {
      console.error('Error getting chat messages:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Upload file
  router.post('/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      res.json({
        fileName: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        fileUrl: `/uploads/${req.file.filename}`
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: 'Upload failed' });
    }
  });

  // Create chat
  router.post('/chat', async (req, res) => {
    try {
      const { name, description, isGroup, participants, createdBy } = req.body;
      
      const chat = await db.createChat({
        name,
        description,
        isGroup,
        avatar: isGroup ? `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1F3934&color=F3C883` : null,
        createdBy
      });
      
      // Add creator as participant
      await db.addChatParticipant(chat.lastID, createdBy, 'admin');
      
      // Add other participants
      if (participants && participants.length > 0) {
        for (const participantId of participants) {
          await db.addChatParticipant(chat.lastID, participantId);
        }
      }
      
      res.status(201).json({ id: chat.lastID, message: 'Chat created successfully' });
    } catch (error) {
      console.error('Error creating chat:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get user chats
  router.get('/chats/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const chats = await db.getUserChats(userId);
      res.json(chats);
    } catch (error) {
      console.error('Error getting user chats:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
}