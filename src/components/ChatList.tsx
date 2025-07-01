import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Users, User } from 'lucide-react';

interface Chat {
  id: number;
  name: string;
  isGroup: boolean;
  lastMessage: string;
  lastMessageTime: string;
  messageCount: number;
  avatar?: string;
}

interface ChatListProps {
  chats: Chat[];
  selectedChat: Chat | null;
  onSelectChat: (chat: Chat) => void;
}

export const ChatList: React.FC<ChatListProps> = ({ chats, selectedChat, onSelectChat }) => {
  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Chats</h2>
        <div className="space-y-2">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat)}
              className={`p-4 rounded-2xl cursor-pointer transition-colors hover:bg-gray-50 ${
                selectedChat?.id === chat.id ? 'bg-[#1F3934] text-white' : 'bg-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  {chat.avatar ? (
                    <img
                      src={chat.avatar}
                      alt={chat.name}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#F3C883] flex items-center justify-center">
                      {chat.isGroup ? (
                        <Users className="h-6 w-6 text-[#1F3934]" />
                      ) : (
                        <User className="h-6 w-6 text-[#1F3934]" />
                      )}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-medium truncate ${
                      selectedChat?.id === chat.id ? 'text-white' : 'text-gray-900'
                    }`}>
                      {chat.name || 'Unnamed Chat'}
                    </h3>
                    <span className={`text-xs ${
                      selectedChat?.id === chat.id ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {chat.lastMessageTime && 
                        formatDistanceToNow(new Date(chat.lastMessageTime), { addSuffix: true })
                      }
                    </span>
                  </div>
                  
                  <p className={`text-sm truncate ${
                    selectedChat?.id === chat.id ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {chat.lastMessage || 'No messages yet'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {chats.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No chats yet</p>
            <p className="text-sm text-gray-400 mt-1">Create a new chat to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};