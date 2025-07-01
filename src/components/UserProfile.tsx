import React, { useState } from 'react';
import { X, Camera, Bot, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  id: number;
  username: string;
  email: string;
  avatar: string;
  role: string;
  twinEnabled: boolean;
}

interface UserProfileProps {
  user: User;
  onClose: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, onClose }) => {
  const [twinEnabled, setTwinEnabled] = useState(user.twinEnabled);
  const [twinPersonality, setTwinPersonality] = useState('');

  const handleTwinToggle = async () => {
    try {
      // In a real app, you'd make an API call here
      setTwinEnabled(!twinEnabled);
      toast.success(`Digital Twin ${!twinEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update twin settings');
    }
  };

  const handlePersonalityUpdate = async () => {
    try {
      // In a real app, you'd make an API call here
      toast.success('Twin personality updated');
    } catch (error) {
      toast.error('Failed to update personality');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Profile Settings</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Profile Picture */}
          <div className="text-center">
            <div className="relative inline-block">
              <img
                src={user.avatar}
                alt={user.username}
                className="w-20 h-20 rounded-full"
              />
              <button className="absolute bottom-0 right-0 bg-[#1F3934] text-white p-2 rounded-full shadow-lg hover:bg-[#2D4A3E] transition-colors">
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <h3 className="mt-3 text-lg font-semibold text-gray-900">
              {user.username}
            </h3>
            <p className="text-gray-500">{user.email}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-[#F3C883] text-[#1F3934] rounded-full text-sm font-medium">
              {user.role}
            </span>
          </div>

          {/* Digital Twin Settings */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Bot className="h-5 w-5 text-[#1F3934]" />
                <h4 className="font-medium text-gray-900">Digital Twin</h4>
              </div>
              <button
                onClick={handleTwinToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  twinEnabled ? 'bg-[#1F3934]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    twinEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Your digital twin responds when you're offline using your personality and chat history.
            </p>
            
            {twinEnabled && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Twin Personality
                </label>
                <textarea
                  value={twinPersonality}
                  onChange={(e) => setTwinPersonality(e.target.value)}
                  placeholder="Describe your personality, communication style, and preferences..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F3C883] text-sm"
                  rows={3}
                />
                <button
                  onClick={handlePersonalityUpdate}
                  className="w-full bg-[#1F3934] text-white py-2 rounded-xl hover:bg-[#2D4A3E] transition-colors text-sm"
                >
                  Update Personality
                </button>
              </div>
            )}
          </div>

          {/* Activity Status */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Clock className="h-5 w-5 text-[#1F3934]" />
              <h4 className="font-medium text-gray-900">Activity</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className="text-green-600 font-medium">Online</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Messages sent</span>
                <span className="text-gray-900 font-medium">1,234</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Chats active</span>
                <span className="text-gray-900 font-medium">12</span>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Preferences</h4>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">AI Auto-responses</span>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-[#1F3934]">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Emotion animations</span>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-[#1F3934]">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Sound notifications</span>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};