import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Brain, Send, Settings, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

interface CompanionMessage {
  id: number;
  content: string;
  isUser: boolean;
  timestamp: string;
}

export const AGICompanionPage: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [companionPersonality, setCompanionPersonality] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize with welcome message
    setMessages([
      {
        id: 1,
        content: `Hello ${user?.username}! I'm your AGI Companion. I'm here to help you think, learn, and grow. I remember our conversations and adapt to your needs over time. What would you like to talk about today?`,
        isUser: false,
        timestamp: new Date().toISOString()
      }
    ]);
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const userMessage: CompanionMessage = {
      id: Date.now(),
      content: newMessage,
      isUser: true,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: newMessage,
          chatId: 'agi-companion',
          userId: user?.id,
          personality: companionPersonality
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiMessage: CompanionMessage = {
          id: Date.now() + 1,
          content: data.response,
          isUser: false,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        toast.error('Failed to get response');
      }
    } catch (error) {
      toast.error('Failed to get response');
    } finally {
      setIsTyping(false);
    }
  };

  const handlePersonalityUpdate = () => {
    toast.success('Companion personality updated');
    setShowSettings(false);
  };

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link
                to="/messenger"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Messenger</span>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-2">
                <Brain className="h-8 w-8 text-[#1F3934]" />
                <h1 className="text-2xl font-bold text-[#1F3934]">AGI Companion</h1>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-120px)] flex flex-col">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex space-x-3 max-w-2xl ${message.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.isUser ? 'bg-[#1F3934]' : 'bg-[#F3C883]'
                }`}>
                  {message.isUser ? (
                    <span className="text-white text-sm font-medium">
                      {user?.username?.charAt(0)?.toUpperCase()}
                    </span>
                  ) : (
                    <Brain className="h-4 w-4 text-[#1F3934]" />
                  )}
                </div>
                
                <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                  message.isUser 
                    ? 'bg-[#1F3934] text-white rounded-br-md' 
                    : 'bg-white text-gray-900 rounded-bl-md border border-gray-200'
                }`}>
                  <p className="text-sm break-words">{message.content}</p>
                  <div className={`text-xs mt-2 ${message.isUser ? 'text-gray-300' : 'text-gray-500'}`}>
                    {new Date(message.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex space-x-3 max-w-2xl">
                <div className="w-8 h-8 rounded-full bg-[#F3C883] flex items-center justify-center flex-shrink-0">
                  <Brain className="h-4 w-4 text-[#1F3934]" />
                </div>
                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md border border-gray-200 shadow-sm">
                  <div className="typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Talk to your AGI Companion..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F3C883] focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-[#1F3934] text-white p-3 rounded-xl hover:bg-[#2D4A3E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </form>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Companion Settings
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Personality & Behavior
                </label>
                <textarea
                  value={companionPersonality}
                  onChange={(e) => setCompanionPersonality(e.target.value)}
                  placeholder="Describe how you want your AGI companion to behave, its personality traits, areas of expertise, and communication style..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F3C883]"
                  rows={4}
                />
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Sparkles className="h-5 w-5 text-[#F3C883]" />
                  <h4 className="font-medium text-gray-900">Memory & Learning</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Your companion remembers all conversations and learns from your interactions 
                  to provide more personalized responses over time.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePersonalityUpdate}
                  className="px-4 py-2 bg-[#1F3934] text-white rounded-xl hover:bg-[#2D4A3E] transition-colors"
                >
                  Update Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};