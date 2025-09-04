import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, User, Copy, RefreshCw, Check, Clock, AlertCircle, Bot, Sparkles } from 'lucide-react';
import { GestureDetector, triggerHaptic } from '../../utils/gestureDetector';

const ChatMessage = ({ 
  message, 
  isUser, 
  isLoading, 
  isError, 
  onLongPress,
  enableGestures = false,
  showActions = true,
  className = '',
  onRegenerate,
  onCopy,
  userProfile = null
}) => {
  const messageRef = useRef(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);

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

  // Initialize gesture detection for mobile
  useEffect(() => {
    if (enableGestures && messageRef.current && isMobile) {
      const gestureDetector = new GestureDetector(messageRef.current, {
        longPressDelay: 300
      });

      gestureDetector.on('onLongPress', (e) => {
        if (!isUser && showActions) {
          setShowActionMenu(true);
          triggerHaptic('medium');
          onLongPress?.(message, e);
        }
      });

      gestureDetector.on('onTap', () => {
        if (showActionMenu) {
          setShowActionMenu(false);
        }
      });

      return () => gestureDetector.destroy();
    }
  }, [enableGestures, isMobile, isUser, showActions, onLongPress, message]);

  // Handle copy action
  const handleCopy = async () => {
    if (message?.content || message?.text) {
      try {
        await navigator.clipboard.writeText(message.content || message.text);
        setCopied(true);
        triggerHaptic('success');
        setTimeout(() => setCopied(false), 2000);
        onCopy?.(message);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
    setShowActionMenu(false);
  };

  // Handle regenerate action
  const handleRegenerate = () => {
    triggerHaptic('light');
    setShowActionMenu(false);
    onRegenerate?.(message);
  };

  // Loading state with modern animation
  if (isLoading) {
    return (
      <div className={`flex justify-start mb-6 animate-fade-in-up ${className}`}>
        <div className="flex max-w-xs md:max-w-md lg:max-w-lg xl:max-w-2xl">
          {/* Avatar */}
          <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center mr-4 bg-gradient-to-br from-primary-100 to-primary-200 text-primary-600 shadow-soft">
            <Bot size={18} className="animate-pulse-soft" />
          </div>
          
          {/* Loading Message */}
          <div className="message-bubble-assistant px-6 py-4 animate-pulse-soft">
            <div className="flex items-center space-x-2 mb-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-xs text-gray-500 font-medium">SMART DPR is thinking...</span>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded loading-shimmer"></div>
              <div className="h-4 bg-gray-200 rounded loading-shimmer w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded loading-shimmer w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get message content
  const messageContent = message?.content || message?.text || message;
  const messageTimestamp = message?.timestamp;

  return (
    <div 
      ref={messageRef}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 relative animate-fade-in-up ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex max-w-[320px] sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl ${isUser ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center shadow-soft transition-all duration-300 overflow-hidden ${
          isUser 
            ? 'ml-4 bg-gradient-to-br from-primary-500 to-primary-600 text-white hover:shadow-glow' 
            : isError
              ? 'mr-4 bg-gradient-to-br from-error-100 to-error-200 text-error-600'
              : 'mr-4 bg-gradient-to-br from-secondary-100 to-secondary-200 text-secondary-600 hover:shadow-glow'
        }`}>
          {isUser ? (
            userProfile?.picture ? (
              <img 
                src={userProfile.picture} 
                alt={userProfile.name || 'User'} 
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  // Fallback to User icon if image fails to load
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null
          ) : null}
          {isUser && (!userProfile?.picture || userProfile.picture === null) ? (
            <User size={18} />
          ) : isError ? (
            <AlertCircle size={18} />
          ) : (
            <Bot size={18} />
          )}
        </div>
        
        {/* Message Content */}
        <div className={`px-6 py-4 relative transition-all duration-300 ${
          isUser 
            ? 'message-bubble-user hover:shadow-medium' 
            : isError 
              ? 'message-bubble-error' 
              : 'message-bubble-assistant hover:shadow-medium'
        }`}>
          {/* Message Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {!isUser && !isError && (
                <Sparkles size={14} className="text-secondary-500" />
              )}
              <span className={`text-xs font-medium ${
                isUser ? 'text-primary-100' : isError ? 'text-error-600' : 'text-gray-500'
              }`}>
                {isUser ? 'You' : isError ? 'Error' : 'SMART DPR'}
              </span>
            </div>
            
            {/* Message Status */}
            <div className="flex items-center space-x-1">
              {messageTimestamp && (
                <div className={`text-xs flex items-center space-x-1 ${
                  isUser ? 'text-primary-100' : 'text-gray-400'
                }`}>
                  <Clock size={10} />
                  <span>{new Date(messageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
            </div>
          </div>

          {/* Message Text */}
          <div className={`text-sm leading-relaxed whitespace-pre-wrap ${
            isUser ? 'text-white' : isError ? 'text-error-800' : 'text-gray-800'
          }`}>
            {messageContent}
          </div>

          {/* Action Buttons - Desktop */}
          {!isMobile && !isUser && showActions && (isHovered || showActionMenu) && (
            <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 flex space-x-1 animate-scale-in">
              <button
                onClick={handleCopy}
                className={`p-2 rounded-full shadow-soft transition-all duration-200 hover:scale-110 ${
                  copied 
                    ? 'bg-success-100 text-success-600' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                title={copied ? 'Copied!' : 'Copy message'}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
              {onRegenerate && (
                <button
                  onClick={handleRegenerate}
                  className="p-2 rounded-full bg-white text-gray-600 hover:bg-gray-50 shadow-soft transition-all duration-200 hover:scale-110"
                  title="Regenerate response"
                >
                  <RefreshCw size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Menu - Mobile */}
      {showActionMenu && !isUser && showActions && isMobile && (
        <div className="absolute top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-large p-3 z-10 animate-scale-in">
          <div className="flex space-x-3">
            <button
              onClick={handleCopy}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                copied 
                  ? 'bg-success-100 text-success-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {copied ? <Check size={16} className="mr-2" /> : <Copy size={16} className="mr-2" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            {onRegenerate && (
              <button
                onClick={handleRegenerate}
                className="flex items-center px-4 py-2 text-sm font-medium bg-primary-100 text-primary-700 hover:bg-primary-200 rounded-xl transition-all duration-200"
              >
                <RefreshCw size={16} className="mr-2" />
                Regenerate
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
