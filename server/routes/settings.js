import express from 'express';

export function settingsRouter(db) {
  const router = express.Router();

  // Get user settings (WhatsApp-style)
  router.get('/user/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await db.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Get user-specific settings
      const settings = await getUserSettings(db, userId);
      
      res.json(settings);
    } catch (error) {
      console.error('Error getting user settings:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Update user settings
  router.put('/user/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const settings = req.body;
      
      await updateUserSettings(db, userId, settings);
      
      res.json({ message: 'Settings updated successfully' });
    } catch (error) {
      console.error('Error updating user settings:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get AI provider settings
  router.get('/ai-providers', async (req, res) => {
    try {
      const providers = await getAIProviderSettings(db);
      res.json(providers);
    } catch (error) {
      console.error('Error getting AI provider settings:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Update AI provider settings
  router.put('/ai-providers', async (req, res) => {
    try {
      const { providers } = req.body;
      
      for (const [key, value] of Object.entries(providers)) {
        await db.setSetting(key, value);
      }
      
      res.json({ message: 'AI provider settings updated' });
    } catch (error) {
      console.error('Error updating AI provider settings:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get chat settings
  router.get('/chat/:chatId', async (req, res) => {
    try {
      const chatId = parseInt(req.params.chatId);
      const settings = await getChatSettings(db, chatId);
      
      res.json(settings);
    } catch (error) {
      console.error('Error getting chat settings:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Update chat settings
  router.put('/chat/:chatId', async (req, res) => {
    try {
      const chatId = parseInt(req.params.chatId);
      const settings = req.body;
      
      await updateChatSettings(db, chatId, settings);
      
      res.json({ message: 'Chat settings updated' });
    } catch (error) {
      console.error('Error updating chat settings:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
}

// Helper functions
async function getUserSettings(db, userId) {
  const user = await db.getUserById(userId);
  
  // Default WhatsApp-style settings
  const defaultSettings = {
    // Privacy Settings
    privacy: {
      lastSeen: await getUserSetting(db, userId, 'privacy_last_seen', 'everyone'),
      profilePhoto: await getUserSetting(db, userId, 'privacy_profile_photo', 'everyone'),
      about: await getUserSetting(db, userId, 'privacy_about', 'everyone'),
      status: await getUserSetting(db, userId, 'privacy_status', 'contacts'),
      readReceipts: await getUserSetting(db, userId, 'privacy_read_receipts', 'true') === 'true',
      groups: await getUserSetting(db, userId, 'privacy_groups', 'everyone'),
      liveLocation: await getUserSetting(db, userId, 'privacy_live_location', 'nobody')
    },
    
    // Notification Settings
    notifications: {
      messageNotifications: await getUserSetting(db, userId, 'notif_messages', 'true') === 'true',
      groupNotifications: await getUserSetting(db, userId, 'notif_groups', 'true') === 'true',
      callNotifications: await getUserSetting(db, userId, 'notif_calls', 'true') === 'true',
      notificationTone: await getUserSetting(db, userId, 'notif_tone', 'default'),
      vibration: await getUserSetting(db, userId, 'notif_vibration', 'default'),
      popupNotification: await getUserSetting(db, userId, 'notif_popup', 'true') === 'true',
      lightNotification: await getUserSetting(db, userId, 'notif_light', 'true') === 'true'
    },
    
    // Chat Settings
    chat: {
      theme: await getUserSetting(db, userId, 'chat_theme', 'light'),
      wallpaper: await getUserSetting(db, userId, 'chat_wallpaper', 'default'),
      fontSize: await getUserSetting(db, userId, 'chat_font_size', 'medium'),
      enterToSend: await getUserSetting(db, userId, 'chat_enter_send', 'true') === 'true',
      mediaAutoDownload: await getUserSetting(db, userId, 'chat_auto_download', 'wifi'),
      backupFrequency: await getUserSetting(db, userId, 'chat_backup', 'daily')
    },
    
    // AI Settings
    ai: {
      enabled: await getUserSetting(db, userId, 'ai_enabled', 'true') === 'true',
      autoResponse: await getUserSetting(db, userId, 'ai_auto_response', 'false') === 'true',
      preferredProvider: await getUserSetting(db, userId, 'ai_provider', 'openrouter'),
      preferredModel: await getUserSetting(db, userId, 'ai_model', 'meta-llama/llama-3.2-1b-instruct:free'),
      emotionDetection: await getUserSetting(db, userId, 'ai_emotion', 'true') === 'true',
      smartSuggestions: await getUserSetting(db, userId, 'ai_suggestions', 'true') === 'true',
      translation: await getUserSetting(db, userId, 'ai_translation', 'false') === 'true',
      imageAnalysis: await getUserSetting(db, userId, 'ai_image_analysis', 'true') === 'true'
    },
    
    // Digital Twin Settings
    twin: {
      enabled: user.twinEnabled === 1,
      personality: user.twinPersonality || '',
      autoReply: await getUserSetting(db, userId, 'twin_auto_reply', 'false') === 'true',
      learningMode: await getUserSetting(db, userId, 'twin_learning', 'true') === 'true',
      responseDelay: parseInt(await getUserSetting(db, userId, 'twin_delay', '30'))
    },
    
    // Security Settings
    security: {
      twoFactorAuth: await getUserSetting(db, userId, 'security_2fa', 'false') === 'true',
      fingerprintLock: await getUserSetting(db, userId, 'security_fingerprint', 'false') === 'true',
      autoLock: await getUserSetting(db, userId, 'security_auto_lock', 'never'),
      showSecurityNotifications: await getUserSetting(db, userId, 'security_notifications', 'true') === 'true'
    },
    
    // Storage Settings
    storage: {
      autoDeleteMessages: await getUserSetting(db, userId, 'storage_auto_delete', 'never'),
      downloadPath: await getUserSetting(db, userId, 'storage_download_path', 'default'),
      lowStorageMode: await getUserSetting(db, userId, 'storage_low_mode', 'false') === 'true'
    },
    
    // Language & Region
    language: {
      appLanguage: await getUserSetting(db, userId, 'lang_app', 'en'),
      keyboardLanguage: await getUserSetting(db, userId, 'lang_keyboard', 'en'),
      dateFormat: await getUserSetting(db, userId, 'lang_date_format', 'MM/DD/YYYY'),
      timeFormat: await getUserSetting(db, userId, 'lang_time_format', '12')
    }
  };
  
  return defaultSettings;
}

async function updateUserSettings(db, userId, settings) {
  // Update privacy settings
  if (settings.privacy) {
    for (const [key, value] of Object.entries(settings.privacy)) {
      await setUserSetting(db, userId, `privacy_${key}`, value.toString());
    }
  }
  
  // Update notification settings
  if (settings.notifications) {
    for (const [key, value] of Object.entries(settings.notifications)) {
      await setUserSetting(db, userId, `notif_${key}`, value.toString());
    }
  }
  
  // Update chat settings
  if (settings.chat) {
    for (const [key, value] of Object.entries(settings.chat)) {
      await setUserSetting(db, userId, `chat_${key}`, value.toString());
    }
  }
  
  // Update AI settings
  if (settings.ai) {
    for (const [key, value] of Object.entries(settings.ai)) {
      await setUserSetting(db, userId, `ai_${key}`, value.toString());
    }
  }
  
  // Update twin settings
  if (settings.twin) {
    await db.updateUserTwin(userId, settings.twin.enabled, settings.twin.personality);
    for (const [key, value] of Object.entries(settings.twin)) {
      if (key !== 'enabled' && key !== 'personality') {
        await setUserSetting(db, userId, `twin_${key}`, value.toString());
      }
    }
  }
  
  // Update security settings
  if (settings.security) {
    for (const [key, value] of Object.entries(settings.security)) {
      await setUserSetting(db, userId, `security_${key}`, value.toString());
    }
  }
  
  // Update storage settings
  if (settings.storage) {
    for (const [key, value] of Object.entries(settings.storage)) {
      await setUserSetting(db, userId, `storage_${key}`, value.toString());
    }
  }
  
  // Update language settings
  if (settings.language) {
    for (const [key, value] of Object.entries(settings.language)) {
      await setUserSetting(db, userId, `lang_${key}`, value.toString());
    }
  }
}

async function getUserSetting(db, userId, key, defaultValue) {
  try {
    const value = await db.getSetting(`user_${userId}_${key}`);
    return value || defaultValue;
  } catch {
    return defaultValue;
  }
}

async function setUserSetting(db, userId, key, value) {
  await db.setSetting(`user_${userId}_${key}`, value);
}

async function getAIProviderSettings(db) {
  return {
    openrouter: {
      apiKey: await db.getSetting('openrouter_api_key') || '',
      enabled: await db.getSetting('openrouter_enabled') === 'true',
      models: [
        'meta-llama/llama-3.2-1b-instruct:free',
        'meta-llama/llama-4-maverick:free',
        'google/gemini-2.0-flash-exp:free',
        'anthropic/claude-3-haiku',
        'openai/gpt-3.5-turbo'
      ]
    },
    together: {
      apiKey: await db.getSetting('together_api_key') || '',
      enabled: await db.getSetting('together_enabled') === 'true',
      models: [
        'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        'meta-llama/Llama-2-70b-chat-hf',
        'mistralai/Mixtral-8x7B-Instruct-v0.1'
      ]
    }
  };
}

async function getChatSettings(db, chatId) {
  return {
    notifications: await getChatSetting(db, chatId, 'notifications', 'true') === 'true',
    muteUntil: await getChatSetting(db, chatId, 'mute_until', null),
    customNotificationTone: await getChatSetting(db, chatId, 'notification_tone', 'default'),
    wallpaper: await getChatSetting(db, chatId, 'wallpaper', 'default'),
    aiEnabled: await getChatSetting(db, chatId, 'ai_enabled', 'true') === 'true',
    autoTranslate: await getChatSetting(db, chatId, 'auto_translate', 'false') === 'true',
    targetLanguage: await getChatSetting(db, chatId, 'target_language', 'en'),
    disappearingMessages: await getChatSetting(db, chatId, 'disappearing_messages', 'off'),
    mediaVisibility: await getChatSetting(db, chatId, 'media_visibility', 'true') === 'true'
  };
}

async function updateChatSettings(db, chatId, settings) {
  for (const [key, value] of Object.entries(settings)) {
    await setChatSetting(db, chatId, key, value.toString());
  }
}

async function getChatSetting(db, chatId, key, defaultValue) {
  try {
    const value = await db.getSetting(`chat_${chatId}_${key}`);
    return value || defaultValue;
  } catch {
    return defaultValue;
  }
}

async function setChatSetting(db, chatId, key, value) {
  await db.setSetting(`chat_${chatId}_${key}`, value);
}