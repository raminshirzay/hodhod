import express from 'express';
import { Database } from '../database.js';

export function groupRouter(db: Database) {
  const router = express.Router();

  // Analyze group conversation
  router.post('/analyze', async (req, res) => {
    try {
      const { chatId } = req.body;
      
      const messages = await db.getChatMessages(chatId, 20);
      const apiKey = await db.getSetting('openrouter_api_key');
      
      if (!apiKey) {
        return res.status(500).json({ message: 'AI service not configured' });
      }
      
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
              content: 'Analyze this group conversation and provide a summary with key points and group sentiment. Be concise and helpful.'
            },
            {
              role: 'user',
              content: `Group conversation:\n${messages.map(m => `${m.username}: ${m.content}`).join('\n')}`
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('AI service error');
      }

      const aiResponse = await response.json();
      const analysis = aiResponse.choices[0]?.message?.content;
      
      res.json({ analysis });
    } catch (error) {
      res.status(500).json({ message: 'Analysis failed' });
    }
  });

  return router;
}