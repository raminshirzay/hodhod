import express from 'express';

export function callRouter(db, io) {
  const router = express.Router();

  // Start a call
  router.post('/start', async (req, res) => {
    try {
      const { chatId, initiatorId, participants, type } = req.body;
      
      const call = await db.createCall({
        chatId,
        initiatorId,
        participants,
        type: type || 'voice'
      });

      // Notify all participants
      participants.forEach((participantId) => {
        io.to(`user_${participantId}`).emit('incoming_call', {
          callId: call.lastID,
          chatId,
          initiatorId,
          type,
          participants
        });
      });

      res.status(201).json({ callId: call.lastID, message: 'Call started' });
    } catch (error) {
      console.error('Error starting call:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // End a call
  router.post('/:callId/end', async (req, res) => {
    try {
      const callId = parseInt(req.params.callId);
      const { duration } = req.body;
      
      await db.endCall(callId, duration);
      
      // Notify all participants that call ended
      io.emit('call_ended', { callId });
      
      res.json({ message: 'Call ended' });
    } catch (error) {
      console.error('Error ending call:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Join call
  router.post('/:callId/join', async (req, res) => {
    try {
      const callId = parseInt(req.params.callId);
      const { userId } = req.body;
      
      // Notify other participants
      io.emit('user_joined_call', { callId, userId });
      
      res.json({ message: 'Joined call' });
    } catch (error) {
      console.error('Error joining call:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
}