import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { 
  Phone, 
  Video, 
  MoreHorizontal, 
  Search,
  Calendar,
  Brain,
  Film
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Chat {
  id: number;
  name: string;
  isGroup: boolean;
  avatar?: string;
}

interface Message {
  id: number;
  chatId: number;
  senderId: number;
  username: string;
  userAvatar?: string;
  content: string;
  type: string;
  timestamp: string;
  animationType?: string;
  fileUrl?: string;
  fileName?: string;
}

interface ChatViewProps {
  chat: Chat;
}

export const ChatView: React.FC<ChatViewProps> = ({ chat }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showFutureMessage, setShowFutureMessage] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    if (socket) {
      socket.emit('join_chat', chat.id);
    }
  }, [chat.id, socket]);

  useEffect(() => {
    if (socket) {
      socket.on('new_message', (message) => {
        if (message.chatId === chat.id) {
          setMessages(prev => [...prev, message]);
        }
      });

      socket.on('user_typing', (data) => {
        if (data.isTyping && !typingUsers.includes(data.username)) {
          setTypingUsers(prev => [...prev, data.username]);
        } else {
          setTypingUsers(prev => prev.filter(u => u !== data.username));
        }
      });

      return () => {
        socket.off('new_message');
        socket.off('user_typing');
      };
    }
  }, [socket, chat.id, typingUsers]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/messages/chat/${chat.id}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.reverse());
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content: string, type: string = 'text', fileData?: any) => {
    if (!content.trim() && !fileData) return;

    const messageData = {
      chatId: chat.id,
      content,
      type,
      ...fileData
    };

    if (socket) {
      socket.emit('send_message', messageData);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (socket) {
      socket.emit('typing', { chatId: chat.id, isTyping });
    }
  };

  const handleCall = (isVideo: boolean) => {
    if (socket) {
      socket.emit('call_user', {
        targetUserId: chat.id, // Assuming this is a 1-on-1 chat
        chatId: chat.id,
        isVideo
      });
      toast.success(`${isVideo ? 'Video' : 'Voice'} call initiated`);
    }
  };

  const handleScheduleMessage = async (content: string, scheduledFor: string) => {
    try {
      const response = await fetch('/api/future/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chatId: chat.id,
          senderId: user?.id,
          content,
          scheduledFor
        })
      });

      if (response.ok) {
        toast.success('Message scheduled successfully');
        setShowFutureMessage(false);
      }
    } catch (error) {
      toast.error('Failed to schedule message');
    }
  };

  const handleAIChat = async (message: string) => {
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          chatId: chat.id,
          userId: user?.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        // AI response will be handled by socket
      }
    } catch (error) {
      console.error('AI chat error:', error);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              {chat.avatar ? (
                <img
                  src={chat.avatar}
                  alt={chat.name}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#F3C883] flex items-center justify-center">
                  <span className="text-[#1F3934] font-medium">
                    {chat.name?.charAt(0)?.toUpperCase() || 'C'}
                  </span>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{chat.name}</h2>
              <p className="text-sm text-green-600">Online</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFutureMessage(true)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              title="Schedule Message"
            >
              <Calendar className="h-5 w-5" />
            </button>
            
            <button
              onClick={() => handleAIChat('Help me with this conversation')}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              title="AI Assistant"
            >
              <Brain className="h-5 w-5" />
            </button>
            
            <button
              onClick={() => setShowReplay(true)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              title="Cinematic Replay"
            >
              <Film className="h-5 w-5" />
            </button>
            
            <button
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              title="Search"
            >
              <Search className="h-5 w-5" />
            </button>
            
            <button
              onClick={() => handleCall(false)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              title="Voice Call"
            >
              <Phone className="h-5 w-5" />
            </button>
            
            <button
              onClick={() => handleCall(true)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              title="Video Call"
            >
              <Video className="h-5 w-5" />
            </button>
            
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.senderId === user?.id}
          />
        ))}
        
        {typingUsers.length > 0 && (
          <TypingIndicator users={typingUsers} />
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
      />

      {/* Future Message Modal */}
      {showFutureMessage && (
        <FutureMessageModal
          onClose={() => setShowFutureMessage(false)}
          onSchedule={handleScheduleMessage}
        />
      )}

      {/* Cinematic Replay Modal */}
      {showReplay && (
        <CinematicReplayModal
          messages={messages}
          onClose={() => setShowReplay(false)}
        />
      )}
    </div>
  );
};

// Future Message Modal
interface FutureMessageModalProps {
  onClose: () => void;
  onSchedule: (content: string, scheduledFor: string) => void;
}

const FutureMessageModal: React.FC<FutureMessageModalProps> = ({ onClose, onSchedule }) => {
  const [content, setContent] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSchedule(content, scheduledFor);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Schedule Message</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F3C883]"
              rows={3}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schedule For
            </label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F3C883]"
              required
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1F3934] text-white rounded-xl hover:bg-[#2D4A3E] transition-colors"
            >
              Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Cinematic Replay Modal
interface CinematicReplayModalProps {
  messages: Message[];
  onClose: () => void;
}

const CinematicReplayModal: React.FC<CinematicReplayModalProps> = ({ messages, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (isPlaying && currentIndex < messages.length - 1) {
      const timer = setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, currentIndex, messages.length]);

  const currentMessage = messages[currentIndex];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Cinematic Replay</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="bg-gray-900 rounded-xl p-6 mb-6 min-h-[200px] flex items-center justify-center">
          {currentMessage ? (
            <div className="text-center">
              <div className="text-white text-lg mb-2">
                <strong>{currentMessage.username}:</strong>
              </div>
              <div className="text-gray-300 text-xl">
                {currentMessage.content}
              </div>
            </div>
          ) : (
            <div className="text-gray-500">No messages to replay</div>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {currentIndex + 1} / {messages.length}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 disabled:opacity-50"
            >
              Previous
            </button>
            
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2 bg-[#1F3934] text-white rounded-xl hover:bg-[#2D4A3E]"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            
            <button
              onClick={() => setCurrentIndex(Math.min(messages.length - 1, currentIndex + 1))}
              disabled={currentIndex === messages.length - 1}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};