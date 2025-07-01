import express from 'express';
import { Database } from '../database.js';
import { Server } from 'socket.io';

export function futureMessagesRouter(db: Database, io: Server) {
  const router = express.Router();

  // Schedule future message
  router.post('/schedule', async (req, res) => {
    try {
      const { chatId, senderId, content, scheduledFor } = req.body;
      
      await db.createFutureMessage({
        chatId,
        senderId,
        content,
        scheduledFor
      });
      
      res.status(201).json({ message: 'Message scheduled successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
}