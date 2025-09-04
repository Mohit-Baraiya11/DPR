import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, User, Mic, MicOff, Send, RefreshCw, Zap, FileSpreadsheet, ChevronUp, ChevronDown } from 'lucide-react';
import { GestureDetector, triggerHaptic } from '../utils/gestureDetector';
import { ChatMessage } from './shared';


// Main Mobile Chat Interface
const MobileChatInterface = ({ 
  messages, 
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
  user
}) => {
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const gestureRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      if (chatContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollToBottom(!isNearBottom);
      }
    };

    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Initialize gesture detection for chat container
  useEffect(() => {
    if (chatContainerRef.current) {
      gestureRef.current = new GestureDetector(chatContainerRef.current, {
        swipeThreshold: 50,
        longPressDelay: 500
      });

      // Swipe up to show scroll to bottom button
      gestureRef.current.on('onSwipeUp', () => {
        if (showScrollToBottom) {
          scrollToBottom();
          triggerHaptic('light');
        }
      });

      // Swipe down to refresh
      gestureRef.current.on('onSwipeDown', () => {
        if (chatContainerRef.current?.scrollTop === 0) {
          onRefresh?.();
          triggerHaptic('success');
        }
      });
    }

    return () => {
      if (gestureRef.current) {
        gestureRef.current.destroy();
      }
    };
  }, [showScrollToBottom, onRefresh]);

  // Handle message long press
  const handleMessageLongPress = (message, e) => {
    // Could implement message-specific actions here
    console.log('Long pressed message:', message);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="ml-3">
            <h2 className="text-sm font-semibold text-gray-800">SMART DPR</h2>
            <p className="text-xs text-gray-500">
              {mode === 'update' ? 'Update Mode' : 'Chat Mode'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              onRefresh?.();
              triggerHaptic('light');
            }}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
        style={{ 
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 max-w-sm">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Welcome to SMART DPR!
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {mode === 'update' 
                  ? 'Start by describing what you want to update in your sheet.'
                  : 'Ask me anything about your data or project progress.'
                }
              </p>
              <div className="text-xs text-gray-500">
                💡 Switch modes using the buttons below
              </div>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <ChatMessage
              key={index}
              message={message}
              isUser={message.isUser}
              isLoading={message.isLoading}
              isError={message.isError}
              onLongPress={handleMessageLongPress}
              enableGestures={true}
              showActions={true}
              userProfile={user}
            />
          ))
        )}
        
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollToBottom && (
        <div className="absolute bottom-20 right-4">
          <button
            onClick={() => {
              scrollToBottom();
              triggerHaptic('light');
            }}
            className="bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition-colors duration-200"
            title="Scroll to bottom"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>
      )}

    </div>
  );
};

export default MobileChatInterface;
