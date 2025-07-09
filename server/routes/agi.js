import express from 'express';

export function agiRouter(db) {
  const router = express.Router();

  // Chat with AGI companion
  router.post('/chat', async (req, res) => {
    try {
      const { message, userId, personality } = req.body;
      
      // Get conversation history
      const history = await db.getAGIHistory(userId, 10);
      
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
              content: `You are an AGI companion. You have long-term memory and adapt to the user's needs. ${personality ? `Your personality: ${personality}` : 'Be helpful, thoughtful, and engaging.'} Remember previous conversations and build upon them.`
            },
            ...history.reverse().map(conv => [
              { role: 'user', content: conv.message },
              { role: 'assistant', content: conv.response }
            ]).flat(),
            {
              role: 'user',
              content: message
            }
          ]
        })
      });

      if (response.ok) {
        const aiResponse = await response.json();
        const companionMessage = aiResponse.choices[0]?.message?.content;
        
        // Save conversation
        await db.saveAGIConversation(userId, message, companionMessage);
        
        res.json({ response: companionMessage });
      } else {
        throw new Error('AI service error');
      }
    } catch (error) {
      console.error('AGI chat error:', error);
      res.status(500).json({ message: 'AGI chat failed' });
    }
  });

  // Get conversation history
  router.get('/history/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const history = await db.getAGIHistory(userId, 50);
      res.json(history);
    } catch (error) {
      console.error('Error getting AGI history:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
}