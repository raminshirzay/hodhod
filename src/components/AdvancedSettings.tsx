import React, { useState, useEffect } from 'react';
import { X, Shield, Bell, MessageSquare, Bot, User, Globe, Database, Lock, Smartphone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface AdvancedSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserSettings {
  privacy: {
    lastSeen: string;
    profilePhoto: string;
    about: string;
    status: string;
    readReceipts: boolean;
    groups: string;
    liveLocation: string;
  };
  notifications: {
    messageNotifications: boolean;
    groupNotifications: boolean;
    callNotifications: boolean;
    notificationTone: string;
    vibration: string;
    popupNotification: boolean;
    lightNotification: boolean;
  };
  chat: {
    theme: string;
    wallpaper: string;
    fontSize: string;
    enterToSend: boolean;
    mediaAutoDownload: string;
    backupFrequency: string;
  };
  ai: {
    enabled: boolean;
    autoResponse: boolean;
    preferredProvider: string;
    preferredModel: string;
    emotionDetection: boolean;
    smartSuggestions: boolean;
    translation: boolean;
    imageAnalysis: boolean;
  };
  twin: {
    enabled: boolean;
    personality: string;
    autoReply: boolean;
    learningMode: boolean;
    responseDelay: number;
  };
  security: {
    twoFactorAuth: boolean;
    fingerprintLock: boolean;
    autoLock: string;
    showSecurityNotifications: boolean;
  };
  storage: {
    autoDeleteMessages: string;
    downloadPath: string;
    lowStorageMode: boolean;
  };
  language: {
    appLanguage: string;
    keyboardLanguage: string;
    dateFormat: string;
    timeFormat: string;
  };
}

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('privacy');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [aiProviders, setAiProviders] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchSettings();
      fetchAIProviders();
    }
  }, [isOpen, user]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`/api/settings/user/${user?.id}`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchAIProviders = async () => {
    try {
      const response = await fetch('/api/settings/ai-providers');
      if (response.ok) {
        const data = await response.json();
        setAiProviders(data);
      }
    } catch (error) {
      console.error('Error fetching AI providers:', error);
    }
  };

  const updateSettings = async (section: string, newSettings: any) => {
    if (!settings) return;

    setIsLoading(true);
    try {
      const updatedSettings = {
        ...settings,
        [section]: { ...settings[section as keyof UserSettings], ...newSettings }
      };

      const response = await fetch(`/api/settings/user/${user?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedSettings)
      });

      if (response.ok) {
        setSettings(updatedSettings);
        toast.success('Settings updated successfully');
      } else {
        toast.error('Failed to update settings');
      }
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !settings) return null;

  const tabs = [
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'chat', label: 'Chats', icon: MessageSquare },
    { id: 'ai', label: 'AI Features', icon: Bot },
    { id: 'twin', label: 'Digital Twin', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'storage', label: 'Storage', icon: Database },
    { id: 'language', label: 'Language', icon: Globe }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 border-r border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
                <button
                  onClick={onClose}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[#1F3934] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto max-h-[90vh]">
            <div className="p-6">
              {activeTab === 'privacy' && (
                <PrivacySettings 
                  settings={settings.privacy} 
                  onUpdate={(newSettings) => updateSettings('privacy', newSettings)}
                  isLoading={isLoading}
                />
              )}
              
              {activeTab === 'notifications' && (
                <NotificationSettings 
                  settings={settings.notifications} 
                  onUpdate={(newSettings) => updateSettings('notifications', newSettings)}
                  isLoading={isLoading}
                />
              )}
              
              {activeTab === 'chat' && (
                <ChatSettings 
                  settings={settings.chat} 
                  onUpdate={(newSettings) => updateSettings('chat', newSettings)}
                  isLoading={isLoading}
                />
              )}
              
              {activeTab === 'ai' && (
                <AISettings 
                  settings={settings.ai} 
                  providers={aiProviders}
                  onUpdate={(newSettings) => updateSettings('ai', newSettings)}
                  isLoading={isLoading}
                />
              )}
              
              {activeTab === 'twin' && (
                <TwinSettings 
                  settings={settings.twin} 
                  onUpdate={(newSettings) => updateSettings('twin', newSettings)}
                  isLoading={isLoading}
                />
              )}
              
              {activeTab === 'security' && (
                <SecuritySettings 
                  settings={settings.security} 
                  onUpdate={(newSettings) => updateSettings('security', newSettings)}
                  isLoading={isLoading}
                />
              )}
              
              {activeTab === 'storage' && (
                <StorageSettings 
                  settings={settings.storage} 
                  onUpdate={(newSettings) => updateSettings('storage', newSettings)}
                  isLoading={isLoading}
                />
              )}
              
              {activeTab === 'language' && (
                <LanguageSettings 
                  settings={settings.language} 
                  onUpdate={(newSettings) => updateSettings('language', newSettings)}
                  isLoading={isLoading}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Privacy Settings Component
const PrivacySettings: React.FC<any> = ({ settings, onUpdate, isLoading }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-gray-900">Privacy Settings</h3>
    
    <div className="space-y-4">
      <SettingRow
        label="Last Seen"
        description="Who can see when you were last online"
        value={settings.lastSeen}
        options={[
          { value: 'everyone', label: 'Everyone' },
          { value: 'contacts', label: 'My Contacts' },
          { value: 'nobody', label: 'Nobody' }
        ]}
        onChange={(value) => onUpdate({ lastSeen: value })}
        disabled={isLoading}
      />
      
      <SettingRow
        label="Profile Photo"
        description="Who can see your profile photo"
        value={settings.profilePhoto}
        options={[
          { value: 'everyone', label: 'Everyone' },
          { value: 'contacts', label: 'My Contacts' },
          { value: 'nobody', label: 'Nobody' }
        ]}
        onChange={(value) => onUpdate({ profilePhoto: value })}
        disabled={isLoading}
      />
      
      <ToggleRow
        label="Read Receipts"
        description="Show when you've read messages"
        value={settings.readReceipts}
        onChange={(value) => onUpdate({ readReceipts: value })}
        disabled={isLoading}
      />
    </div>
  </div>
);

// Notification Settings Component
const NotificationSettings: React.FC<any> = ({ settings, onUpdate, isLoading }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-gray-900">Notification Settings</h3>
    
    <div className="space-y-4">
      <ToggleRow
        label="Message Notifications"
        description="Receive notifications for new messages"
        value={settings.messageNotifications}
        onChange={(value) => onUpdate({ messageNotifications: value })}
        disabled={isLoading}
      />
      
      <ToggleRow
        label="Group Notifications"
        description="Receive notifications for group messages"
        value={settings.groupNotifications}
        onChange={(value) => onUpdate({ groupNotifications: value })}
        disabled={isLoading}
      />
      
      <SettingRow
        label="Notification Tone"
        description="Sound for notifications"
        value={settings.notificationTone}
        options={[
          { value: 'default', label: 'Default' },
          { value: 'chime', label: 'Chime' },
          { value: 'bell', label: 'Bell' },
          { value: 'none', label: 'None' }
        ]}
        onChange={(value) => onUpdate({ notificationTone: value })}
        disabled={isLoading}
      />
    </div>
  </div>
);

// Chat Settings Component
const ChatSettings: React.FC<any> = ({ settings, onUpdate, isLoading }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-gray-900">Chat Settings</h3>
    
    <div className="space-y-4">
      <SettingRow
        label="Theme"
        description="Choose your chat theme"
        value={settings.theme}
        options={[
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'auto', label: 'Auto' }
        ]}
        onChange={(value) => onUpdate({ theme: value })}
        disabled={isLoading}
      />
      
      <SettingRow
        label="Font Size"
        description="Text size in chats"
        value={settings.fontSize}
        options={[
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large' }
        ]}
        onChange={(value) => onUpdate({ fontSize: value })}
        disabled={isLoading}
      />
      
      <ToggleRow
        label="Enter to Send"
        description="Press Enter to send messages"
        value={settings.enterToSend}
        onChange={(value) => onUpdate({ enterToSend: value })}
        disabled={isLoading}
      />
    </div>
  </div>
);

// AI Settings Component
const AISettings: React.FC<any> = ({ settings, providers, onUpdate, isLoading }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-gray-900">AI Features</h3>
    
    <div className="space-y-4">
      <ToggleRow
        label="AI Assistant"
        description="Enable AI-powered responses and features"
        value={settings.enabled}
        onChange={(value) => onUpdate({ enabled: value })}
        disabled={isLoading}
      />
      
      {settings.enabled && (
        <>
          <SettingRow
            label="AI Provider"
            description="Choose your preferred AI service"
            value={settings.preferredProvider}
            options={[
              { value: 'openrouter', label: 'OpenRouter' },
              { value: 'together', label: 'Together AI' }
            ]}
            onChange={(value) => onUpdate({ preferredProvider: value })}
            disabled={isLoading}
          />
          
          {providers && providers[settings.preferredProvider] && (
            <SettingRow
              label="AI Model"
              description="Choose the AI model to use"
              value={settings.preferredModel}
              options={providers[settings.preferredProvider].models.map((model: string) => ({
                value: model,
                label: model.split('/').pop() || model
              }))}
              onChange={(value) => onUpdate({ preferredModel: value })}
              disabled={isLoading}
            />
          )}
          
          <ToggleRow
            label="Emotion Detection"
            description="Detect emotions in messages for animated responses"
            value={settings.emotionDetection}
            onChange={(value) => onUpdate({ emotionDetection: value })}
            disabled={isLoading}
          />
          
          <ToggleRow
            label="Smart Suggestions"
            description="Get AI-powered reply suggestions"
            value={settings.smartSuggestions}
            onChange={(value) => onUpdate({ smartSuggestions: value })}
            disabled={isLoading}
          />
          
          <ToggleRow
            label="Auto Translation"
            description="Automatically translate messages"
            value={settings.translation}
            onChange={(value) => onUpdate({ translation: value })}
            disabled={isLoading}
          />
          
          <ToggleRow
            label="Image Analysis"
            description="AI can analyze and describe images"
            value={settings.imageAnalysis}
            onChange={(value) => onUpdate({ imageAnalysis: value })}
            disabled={isLoading}
          />
        </>
      )}
    </div>
  </div>
);

// Twin Settings Component
const TwinSettings: React.FC<any> = ({ settings, onUpdate, isLoading }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-gray-900">Digital Twin</h3>
    
    <div className="space-y-4">
      <ToggleRow
        label="Enable Digital Twin"
        description="Your AI twin responds when you're offline"
        value={settings.enabled}
        onChange={(value) => onUpdate({ enabled: value })}
        disabled={isLoading}
      />
      
      {settings.enabled && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Twin Personality
            </label>
            <textarea
              value={settings.personality}
              onChange={(e) => onUpdate({ personality: e.target.value })}
              placeholder="Describe your personality, communication style, and preferences..."
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F3C883]"
              rows={4}
              disabled={isLoading}
            />
          </div>
          
          <ToggleRow
            label="Auto Reply"
            description="Twin automatically replies to messages"
            value={settings.autoReply}
            onChange={(value) => onUpdate({ autoReply: value })}
            disabled={isLoading}
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Response Delay (seconds)
            </label>
            <input
              type="number"
              value={settings.responseDelay}
              onChange={(e) => onUpdate({ responseDelay: parseInt(e.target.value) })}
              min="5"
              max="300"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F3C883]"
              disabled={isLoading}
            />
          </div>
        </>
      )}
    </div>
  </div>
);

// Security Settings Component
const SecuritySettings: React.FC<any> = ({ settings, onUpdate, isLoading }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-gray-900">Security Settings</h3>
    
    <div className="space-y-4">
      <ToggleRow
        label="Two-Factor Authentication"
        description="Add an extra layer of security"
        value={settings.twoFactorAuth}
        onChange={(value) => onUpdate({ twoFactorAuth: value })}
        disabled={isLoading}
      />
      
      <SettingRow
        label="Auto Lock"
        description="Automatically lock the app"
        value={settings.autoLock}
        options={[
          { value: 'never', label: 'Never' },
          { value: '1min', label: '1 minute' },
          { value: '5min', label: '5 minutes' },
          { value: '30min', label: '30 minutes' }
        ]}
        onChange={(value) => onUpdate({ autoLock: value })}
        disabled={isLoading}
      />
    </div>
  </div>
);

// Storage Settings Component
const StorageSettings: React.FC<any> = ({ settings, onUpdate, isLoading }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-gray-900">Storage Settings</h3>
    
    <div className="space-y-4">
      <SettingRow
        label="Auto Delete Messages"
        description="Automatically delete old messages"
        value={settings.autoDeleteMessages}
        options={[
          { value: 'never', label: 'Never' },
          { value: '24h', label: '24 hours' },
          { value: '7d', label: '7 days' },
          { value: '30d', label: '30 days' }
        ]}
        onChange={(value) => onUpdate({ autoDeleteMessages: value })}
        disabled={isLoading}
      />
      
      <ToggleRow
        label="Low Storage Mode"
        description="Optimize for limited storage"
        value={settings.lowStorageMode}
        onChange={(value) => onUpdate({ lowStorageMode: value })}
        disabled={isLoading}
      />
    </div>
  </div>
);

// Language Settings Component
const LanguageSettings: React.FC<any> = ({ settings, onUpdate, isLoading }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-gray-900">Language & Region</h3>
    
    <div className="space-y-4">
      <SettingRow
        label="App Language"
        description="Language for the interface"
        value={settings.appLanguage}
        options={[
          { value: 'en', label: 'English' },
          { value: 'es', label: 'Spanish' },
          { value: 'fr', label: 'French' },
          { value: 'de', label: 'German' },
          { value: 'ar', label: 'Arabic' }
        ]}
        onChange={(value) => onUpdate({ appLanguage: value })}
        disabled={isLoading}
      />
      
      <SettingRow
        label="Date Format"
        description="How dates are displayed"
        value={settings.dateFormat}
        options={[
          { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
          { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
          { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
        ]}
        onChange={(value) => onUpdate({ dateFormat: value })}
        disabled={isLoading}
      />
    </div>
  </div>
);

// Helper Components
const SettingRow: React.FC<any> = ({ label, description, value, options, onChange, disabled }) => (
  <div className="flex items-center justify-between py-3">
    <div>
      <h4 className="font-medium text-gray-900">{label}</h4>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F3C883] disabled:opacity-50"
    >
      {options.map((option: any) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const ToggleRow: React.FC<any> = ({ label, description, value, onChange, disabled }) => (
  <div className="flex items-center justify-between py-3">
    <div>
      <h4 className="font-medium text-gray-900">{label}</h4>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
    <button
      onClick={() => onChange(!value)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
        value ? 'bg-[#1F3934]' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);