import React, { useState, useRef } from 'react';
import { X, Upload, Scissors, Download, Type, Mic } from 'lucide-react';
import toast from 'react-hot-toast';

interface MediaEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (processedFile: any) => void;
}

export const MediaEditor: React.FC<MediaEditorProps> = ({ isOpen, onClose, onSave }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [caption, setCaption] = useState('');
  const [voiceoverText, setVoiceoverText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setActiveTab('edit');
    }
  };

  const processMedia = async (action: string, options: any = {}) => {
    if (!selectedFile) return;

    setIsProcessing(true);
    try {
      // Upload file first
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadResponse = await fetch('/api/messages/upload', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadData = await uploadResponse.json();

      // Process the file
      const processResponse = await fetch('/api/editor/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          fileUrl: uploadData.fileUrl,
          options
        })
      });

      if (processResponse.ok) {
        const processedData = await processResponse.json();
        toast.success(`${action} completed successfully`);
        onSave({
          ...uploadData,
          processedUrl: processedData.processedUrl,
          metadata: processedData.metadata
        });
        onClose();
      } else {
        throw new Error('Processing failed');
      }
    } catch (error) {
      toast.error('Processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTrim = () => {
    processMedia('trim', { startTime: trimStart, endTime: trimEnd });
  };

  const handleAddCaption = () => {
    processMedia('caption', { caption });
  };

  const handleVoiceover = () => {
    processMedia('voiceover', { text: voiceoverText });
  };

  const handleConvert = (format: string) => {
    processMedia('convert', { format });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Media Editor</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
          {['upload', 'edit', 'effects'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl transition-colors ${
                activeTab === tab
                  ? 'bg-[#1F3934] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,video/*,audio/*"
              className="hidden"
            />
            
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-[#F3C883] transition-colors"
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Click to upload media file</p>
              <p className="text-sm text-gray-400 mt-2">
                Supports images, videos, and audio files
              </p>
            </div>

            {selectedFile && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-medium text-gray-900 mb-2">Selected File</h3>
                <p className="text-sm text-gray-600">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
          </div>
        )}

        {/* Edit Tab */}
        {activeTab === 'edit' && selectedFile && (
          <div className="space-y-6">
            {/* Trim Section */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-4">
                <Scissors className="h-5 w-5 text-[#1F3934]" />
                <h3 className="font-medium text-gray-900">Trim</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time (%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={trimStart}
                    onChange={(e) => setTrimStart(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-500">{trimStart}%</span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time (%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={trimEnd}
                    onChange={(e) => setTrimEnd(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-500">{trimEnd}%</span>
                </div>
                
                <button
                  onClick={handleTrim}
                  disabled={isProcessing}
                  className="bg-[#1F3934] text-white px-4 py-2 rounded-xl hover:bg-[#2D4A3E] disabled:opacity-50 transition-colors"
                >
                  {isProcessing ? 'Processing...' : 'Apply Trim'}
                </button>
              </div>
            </div>

            {/* Caption Section */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-4">
                <Type className="h-5 w-5 text-[#1F3934]" />
                <h3 className="font-medium text-gray-900">Add Caption</h3>
              </div>
              
              <div className="space-y-4">
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Enter caption text..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F3C883]"
                  rows={3}
                />
                
                <button
                  onClick={handleAddCaption}
                  disabled={isProcessing || !caption.trim()}
                  className="bg-[#1F3934] text-white px-4 py-2 rounded-xl hover:bg-[#2D4A3E] disabled:opacity-50 transition-colors"
                >
                  {isProcessing ? 'Processing...' : 'Add Caption'}
                </button>
              </div>
            </div>

            {/* Voiceover Section */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-4">
                <Mic className="h-5 w-5 text-[#1F3934]" />
                <h3 className="font-medium text-gray-900">AI Voiceover</h3>
              </div>
              
              <div className="space-y-4">
                <textarea
                  value={voiceoverText}
                  onChange={(e) => setVoiceoverText(e.target.value)}
                  placeholder="Enter text for AI voiceover..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F3C883]"
                  rows={3}
                />
                
                <button
                  onClick={handleVoiceover}
                  disabled={isProcessing || !voiceoverText.trim()}
                  className="bg-[#1F3934] text-white px-4 py-2 rounded-xl hover:bg-[#2D4A3E] disabled:opacity-50 transition-colors"
                >
                  {isProcessing ? 'Processing...' : 'Generate Voiceover'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Effects Tab */}
        {activeTab === 'effects' && selectedFile && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-medium text-gray-900 mb-4">Convert Format</h3>
              <div className="grid grid-cols-3 gap-3">
                {['mp4', 'webm', 'gif', 'jpg', 'png', 'mp3'].map((format) => (
                  <button
                    key={format}
                    onClick={() => handleConvert(format)}
                    disabled={isProcessing}
                    className="bg-white border border-gray-300 px-4 py-2 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    .{format}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-medium text-gray-900 mb-4">Quick Effects</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => processMedia('filter', { type: 'blur' })}
                  disabled={isProcessing}
                  className="bg-white border border-gray-300 px-4 py-2 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Blur
                </button>
                <button
                  onClick={() => processMedia('filter', { type: 'sepia' })}
                  disabled={isProcessing}
                  className="bg-white border border-gray-300 px-4 py-2 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Sepia
                </button>
                <button
                  onClick={() => processMedia('filter', { type: 'grayscale' })}
                  disabled={isProcessing}
                  className="bg-white border border-gray-300 px-4 py-2 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Grayscale
                </button>
                <button
                  onClick={() => processMedia('filter', { type: 'vintage' })}
                  disabled={isProcessing}
                  className="bg-white border border-gray-300 px-4 py-2 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Vintage
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};