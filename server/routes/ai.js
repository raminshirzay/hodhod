import express from 'express';

export function aiRouter(db) {
  const router = express.Router();

  // Get AI response
  router.post('/chat', async (req, res) => {
    try {
      const { message, chatId, userId } = req.body;
      
      const apiKey = await db.getSetting('openrouter_api_key');
      if (!apiKey) {
        return res.status(500).json({ message: 'AI service not configured' });
      }
      
      // Get recent messages for context
      const recentMessages = await db.getChatMessages(chatId, 10);
      
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
              content: 'You are Hodhod AI, a helpful assistant in a messenger app. Respond naturally and helpfully to user messages. Keep responses concise and friendly.'
            },
            ...recentMessages.reverse().map(msg => ({
              role: msg.senderId === userId ? 'user' : 'assistant',
              content: msg.content
            })),
            {
              role: 'user',
              content: message
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('AI service error');
      }

      const aiResponse = await response.json();
      const aiMessage = aiResponse.choices[0]?.message?.content;
      
      if (!aiMessage) {
        throw new Error('No AI response');
      }

      res.json({ response: aiMessage });
    } catch (error) {
      console.error('AI chat error:', error);
      res.status(500).json({ message: 'AI service error' });
    }
  });

  // Emotion detection
  router.post('/emotion', async (req, res) => {
    try {
      const { message } = req.body;
      
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
              content: 'Analyze the emotion in this message and respond with only one word: happy, sad, angry, excited, neutral, love, or surprised.'
            },
            {
              role: 'user',
              content: message
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('AI service error');
      }

      const aiResponse = await response.json();
      const emotion = aiResponse.choices[0]?.message?.content.toLowerCase().trim();
      
      res.json({ emotion });
    } catch (error) {
      console.error('Emotion detection error:', error);
      res.status(500).json({ message: 'Emotion detection failed' });
    }
  });

  // Quick reply suggestions
  router.post('/suggestions', async (req, res) => {
    try {
      const { message } = req.body;
      
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
              content: 'Generate 3 short reply suggestions for this message. Return only the suggestions separated by |'
            },
            {
              role: 'user',
              content: message
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('AI service error');
      }

      const aiResponse = await response.json();
      const suggestions = aiResponse.choices[0]?.message?.content.split('|').map(s => s.trim());
      
      res.json({ suggestions });
    } catch (error) {
      console.error('Suggestions error:', error);
      res.status(500).json({ message: 'Suggestions failed' });
    }
  });

  return router;
}