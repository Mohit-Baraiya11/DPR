import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, MessageSquare, Edit3, Sparkles, Bot, Zap, RefreshCw, HelpCircle, Lightbulb } from 'lucide-react';
import { triggerHaptic } from '../../utils/gestureDetector';

const Input = ({ 
  inputMessage, 
  setInputMessage, 
  onSubmit, 
  mode, 
  setMode, 
  isRecording,
  onToggleRecording,
  disabled = false,
  onRefresh,
  onQuickAction,
  className = ''
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [inputHeight, setInputHeight] = useState('auto');
  const inputRef = useRef(null);
  const textareaRef = useRef(null);

  // Mode configurations with enhanced descriptions
  const modeConfig = {
    chat: {
      icon: MessageSquare,
      label: 'Chat',
      description: 'Ask questions about your data',
      placeholder: 'Ask anything about your data...',
      example: 'Show me all completed tasks this week',
      color: 'text-primary-600',
      bg: 'bg-primary-50',
      gradient: 'from-primary-500 to-primary-600'
    },
    update: {
      icon: Edit3,
      label: 'Update',
      description: 'Add new data to your sheet',
      placeholder: 'Add new data to your sheet...',
      example: 'Building 101: Granite kitchen work completed by 40 cubic meter',
      color: 'text-warning-600',
      bg: 'bg-warning-50',
      gradient: 'from-warning-500 to-warning-600'
    }
  };

  // Smart suggestions based on mode
  const getSuggestions = () => {
    if (mode === 'chat') {
      return [
        'Show me all completed tasks',
        'What was the progress last week?',
        'Which projects are behind schedule?',
        'Summarize today\'s activities'
      ];
    } else {
      return [
        'Building 101: Kitchen work completed',
        'Site A: Foundation work started',
        'Project X: Materials delivered',
        'Location Y: Inspection passed'
      ];
    }
  };

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputMessage]);


  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      triggerHaptic('success');
      onSubmit(e);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };


  const handleSuggestionClick = (suggestion) => {
    setInputMessage(suggestion);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  const currentMode = modeConfig[mode];

  return (
    <div className={`relative ${className}`}>

      {/* Main Input Container */}
      <div className={`glass-effect rounded-3xl shadow-large border border-white/20 transition-all duration-300 ${
        isFocused ? 'shadow-glow-lg scale-[1.01]' : ''
      }`}>
        {/* Compact Mode Toggle */}
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          {/* Mode Toggle Buttons */}
          <div className="flex bg-white/40 rounded-xl p-1">
            <button
              onClick={() => {
                setMode('chat');
                triggerHaptic('light');
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                mode === 'chat' 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              disabled={disabled}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Chat</span>
            </button>
            
            <button
              onClick={() => {
                setMode('update');
                triggerHaptic('light');
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                mode === 'update' 
                  ? 'bg-white text-warning-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              disabled={disabled}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Update</span>
            </button>
          </div>

          {/* Suggestions Toggle */}
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-gray-600 hover:bg-white/50 transition-all duration-200"
            title="Suggestions"
          >
            <Lightbulb className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Tips</span>
          </button>
        </div>

        {/* Compact Suggestions */}
        {showSuggestions && (
          <div className="px-3 py-2 border-b border-white/10 animate-fade-in">
            <div className="flex flex-wrap gap-1.5">
              {getSuggestions().slice(0, 4).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/50 hover:bg-white/80 text-gray-700 hover:text-gray-900 transition-all duration-200 text-xs font-medium hover:scale-[1.02]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-3">
          <div className="flex items-end space-x-3">
            {/* Textarea */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={isRecording ? '🎤 Recording...' : currentMode.placeholder}
                disabled={disabled}
                rows={1}
                className="w-full bg-transparent border-0 outline-none text-gray-800 placeholder-gray-500 text-base focus:placeholder-gray-400 font-medium resize-none overflow-hidden min-h-[24px] max-h-[120px]"
                style={{ height: 'auto' }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              {/* Voice Input Button */}
              <button
                type="button"
                onClick={onToggleRecording}
                className={`flex items-center justify-center h-12 w-12 rounded-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-soft hover:scale-110 ${
                  isRecording 
                    ? 'bg-gradient-to-r from-error-500 to-error-600 text-white hover:shadow-glow animate-pulse-soft' 
                    : 'bg-white/80 text-gray-600 hover:bg-white hover:shadow-medium focus:ring-primary-500'
                }`}
                title={isRecording ? 'Stop recording' : 'Start voice input'}
                disabled={disabled}
              >
                {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              
              {/* Send Button */}
              <button
                type="submit"
                onClick={handleSubmit}
                className={`flex items-center justify-center h-12 w-12 rounded-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-soft ${
                  inputMessage.trim() && !disabled
                    ? `bg-gradient-to-r ${currentMode.gradient} text-white hover:shadow-glow scale-100 hover:scale-110`
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed focus:ring-gray-500'
                }`}
                disabled={!inputMessage.trim() || disabled}
                title="Send message"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Input;
