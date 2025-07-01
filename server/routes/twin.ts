import express from 'express';
import { Database } from '../database.js';

export function twinRouter(db: Database) {
  const router = express.Router();

  // Update twin settings
  router.put('/settings', async (req, res) => {
    try {
      const { userId, twinEnabled, twinPersonality } = req.body;
      
      await db.updateUserTwin(userId, twinEnabled, twinPersonality);
      
      res.json({ message: 'Twin settings updated' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get twin response
  router.post('/respond', async (req, res) => {
    try {
      const { userId, message, chatId } = req.body;
      
      // Get user's twin personality
      const user = await db.getUserById(userId);
      if (!user || !user.twinEnabled) {
        return res.status(400).json({ message: 'Twin not enabled' });
      }

      // Get recent messages for context
      const recentMessages = await db.getChatMessages(chatId, 5);
      
      const apiKey = await db.getSetting('openrouter_api_key');
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://hodhod.com',
          'X-Title': 'Hodhod Messenger'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.2-1b-instruct:free',
          messages: [
            {
              role: 'system',
              content: `You are ${user.username}'s digital twin. Respond as if you are them based on their personality: ${user.twinPersonality || 'Friendly and helpful'}. Use their communication style and preferences.`
            },
            ...recentMessages.reverse().map(msg => ({
              role: msg.senderId === userId ? 'assistant' : 'user',
              content: msg.content
            })),
            {
              role: 'user',
              content: message
            }
          ]
        })
      });

      if (response.ok) {
        const aiResponse = await response.json();
        const twinMessage = aiResponse.choices[0]?.message?.content;
        
        res.json({ response: twinMessage });
      } else {
        throw new Error('AI service error');
      }
    } catch (error) {
      res.status(500).json({ message: 'Twin response failed' });
    }
  });

  return router;
}