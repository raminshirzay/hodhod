import express from 'express';

export function futureMessagesRouter(db, io) {
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
      console.error('Error scheduling message:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
}