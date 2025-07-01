import React from 'react';

interface TypingIndicatorProps {
  users: string[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users }) => {
  if (users.length === 0) return null;

  return (
    <div className="flex justify-start">
      <div className="flex space-x-2 max-w-xs lg:max-w-md">
        <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0"></div>
        <div className="bg-white px-4 py-2 rounded-2xl rounded-bl-md border border-gray-200 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">
            {users.length === 1 
              ? `${users[0]} is typing...` 
              : `${users.join(', ')} are typing...`
            }
          </div>
          <div className="typing-indicator">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
        </div>
      </div>
    </div>
  );
};