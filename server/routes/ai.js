import express from 'express';

export function aiRouter(db) {
  const router = express.Router();

  // Get AI response with multiple providers
  router.post('/chat', async (req, res) => {
    try {
      const { message, chatId, userId, provider, model } = req.body;
      
      const response = await getAIResponse(db, {
        message,
        chatId,
        userId,
        provider: provider || 'openrouter',
        model: model || 'meta-llama/llama-3.2-1b-instruct:free'
      });

      res.json({ response });
    } catch (error) {
      console.error('AI chat error:', error);
      res.status(500).json({ message: 'AI service error' });
    }
  });

  // Image analysis endpoint
  router.post('/analyze-image', async (req, res) => {
    try {
      const { imageUrl, question, provider, model } = req.body;
      
      const response = await analyzeImage(db, {
        imageUrl,
        question: question || "What is in this image?",
        provider: provider || 'openrouter',
        model: model || 'google/gemini-2.0-flash-exp:free'
      });

      res.json({ analysis: response });
    } catch (error) {
      console.error('Image analysis error:', error);
      res.status(500).json({ message: 'Image analysis failed' });
    }
  });

  // Multi-modal chat (text + image)
  router.post('/multimodal-chat', async (req, res) => {
    try {
      const { messages, provider, model } = req.body;
      
      const response = await multimodalChat(db, {
        messages,
        provider: provider || 'openrouter',
        model: model || 'google/gemini-2.0-flash-exp:free'
      });

      res.json({ response });
    } catch (error) {
      console.error('Multimodal chat error:', error);
      res.status(500).json({ message: 'Multimodal chat failed' });
    }
  });

  // Emotion detection with advanced models
  router.post('/emotion', async (req, res) => {
    try {
      const { message, provider, model } = req.body;
      
      const emotion = await detectEmotion(db, {
        message,
        provider: provider || 'together',
        model: model || 'meta-llama/Llama-3.3-70B-Instruct-Turbo'
      });
      
      res.json({ emotion });
    } catch (error) {
      console.error('Emotion detection error:', error);
      res.status(500).json({ message: 'Emotion detection failed' });
    }
  });

  // Smart reply suggestions
  router.post('/suggestions', async (req, res) => {
    try {
      const { message, context, provider, model } = req.body;
      
      const suggestions = await generateSuggestions(db, {
        message,
        context,
        provider: provider || 'openrouter',
        model: model || 'meta-llama/llama-4-maverick:free'
      });
      
      res.json({ suggestions });
    } catch (error) {
      console.error('Suggestions error:', error);
      res.status(500).json({ message: 'Suggestions failed' });
    }
  });

  // Language translation
  router.post('/translate', async (req, res) => {
    try {
      const { text, targetLanguage, sourceLanguage, provider } = req.body;
      
      const translation = await translateText(db, {
        text,
        targetLanguage,
        sourceLanguage: sourceLanguage || 'auto',
        provider: provider || 'together'
      });
      
      res.json({ translation });
    } catch (error) {
      console.error('Translation error:', error);
      res.status(500).json({ message: 'Translation failed' });
    }
  });

  // Text summarization
  router.post('/summarize', async (req, res) => {
    try {
      const { text, length, provider } = req.body;
      
      const summary = await summarizeText(db, {
        text,
        length: length || 'medium',
        provider: provider || 'together'
      });
      
      res.json({ summary });
    } catch (error) {
      console.error('Summarization error:', error);
      res.status(500).json({ message: 'Summarization failed' });
    }
  });

  // Content moderation
  router.post('/moderate', async (req, res) => {
    try {
      const { content, provider } = req.body;
      
      const moderation = await moderateContent(db, {
        content,
        provider: provider || 'openrouter'
      });
      
      res.json({ moderation });
    } catch (error) {
      console.error('Moderation error:', error);
      res.status(500).json({ message: 'Moderation failed' });
    }
  });

  return router;
}

// AI Provider Functions
async function getAIResponse(db, { message, chatId, userId, provider, model }) {
  const recentMessages = await db.getChatMessages(chatId, 10);
  
  const messages = [
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
  ];

  switch (provider) {
    case 'openrouter':
      return await callOpenRouter(db, { model, messages });
    case 'together':
      return await callTogether(db, { model, messages });
    default:
      throw new Error('Unsupported AI provider');
  }
}

async function analyzeImage(db, { imageUrl, question, provider, model }) {
  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: question
        },
        {
          type: 'image_url',
          image_url: {
            url: imageUrl
          }
        }
      ]
    }
  ];

  switch (provider) {
    case 'openrouter':
      return await callOpenRouter(db, { model, messages });
    default:
      throw new Error('Unsupported provider for image analysis');
  }
}

async function multimodalChat(db, { messages, provider, model }) {
  switch (provider) {
    case 'openrouter':
      return await callOpenRouter(db, { model, messages });
    default:
      throw new Error('Unsupported provider for multimodal chat');
  }
}

async function detectEmotion(db, { message, provider, model }) {
  const messages = [
    {
      role: 'system',
      content: 'Analyze the emotion in this message and respond with only one word: happy, sad, angry, excited, neutral, love, surprised, frustrated, confused, or disappointed.'
    },
    {
      role: 'user',
      content: message
    }
  ];

  const response = await callAIProvider(db, provider, { model, messages });
  return response.toLowerCase().trim();
}

async function generateSuggestions(db, { message, context, provider, model }) {
  const messages = [
    {
      role: 'system',
      content: 'Generate 3 contextually appropriate reply suggestions for this message. Consider the conversation context. Return only the suggestions separated by |'
    },
    {
      role: 'user',
      content: `Message: ${message}\nContext: ${context || 'General conversation'}`
    }
  ];

  const response = await callAIProvider(db, provider, { model, messages });
  return response.split('|').map(s => s.trim()).filter(s => s.length > 0);
}

async function translateText(db, { text, targetLanguage, sourceLanguage, provider }) {
  const messages = [
    {
      role: 'system',
      content: `Translate the following text from ${sourceLanguage} to ${targetLanguage}. Return only the translation without any additional text.`
    },
    {
      role: 'user',
      content: text
    }
  ];

  return await callAIProvider(db, provider, { 
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', 
    messages 
  });
}

async function summarizeText(db, { text, length, provider }) {
  const lengthInstructions = {
    short: 'in 1-2 sentences',
    medium: 'in 3-4 sentences',
    long: 'in a detailed paragraph'
  };

  const messages = [
    {
      role: 'system',
      content: `Summarize the following text ${lengthInstructions[length] || lengthInstructions.medium}. Be concise and capture the key points.`
    },
    {
      role: 'user',
      content: text
    }
  ];

  return await callAIProvider(db, provider, { 
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', 
    messages 
  });
}

async function moderateContent(db, { content, provider }) {
  const messages = [
    {
      role: 'system',
      content: 'Analyze this content for inappropriate material including hate speech, harassment, explicit content, or spam. Respond with a JSON object containing: {"safe": boolean, "reason": "explanation if not safe", "confidence": 0-1}'
    },
    {
      role: 'user',
      content: content
    }
  ];

  const response = await callAIProvider(db, provider, { 
    model: 'meta-llama/llama-3.2-1b-instruct:free', 
    messages 
  });

  try {
    return JSON.parse(response);
  } catch {
    return { safe: true, reason: '', confidence: 0.5 };
  }
}

// Provider-specific API calls
async function callOpenRouter(db, { model, messages }) {
  const apiKey = await db.getSetting('openrouter_api_key');
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://hodhod.com',
      'X-Title': 'Hodhod Messenger'
    },
    body: JSON.stringify({ model, messages })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content;
}

async function callTogether(db, { model, messages }) {
  const apiKey = await db.getSetting('together_api_key');
  if (!apiKey) {
    throw new Error('Together API key not configured');
  }

  const response = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model, messages })
  });

  if (!response.ok) {
    throw new Error(`Together API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content;
}

async function callAIProvider(db, provider, { model, messages }) {
  switch (provider) {
    case 'openrouter':
      return await callOpenRouter(db, { model, messages });
    case 'together':
      return await callTogether(db, { model, messages });
    default:
      throw new Error('Unsupported AI provider');
  }
}