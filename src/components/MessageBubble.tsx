import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Download, Heart, Laugh, Frown, Zap } from 'lucide-react';

interface Message {
  id: number;
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

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn }) => {
  const getAnimationClass = () => {
    switch (message.animationType) {
      case 'happy':
        return 'message-animation-happy';
      case 'sad':
        return 'message-animation-sad';
      case 'excited':
        return 'message-animation-excited';
      case 'love':
        return 'message-animation-love';
      default:
        return '';
    }
  };

  const getEmotionIcon = () => {
    switch (message.animationType) {
      case 'happy':
        return <Laugh className="h-4 w-4 text-yellow-500" />;
      case 'sad':
        return <Frown className="h-4 w-4 text-blue-500" />;
      case 'excited':
        return <Zap className="h-4 w-4 text-orange-500" />;
      case 'love':
        return <Heart className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} fade-in`}>
      <div className={`flex space-x-2 max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {!isOwn && (
          <img
            src={message.userAvatar || `https://ui-avatars.com/api/?name=${message.username}&background=1F3934&color=F3C883`}
            alt={message.username}
            className="w-8 h-8 rounded-full flex-shrink-0"
          />
        )}
        
        <div className={`${getAnimationClass()}`}>
          <div className={`px-4 py-2 rounded-2xl shadow-sm ${
            isOwn 
              ? 'bg-[#1F3934] text-white rounded-br-md' 
              : 'bg-white text-gray-900 rounded-bl-md border border-gray-200'
          }`}>
            {!isOwn && (
              <div className="text-xs font-medium text-[#F3C883] mb-1">
                {message.username}
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              {message.type === 'ai' && (
                <div className="w-2 h-2 bg-[#F3C883] rounded-full"></div>
              )}
              
              {message.type === 'file' && message.fileUrl ? (
                <div className="space-y-2">
                  {message.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img
                      src={message.fileUrl}
                      alt={message.fileName}
                      className="max-w-xs rounded-xl"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded-xl">
                      <div className="w-8 h-8 bg-[#F3C883] rounded-lg flex items-center justify-center">
                        <Download className="h-4 w-4 text-[#1F3934]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {message.fileName}
                        </p>
                      </div>
                    </div>
                  )}
                  {message.content && (
                    <p className="text-sm">{message.content}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm break-words">{message.content}</p>
              )}
              
              {getEmotionIcon()}
            </div>
            
            <div className="flex items-center justify-between mt-1">
              <div className={`text-xs ${isOwn ? 'text-gray-300' : 'text-gray-500'}`}>
                {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
              </div>
              
              {message.type === 'future' && (
                <div className="text-xs bg-[#F3C883] text-[#1F3934] px-2 py-1 rounded-full">
                  Scheduled
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};