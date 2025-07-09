import React, { useState, useRef } from 'react';
import { Send, Paperclip, Smile, Mic, Image, Calendar, Camera, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

interface MessageInputProps {
  onSendMessage: (content: string, type?: string, fileData?: any) => void;
  onTyping: (isTyping: boolean) => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, onTyping }) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAIFeatures, setShowAIFeatures] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    onTyping(e.target.value.length > 0);
  };

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/messages/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        onSendMessage(
          `Shared ${file.name}`,
          'file',
          {
            fileUrl: data.fileUrl,
            fileName: data.originalName,
            fileSize: data.fileSize
          }
        );
        toast.success('File uploaded successfully');
      } else {
        toast.error('Failed to upload file');
      }
    } catch (error) {
      toast.error('Failed to upload file');
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const detectEmotion = async (text: string) => {
    try {
      const response = await fetch('/api/ai/emotion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: text })
      });

      if (response.ok) {
        const data = await response.json();
        return data.emotion;
      }
    } catch (error) {
      console.error('Emotion detection failed:', error);
    }
    return null;
  };

  const handleImageAnalysis = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Upload image first
      const uploadResponse = await fetch('/api/messages/upload', {
        method: 'POST',
        body: formData
      });

      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();
        
        // Analyze image
        const analysisResponse = await fetch('/api/ai/analyze-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            imageUrl: `${window.location.origin}${uploadData.fileUrl}`,
            question: "What is in this image? Describe it in detail."
          })
        });

        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json();
          
          // Send both image and analysis
          onSendMessage(
            `Image Analysis: ${analysisData.analysis}`,
            'file',
            {
              fileUrl: uploadData.fileUrl,
              fileName: uploadData.originalName,
              fileSize: uploadData.fileSize
            }
          );
          toast.success('Image analyzed and sent');
        }
      }
    } catch (error) {
      toast.error('Failed to analyze image');
    }
  };
  const handleSendWithEmotion = async () => {
    if (message.trim()) {
      const emotion = await detectEmotion(message.trim());
      onSendMessage(message.trim(), 'text', { animationType: emotion });
      setMessage('');
    }
  };

  const emojis = ['😀', '😂', '😍', '😢', '😡', '😮', '👍', '❤️', '🔥', '✨'];

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={message}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#F3C883] focus:border-transparent"
          />
          
          <div className="absolute right-3 top-3 flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Smile className="h-5 w-5" />
            </button>
            
            <button
              type="button"
              onClick={() => setShowAIFeatures(!showAIFeatures)}
              className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-2xl transition-colors"
            >
              <Zap className="h-5 w-5" />
            </button>
          </div>
          
          {showEmojiPicker && (
            <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-2xl p-3 shadow-lg">
              <div className="grid grid-cols-5 gap-2">
                {emojis.map((emoji, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleEmojiClick(emoji)}
                    className="text-lg hover:bg-gray-100 p-1 rounded transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
            className="hidden"
          />
          
          <input
            type="file"
            ref={imageInputRef}
            accept="image/*"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
            className="hidden"
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-2xl transition-colors"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-2xl transition-colors"
          >
            <Image className="h-5 w-5" />
          </button>
          
          <button
            type="button"
            onClick={() => {
              setIsRecording(!isRecording);
              toast.info(isRecording ? 'Recording stopped' : 'Recording started');
            }}
            className={`p-3 rounded-2xl transition-colors ${
              isRecording 
                ? 'bg-red-500 text-white' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Mic className="h-5 w-5" />
          </button>
          
          <button
            type="button"
            onClick={handleSendWithEmotion}
            className="p-3 bg-[#1F3934] text-white rounded-2xl hover:bg-[#2D4A3E] transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
      
      {/* AI Features Popup */}
      {showAIFeatures && (
        <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-2xl p-3 shadow-lg min-w-[200px]">
          <div className="space-y-2">
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleImageAnalysis(file);
                };
                input.click();
                setShowAIFeatures(false);
              }}
              className="flex items-center space-x-2 w-full px-3 py-2 text-left hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Camera className="h-4 w-4" />
              <span className="text-sm">Analyze Image</span>
            </button>
            
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/ai/suggestions', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      message: 'Generate conversation starters',
                      context: 'casual chat'
                    })
                  });
                  
                  if (response.ok) {
                    const data = await response.json();
                    if (data.suggestions && data.suggestions.length > 0) {
                      setMessage(data.suggestions[0]);
                    }
                  }
                } catch (error) {
                  toast.error('Failed to get suggestions');
                }
                setShowAIFeatures(false);
              }}
              className="flex items-center space-x-2 w-full px-3 py-2 text-left hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Zap className="h-4 w-4" />
              <span className="text-sm">Smart Suggestions</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};