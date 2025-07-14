import express from 'express';

export function aiRouter(db) {
  const router = express.Router();

  // Enhanced AI chat with multiple providers and advanced features
  router.post('/chat', async (req, res) => {
    try {
      const { 
        message, 
        chatId, 
        userId, 
        provider = 'openrouter', 
        model, 
        context = {},
        temperature = 0.7,
        maxTokens = 2048
      } = req.body;
      
      console.log(`🤖 Enhanced AI chat request from user ${userId}`);
      
      if (!message || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Message and user ID are required',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }
      
      // Get AI settings
      const aiEnabled = await db.getSetting('ai', 'enabled');
      if (aiEnabled !== 'true') {
        return res.status(503).json({
          success: false,
          message: 'AI features are currently disabled',
          code: 'AI_DISABLED'
        });
      }
      
      const response = await getAIResponse(db, {
        message,
        chatId,
        userId,
        provider,
        model,
        context,
        temperature,
        maxTokens
      });

      // Log AI interaction
      await db.logEvent(userId, 'ai_interaction', {
        provider,
        model: model || 'default',
        messageLength: message.length,
        responseLength: response.length,
        chatId
      });

      res.json({ 
        success: true,
        response,
        provider,
        model: model || 'default',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Enhanced AI chat error:', error);
      res.status(500).json({ 
        success: false,
        message: 'AI service error',
        error: error.message,
        code: 'AI_SERVICE_ERROR'
      });
    }
  });

  // Enhanced image analysis with multiple models
  router.post('/analyze-image', async (req, res) => {
    try {
      const { 
        imageUrl, 
        question = "What is in this image? Describe it in detail.",
        provider = 'openrouter',
        model = 'google/gemini-2.0-flash-exp:free',
        userId
      } = req.body;
      
      console.log(`🖼️ Enhanced image analysis request`);
      
      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          message: 'Image URL is required',
          code: 'MISSING_IMAGE_URL'
        });
      }
      
      const response = await analyzeImage(db, {
        imageUrl,
        question,
        provider,
        model
      });

      // Log image analysis
      if (userId) {
        await db.logEvent(userId, 'image_analysis', {
          provider,
          model,
          questionLength: question.length,
          responseLength: response.length
        });
      }

      res.json({ 
        success: true,
        analysis: response,
        provider,
        model,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Enhanced image analysis error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Image analysis failed',
        error: error.message,
        code: 'IMAGE_ANALYSIS_ERROR'
      });
    }
  });

  // Enhanced multimodal chat
  router.post('/multimodal-chat', async (req, res) => {
    try {
      const { 
        messages, 
        provider = 'openrouter',
        model = 'google/gemini-2.0-flash-exp:free',
        userId,
        temperature = 0.7
      } = req.body;
      
      console.log(`🎭 Enhanced multimodal chat request`);
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({
          success: false,
          message: 'Messages array is required',
          code: 'MISSING_MESSAGES'
        });
      }
      
      const response = await multimodalChat(db, {
        messages,
        provider,
        model,
        temperature
      });

      // Log multimodal interaction
      if (userId) {
        await db.logEvent(userId, 'multimodal_chat', {
          provider,
          model,
          messageCount: messages.length,
          responseLength: response.length
        });
      }

      res.json({ 
        success: true,
        response,
        provider,
        model,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Enhanced multimodal chat error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Multimodal chat failed',
        error: error.message,
        code: 'MULTIMODAL_ERROR'
      });
    }
  });

  // Enhanced emotion detection with confidence scoring
  router.post('/emotion', async (req, res) => {
    try {
      const { 
        message, 
        provider = 'together',
        model = 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        userId,
        includeConfidence = true
      } = req.body;
      
      console.log(`😊 Enhanced emotion detection request`);
      
      if (!message) {
        return res.status(400).json({
          success: false,
          message: 'Message is required',
          code: 'MISSING_MESSAGE'
        });
      }
      
      const result = await detectEmotion(db, {
        message,
        provider,
        model,
        includeConfidence
      });
      
      // Log emotion detection
      if (userId) {
        await db.logEvent(userId, 'emotion_detection', {
          provider,
          model,
          emotion: result.emotion,
          confidence: result.confidence,
          messageLength: message.length
        });
      }
      
      res.json({ 
        success: true,
        ...result,
        provider,
        model,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Enhanced emotion detection error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Emotion detection failed',
        error: error.message,
        code: 'EMOTION_DETECTION_ERROR'
      });
    }
  });

  // Enhanced smart reply suggestions
  router.post('/suggestions', async (req, res) => {
    try {
      const { 
        message, 
        context = 'casual chat',
        provider = 'openrouter',
        model = 'meta-llama/llama-4-maverick:free',
        userId,
        count = 3,
        tone = 'neutral'
      } = req.body;
      
      console.log(`💡 Enhanced suggestions request`);
      
      if (!message) {
        return res.status(400).json({
          success: false,
          message: 'Message is required',
          code: 'MISSING_MESSAGE'
        });
      }
      
      const suggestions = await generateSuggestions(db, {
        message,
        context,
        provider,
        model,
        count,
        tone
      });
      
      // Log suggestions generation
      if (userId) {
        await db.logEvent(userId, 'suggestions_generated', {
          provider,
          model,
          suggestionCount: suggestions.length,
          context,
          tone
        });
      }
      
      res.json({ 
        success: true,
        suggestions,
        context,
        tone,
        provider,
        model,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Enhanced suggestions error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Suggestions generation failed',
        error: error.message,
        code: 'SUGGESTIONS_ERROR'
      });
    }
  });

  // Enhanced language translation
  router.post('/translate', async (req, res) => {
    try {
      const { 
        text, 
        targetLanguage, 
        sourceLanguage = 'auto',
        provider = 'together',
        userId,
        preserveFormatting = true
      } = req.body;
      
      console.log(`🌐 Enhanced translation request: ${sourceLanguage} -> ${targetLanguage}`);
      
      if (!text || !targetLanguage) {
        return res.status(400).json({
          success: false,
          message: 'Text and target language are required',
          code: 'MISSING_TRANSLATION_PARAMS'
        });
      }
      
      const translation = await translateText(db, {
        text,
        targetLanguage,
        sourceLanguage,
        provider,
        preserveFormatting
      });
      
      // Log translation
      if (userId) {
        await db.logEvent(userId, 'text_translated', {
          provider,
          sourceLanguage,
          targetLanguage,
          textLength: text.length,
          translationLength: translation.length
        });
      }
      
      res.json({ 
        success: true,
        translation,
        sourceLanguage,
        targetLanguage,
        provider,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Enhanced translation error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Translation failed',
        error: error.message,
        code: 'TRANSLATION_ERROR'
      });
    }
  });

  // Enhanced text summarization
  router.post('/summarize', async (req, res) => {
    try {
      const { 
        text, 
        length = 'medium',
        provider = 'together',
        style = 'neutral',
        userId,
        includeKeyPoints = false
      } = req.body;
      
      console.log(`📝 Enhanced summarization request: ${length} length`);
      
      if (!text) {
        return res.status(400).json({
          success: false,
          message: 'Text is required',
          code: 'MISSING_TEXT'
        });
      }
      
      const result = await summarizeText(db, {
        text,
        length,
        provider,
        style,
        includeKeyPoints
      });
      
      // Log summarization
      if (userId) {
        await db.logEvent(userId, 'text_summarized', {
          provider,
          length,
          style,
          originalLength: text.length,
          summaryLength: result.summary.length
        });
      }
      
      res.json({ 
        success: true,
        ...result,
        length,
        style,
        provider,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Enhanced summarization error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Summarization failed',
        error: error.message,
        code: 'SUMMARIZATION_ERROR'
      });
    }
  });

  // Enhanced content moderation
  router.post('/moderate', async (req, res) => {
    try {
      const { 
        content, 
        provider = 'openrouter',
        strictness = 'medium',
        userId,
        categories = ['hate', 'harassment', 'violence', 'sexual', 'spam']
      } = req.body;
      
      console.log(`🛡️ Enhanced content moderation request`);
      
      if (!content) {
        return res.status(400).json({
          success: false,
          message: 'Content is required',
          code: 'MISSING_CONTENT'
        });
      }
      
      const moderation = await moderateContent(db, {
        content,
        provider,
        strictness,
        categories
      });
      
      // Log moderation check
      if (userId) {
        await db.logEvent(userId, 'content_moderated', {
          provider,
          strictness,
          safe: moderation.safe,
          categories: moderation.flaggedCategories || [],
          confidence: moderation.confidence
        });
      }
      
      res.json({ 
        success: true,
        moderation,
        strictness,
        provider,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Enhanced moderation error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Content moderation failed',
        error: error.message,
        code: 'MODERATION_ERROR'
      });
    }
  });

  // Get AI providers and models
  router.get('/providers', async (req, res) => {
    try {
      const providers = await getAIProviders(db);
      
      res.json({
        success: true,
        providers,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error getting AI providers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get AI providers',
        error: error.message
      });
    }
  });

  // Update AI settings
  router.put('/settings', async (req, res) => {
    try {
      const { 
        defaultProvider,
        defaultModel,
        temperature,
        maxTokens,
        enabledFeatures
      } = req.body;
      
      if (defaultProvider) {
        await db.setSetting('ai', 'default_provider', defaultProvider);
      }
      if (defaultModel) {
        await db.setSetting('ai', 'default_model', defaultModel);
      }
      if (temperature !== undefined) {
        await db.setSetting('ai', 'temperature', temperature.toString());
      }
      if (maxTokens) {
        await db.setSetting('ai', 'max_tokens', maxTokens.toString());
      }
      if (enabledFeatures) {
        await db.setSetting('ai', 'enabled_features', JSON.stringify(enabledFeatures));
      }
      
      res.json({
        success: true,
        message: 'AI settings updated successfully'
      });
    } catch (error) {
      console.error('❌ Error updating AI settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update AI settings',
        error: error.message
      });
    }
  });

  return router;
}

// Enhanced AI Provider Functions
async function getAIResponse(db, { message, chatId, userId, provider, model, context, temperature, maxTokens }) {
  try {
    // Get recent messages for context if chatId provided
    let recentMessages = [];
    if (chatId) {
      const messages = await db.getChatMessages(chatId, 10);
      recentMessages = messages.reverse().map(msg => ({
        role: msg.senderId === userId ? 'user' : 'assistant',
        content: msg.content
      }));
    }
    
    const systemPrompt = context.systemPrompt || 'You are Hodhod AI, a helpful assistant in a messenger app. Respond naturally and helpfully to user messages. Keep responses concise and friendly.';
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...recentMessages,
      { role: 'user', content: message }
    ];

    const selectedModel = model || await db.getSetting('ai', 'default_model') || 'meta-llama/llama-3.2-1b-instruct:free';
    
    switch (provider) {
      case 'openrouter':
        return await callOpenRouter(db, { 
          model: selectedModel, 
          messages, 
          temperature, 
          maxTokens 
        });
      case 'together':
        return await callTogether(db, { 
          model: selectedModel, 
          messages, 
          temperature, 
          maxTokens 
        });
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  } catch (error) {
    console.error('❌ AI response generation error:', error);
    throw error;
  }
}

async function analyzeImage(db, { imageUrl, question, provider, model }) {
  try {
    const messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: question },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }
    ];

    switch (provider) {
      case 'openrouter':
        return await callOpenRouter(db, { model, messages });
      default:
        throw new Error(`Unsupported provider for image analysis: ${provider}`);
    }
  } catch (error) {
    console.error('❌ Image analysis error:', error);
    throw error;
  }
}

async function multimodalChat(db, { messages, provider, model, temperature }) {
  try {
    switch (provider) {
      case 'openrouter':
        return await callOpenRouter(db, { model, messages, temperature });
      default:
        throw new Error(`Unsupported provider for multimodal chat: ${provider}`);
    }
  } catch (error) {
    console.error('❌ Multimodal chat error:', error);
    throw error;
  }
}

async function detectEmotion(db, { message, provider, model, includeConfidence }) {
  try {
    const systemPrompt = includeConfidence 
      ? 'Analyze the emotion in this message and respond with a JSON object containing "emotion" (one word: happy, sad, angry, excited, neutral, love, surprised, frustrated, confused, disappointed) and "confidence" (0-1 scale).'
      : 'Analyze the emotion in this message and respond with only one word: happy, sad, angry, excited, neutral, love, surprised, frustrated, confused, or disappointed.';
    
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ];

    const response = await callAIProvider(db, provider, { model, messages });
    
    if (includeConfidence) {
      try {
        const parsed = JSON.parse(response);
        return {
          emotion: parsed.emotion.toLowerCase().trim(),
          confidence: parsed.confidence || 0.5
        };
      } catch {
        return {
          emotion: response.toLowerCase().trim(),
          confidence: 0.5
        };
      }
    }
    
    return {
      emotion: response.toLowerCase().trim(),
      confidence: 1.0
    };
  } catch (error) {
    console.error('❌ Emotion detection error:', error);
    throw error;
  }
}

async function generateSuggestions(db, { message, context, provider, model, count, tone }) {
  try {
    const toneInstructions = {
      formal: 'Generate formal, professional responses',
      casual: 'Generate casual, friendly responses',
      humorous: 'Generate light-hearted, humorous responses',
      empathetic: 'Generate empathetic, understanding responses',
      neutral: 'Generate balanced, neutral responses'
    };
    
    const messages = [
      {
        role: 'system',
        content: `Generate ${count} contextually appropriate reply suggestions for this message. ${toneInstructions[tone] || toneInstructions.neutral}. Consider the conversation context: ${context}. Return only the suggestions separated by |`
      },
      {
        role: 'user',
        content: message
      }
    ];

    const response = await callAIProvider(db, provider, { model, messages });
    return response.split('|').map(s => s.trim()).filter(s => s.length > 0).slice(0, count);
  } catch (error) {
    console.error('❌ Suggestions generation error:', error);
    throw error;
  }
}

async function translateText(db, { text, targetLanguage, sourceLanguage, provider, preserveFormatting }) {
  try {
    const formatInstruction = preserveFormatting 
      ? 'Preserve the original formatting, line breaks, and structure.' 
      : '';
    
    const messages = [
      {
        role: 'system',
        content: `Translate the following text from ${sourceLanguage} to ${targetLanguage}. Return only the translation without any additional text. ${formatInstruction}`
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
  } catch (error) {
    console.error('❌ Translation error:', error);
    throw error;
  }
}

async function summarizeText(db, { text, length, provider, style, includeKeyPoints }) {
  try {
    const lengthInstructions = {
      short: 'in 1-2 sentences',
      medium: 'in 3-4 sentences',
      long: 'in a detailed paragraph'
    };
    
    const styleInstructions = {
      bullet: 'using bullet points',
      narrative: 'in narrative form',
      technical: 'focusing on technical details',
      neutral: 'in a balanced, neutral tone'
    };
    
    let prompt = `Summarize the following text ${lengthInstructions[length] || lengthInstructions.medium} ${styleInstructions[style] || styleInstructions.neutral}. Be concise and capture the key points.`;
    
    if (includeKeyPoints) {
      prompt += ' Also provide a separate list of key points.';
    }
    
    const messages = [
      { role: 'system', content: prompt },
      { role: 'user', content: text }
    ];

    const response = await callAIProvider(db, provider, { 
      model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', 
      messages 
    });
    
    if (includeKeyPoints) {
      const parts = response.split('\n\n');
      return {
        summary: parts[0],
        keyPoints: parts.slice(1).join('\n\n')
      };
    }
    
    return { summary: response };
  } catch (error) {
    console.error('❌ Summarization error:', error);
    throw error;
  }
}

async function moderateContent(db, { content, provider, strictness, categories }) {
  try {
    const strictnessLevels = {
      low: 'Be lenient and only flag clearly inappropriate content',
      medium: 'Use balanced moderation standards',
      high: 'Be strict and flag potentially inappropriate content'
    };
    
    const messages = [
      {
        role: 'system',
        content: `Analyze this content for inappropriate material including: ${categories.join(', ')}. ${strictnessLevels[strictness] || strictnessLevels.medium}. Respond with a JSON object containing: {"safe": boolean, "reason": "explanation if not safe", "confidence": 0-1, "flaggedCategories": ["category1", "category2"]}`
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
      return { 
        safe: true, 
        reason: '', 
        confidence: 0.5,
        flaggedCategories: []
      };
    }
  } catch (error) {
    console.error('❌ Content moderation error:', error);
    throw error;
  }
}

async function getAIProviders(db) {
  try {
    return {
      openrouter: {
        name: 'OpenRouter',
        enabled: await db.getSetting('ai', 'openrouter_enabled') === 'true',
        models: [
          'meta-llama/llama-3.2-1b-instruct:free',
          'meta-llama/llama-4-maverick:free',
          'google/gemini-2.0-flash-exp:free',
          'anthropic/claude-3-haiku',
          'openai/gpt-3.5-turbo',
          'openai/gpt-4',
          'google/gemini-pro'
        ],
        features: ['text', 'image', 'multimodal']
      },
      together: {
        name: 'Together AI',
        enabled: await db.getSetting('ai', 'together_enabled') === 'true',
        models: [
          'meta-llama/Llama-3.3-70B-Instruct-Turbo',
          'meta-llama/Llama-2-70b-chat-hf',
          'mistralai/Mixtral-8x7B-Instruct-v0.1',
          'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO'
        ],
        features: ['text']
      }
    };
  } catch (error) {
    console.error('❌ Error getting AI providers:', error);
    throw error;
  }
}

// Provider-specific API calls with enhanced error handling
async function callOpenRouter(db, { model, messages, temperature = 0.7, maxTokens = 2048 }) {
  try {
    const apiKey = await db.getSetting('ai', 'openrouter_api_key');
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
      body: JSON.stringify({ 
        model, 
        messages,
        temperature,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errorData}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenRouter');
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error('❌ OpenRouter API error:', error);
    throw error;
  }
}

async function callTogether(db, { model, messages, temperature = 0.7, maxTokens = 2048 }) {
  try {
    const apiKey = await db.getSetting('ai', 'together_api_key');
    if (!apiKey) {
      throw new Error('Together API key not configured');
    }

    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        model, 
        messages,
        temperature,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Together API error (${response.status}): ${errorData}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from Together AI');
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error('❌ Together AI API error:', error);
    throw error;
  }
}

async function callAIProvider(db, provider, { model, messages, temperature, maxTokens }) {
  switch (provider) {
    case 'openrouter':
      return await callOpenRouter(db, { model, messages, temperature, maxTokens });
    case 'together':
      return await callTogether(db, { model, messages, temperature, maxTokens });
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}