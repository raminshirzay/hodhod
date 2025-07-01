import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { ChatList } from '../components/ChatList';
import { ChatView } from '../components/ChatView';
import { UserProfile } from '../components/UserProfile';
import { CallScreen } from '../components/CallScreen';
import { PaymentModal } from '../components/PaymentModal';
import { MediaEditor } from '../components/MediaEditor';
import { 
  MessageCircle, 
  Settings, 
  LogOut, 
  Users, 
  Shield,
  Brain,
  Globe,
  Calendar,
  Film,
  CreditCard,
  Edit3
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Chat {
  id: number;
  name: string;
  isGroup: boolean;
  lastMessage: string;
  lastMessageTime: string;
  messageCount: number;
  avatar?: string;
  isPremium?: boolean;
}

interface Call {
  callId: number;
  isVideo: boolean;
  participants: any[];
  status: 'incoming' | 'active' | 'ended';
}

export const MessengerPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { socket, isConnected } = useSocket();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showCreateChat, setShowCreateChat] = useState(false);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showMediaEditor, setShowMediaEditor] = useState(false);
  const [paymentData, setPaymentData] = useState({ amount: 0, description: '' });

  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user]);

  useEffect(() => {
    if (socket) {
      socket.on('new_message', (message) => {
        // Update chat list with new message
        setChats(prevChats => 
          prevChats.map(chat => 
            chat.id === message.chatId 
              ? { ...chat, lastMessage: message.content, lastMessageTime: message.timestamp }
              : chat
          )
        );
      });

      socket.on('admin_broadcast', (data) => {
        toast.success(`Admin: ${data.message}`);
      });

      socket.on('incoming_call', (callData) => {
        setActiveCall({
          callId: callData.callId,
          isVideo: callData.isVideo,
          participants: [{ id: callData.callerId, name: callData.callerName }],
          status: 'incoming'
        });
      });

      socket.on('call_response', (data) => {
        if (data.accepted && activeCall) {
          setActiveCall(prev => prev ? { ...prev, status: 'active' } : null);
        } else {
          setActiveCall(null);
        }
      });

      socket.on('call_ended', () => {
        setActiveCall(null);
      });

      return () => {
        socket.off('new_message');
        socket.off('admin_broadcast');
        socket.off('incoming_call');
        socket.off('call_response');
        socket.off('call_ended');
      };
    }
  }, [socket, activeCall]);

  const fetchChats = async () => {
    try {
      const response = await fetch(`/api/messages/chats/${user?.id}`);
      if (response.ok) {
        const data = await response.json();
        setChats(data);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const handleCreateChat = async (chatData: any) => {
    try {
      const response = await fetch('/api/messages/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...chatData, createdBy: user?.id })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Chat created successfully');
        setShowCreateChat(false);
        fetchChats();
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Failed to create chat');
    }
  };

  const handlePremiumAccess = (amount: number, description: string) => {
    setPaymentData({ amount, description });
    setShowPayment(true);
  };

  const handlePaymentSuccess = () => {
    toast.success('Premium access granted!');
    // Refresh chat or update UI as needed
  };

  const handleMediaSave = (processedFile: any) => {
    toast.success('Media processed successfully!');
    // Handle the processed file (send as message, etc.)
  };

  return (
    <div className="h-screen flex bg-[#FAFBFC]">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-8 w-8 text-[#1F3934]" />
              <h1 className="text-xl font-bold text-[#1F3934]">Hodhod</h1>
            </div>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-gray-500">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <img
              src={user?.avatar}
              alt={user?.username}
              className="w-10 h-10 rounded-full"
            />
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{user?.username}</h3>
              <p className="text-sm text-gray-500">@{user?.username}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-6 py-4 space-y-2">
          <Link
            to="/worldbrain"
            className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <Globe className="h-5 w-5" />
            <span>World Brain</span>
          </Link>
          
          <Link
            to="/agi"
            className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <Brain className="h-5 w-5" />
            <span>AGI Companion</span>
          </Link>
          
          <button
            onClick={() => setShowCreateChat(true)}
            className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors w-full"
          >
            <Users className="h-5 w-5" />
            <span>Create Chat</span>
          </button>

          <button
            onClick={() => setShowMediaEditor(true)}
            className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors w-full"
          >
            <Edit3 className="h-5 w-5" />
            <span>Media Editor</span>
          </button>

          <button
            onClick={() => handlePremiumAccess(9.99, 'Premium Chat Access')}
            className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors w-full"
          >
            <CreditCard className="h-5 w-5" />
            <span>Premium Features</span>
          </button>
          
          <button
            onClick={() => setShowProfile(true)}
            className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors w-full"
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </button>
          
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Shield className="h-5 w-5" />
              <span>Admin Panel</span>
            </Link>
          )}
          
          <button
            onClick={logout}
            className="flex items-center space-x-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors w-full"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-hidden">
          <ChatList
            chats={chats}
            selectedChat={selectedChat}
            onSelectChat={setSelectedChat}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <ChatView chat={selectedChat} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to Hodhod</h3>
              <p className="text-gray-500 mb-6">Select a chat to start messaging</p>
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <div className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <Calendar className="h-8 w-8 text-[#F3C883] mb-2" />
                  <h4 className="font-medium text-gray-900">Future Messages</h4>
                  <p className="text-sm text-gray-500">Schedule messages for later</p>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <Film className="h-8 w-8 text-[#F3C883] mb-2" />
                  <h4 className="font-medium text-gray-900">Cinematic Replay</h4>
                  <p className="text-sm text-gray-500">View conversations as movies</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals and Overlays */}
      {showProfile && (
        <UserProfile
          user={user!}
          onClose={() => setShowProfile(false)}
        />
      )}

      {showCreateChat && (
        <CreateChatModal
          onClose={() => setShowCreateChat(false)}
          onSubmit={handleCreateChat}
        />
      )}

      {activeCall && (
        <CallScreen
          call={activeCall}
          onEndCall={() => setActiveCall(null)}
        />
      )}

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        amount={paymentData.amount}
        description={paymentData.description}
        onSuccess={handlePaymentSuccess}
      />

      <MediaEditor
        isOpen={showMediaEditor}
        onClose={() => setShowMediaEditor(false)}
        onSave={handleMediaSave}
      />
    </div>
  );
};

// Create Chat Modal Component
interface CreateChatModalProps {
  onClose: () => void;
  onSubmit: (chatData: any) => void;
}

const CreateChatModal: React.FC<CreateChatModalProps> = ({ onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description,
      isGroup,
      isPremium,
      participants: []
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Chat</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chat Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F3C883]"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F3C883]"
              rows={3}
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isGroup"
                checked={isGroup}
                onChange={(e) => setIsGroup(e.target.checked)}
                className="h-4 w-4 text-[#F3C883] border-gray-300 rounded focus:ring-[#F3C883]"
              />
              <label htmlFor="isGroup" className="ml-2 text-sm text-gray-700">
                Group Chat
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPremium"
                checked={isPremium}
                onChange={(e) => setIsPremium(e.target.checked)}
                className="h-4 w-4 text-[#F3C883] border-gray-300 rounded focus:ring-[#F3C883]"
              />
              <label htmlFor="isPremium" className="ml-2 text-sm text-gray-700">
                Premium Chat (Paid Access)
              </label>
            </div>
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
              Create Chat
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};