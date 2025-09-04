import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileSpreadsheet, RefreshCw, MessageSquare, ChevronDown, ChevronRight, ChevronLeft, LogOut, User, Menu, X, Settings, Search, Sparkles, Bot, Edit3, Calendar, MoreHorizontal } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { getChatsBySheetId } from '../../utils/chatStorage';
import { GestureDetector, triggerHaptic } from '../../utils/gestureDetector';
import { RippleEffect } from '../VisualFeedback';
import UserProfile from './UserProfile';

const Navigation = ({
  sheets = [],
  currentSheetId,
  onSelectSheet,
  onRefresh,
  onSelectChat,
  activeChatId,
  isOpen = true,
  onToggle,
  user,
  onLogout,
  className = ''
}) => {
  const [view, setView] = useState('sheets'); // 'sheets' or 'chats'
  const [chatHistory, setChatHistory] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState('sheets');
  const [swipeStartX, setSwipeStartX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigationRef = useRef(null);
  const gestureRef = useRef(null);
  const searchRef = useRef(null);

  const tabs = [
    { id: 'sheets', label: 'Sheets', icon: FileSpreadsheet, color: 'text-primary-600', bg: 'bg-primary-50' },
    { id: 'chats', label: 'Chat', icon: MessageSquare, color: 'text-secondary-600', bg: 'bg-secondary-50' }
  ];

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

  // Reset view to 'sheets' when sidebar is opened
  useEffect(() => {
    if (isOpen) {
      setView('sheets');
      setActiveTab('sheets');
    }
  }, [isOpen]);

  // Load chat history when sheet changes
  const loadChats = useCallback(async () => {
    if (!currentSheetId) {
      console.log('No currentSheetId provided');
      return;
    }
    
    try {
      setLoadingChats(true);
      console.log('Loading chats for sheet:', currentSheetId);
      
      // Get all chats to debug
      const allChats = JSON.parse(localStorage.getItem('dpr_chat_history') || '{}');
      console.log('All chats in localStorage:', allChats);
      
      const chats = await getChatsBySheetId(currentSheetId);
      console.log('Processed chats from getChatsBySheetId:', chats);
      
      setChatHistory(chats);
      setError(null);
    } catch (err) {
      console.error('Error loading chat history:', err);
      setError('Failed to load chat history');
    } finally {
      setLoadingChats(false);
    }
  }, [currentSheetId]);

  useEffect(() => {
    console.log('View changed to:', view);
    if (view === 'chats') {
      console.log('Loading chats...');
      loadChats();
    }
  }, [view, loadChats]);

  // Initialize gesture detection for mobile
  useEffect(() => {
    if (isMobile && navigationRef.current) {
      gestureRef.current = new GestureDetector(navigationRef.current, {
        swipeThreshold: 50,
        longPressDelay: 300
      });

      // Swipe left/right to switch tabs
      gestureRef.current.on('onSwipeLeft', () => {
        const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
        if (currentIndex < tabs.length - 1) {
          setActiveTab(tabs[currentIndex + 1].id);
          setView(tabs[currentIndex + 1].id);
          triggerHaptic('light');
        }
      });

      gestureRef.current.on('onSwipeRight', () => {
        const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
        if (currentIndex > 0) {
          setActiveTab(tabs[currentIndex - 1].id);
          setView(tabs[currentIndex - 1].id);
          triggerHaptic('light');
        }
      });

      // Long press for quick actions
      gestureRef.current.on('onLongPress', () => {
        triggerHaptic('medium');
        // Could show quick actions menu
      });
    }

    return () => {
      if (gestureRef.current) {
        gestureRef.current.destroy();
      }
    };
  }, [isMobile, activeTab, tabs]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'No date';
    try {
      const date = new Date(dateString);
      if (isToday(date)) return 'Today';
      if (isYesterday(date)) return 'Yesterday';
      return format(date, 'EEEE, MMMM d, yyyy');
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid date';
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return format(date, 'h:mm a');
    } catch (e) {
      return '';
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setView(tabId);
    triggerHaptic('light');
  };

  const handleSheetSelect = (sheet) => {
    onSelectSheet(sheet);
    triggerHaptic('success');
    // Auto-close sidebar on mobile after selection
    if (isMobile) {
      onToggle();
    }
  };

  const handleLogout = () => {
    triggerHaptic('medium');
    onLogout();
  };

  // Filter sheets based on search only
  const filteredSheets = sheets.filter(sheet => {
    const matchesSearch = sheet.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const renderSheetsList = () => (
    <div className="flex flex-col h-full">
      {/* Search Bar - Matching chat input style */}
      <div className="p-4 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search sheets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 shadow-soft"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Sheets List - Chat-like message bubbles */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {filteredSheets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in-up">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center mb-6 shadow-large animate-float">
              <FileSpreadsheet className="h-10 w-10 text-primary-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              {searchQuery ? 'No sheets found' : 'No sheets available'}
            </h3>
            <p className="text-sm text-gray-600 mb-6 max-w-xs">
              {searchQuery ? 'Try adjusting your search terms' : 'Connect your Google Sheets to get started'}
            </p>
            <button
              onClick={onRefresh}
              className="btn-primary text-sm px-6 py-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSheets.map((sheet, index) => (
              <div 
                key={sheet.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <RippleEffect>
                  <button
                    onClick={() => handleSheetSelect(sheet)}
                    className={`w-full text-left p-4 rounded-2xl transition-all duration-300 group hover:scale-[1.02] ${
                      sheet.id === currentSheetId 
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-large border border-primary-400' 
                        : 'bg-white/90 backdrop-blur-sm border border-white/20 hover:bg-white hover:shadow-medium hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {/* Avatar-like icon */}
                      <div className={`flex-shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center shadow-soft transition-all duration-300 ${
                        sheet.id === currentSheetId 
                          ? 'bg-white/20 text-white' 
                          : 'bg-gradient-to-br from-primary-100 to-primary-200 text-primary-600 group-hover:shadow-medium'
                      }`}>
                        <FileSpreadsheet className="h-6 w-6" />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`text-sm font-semibold truncate ${
                            sheet.id === currentSheetId ? 'text-white' : 'text-gray-800'
                          }`}>
                            {sheet.name}
                          </h4>
                          {sheet.id === currentSheetId && (
                            <div className="flex-shrink-0">
                              <div className="w-2 h-2 bg-white rounded-full animate-pulse-soft"></div>
                            </div>
                          )}
                        </div>
                        {sheet.lastModified && (
                          <p className={`text-xs truncate ${
                            sheet.id === currentSheetId ? 'text-primary-100' : 'text-gray-500'
                          }`}>
                            {formatDisplayDate(sheet.lastModified)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                </RippleEffect>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderChatHistory = () => {
    if (loadingChats) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in-up">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-secondary-100 to-secondary-200 flex items-center justify-center mb-4 shadow-large animate-float">
            <RefreshCw className="animate-spin h-8 w-8 text-secondary-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Loading Conversations</h3>
          <p className="text-sm text-gray-600">Fetching your chat history...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in-up">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-error-100 to-error-200 flex items-center justify-center mb-6 shadow-large animate-float">
            <X className="h-10 w-10 text-error-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Error Loading History</h3>
          <p className="text-sm text-gray-600 mb-6 max-w-xs">Something went wrong while loading your conversations</p>
          <button 
            onClick={loadChats}
            className="btn-primary text-sm px-6 py-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
        </div>
      );
    }

    if (chatHistory.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in-up">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-secondary-100 to-secondary-200 flex items-center justify-center mb-6 shadow-large animate-float">
            <MessageSquare className="h-10 w-10 text-secondary-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">No Conversations Yet</h3>
          <p className="text-sm text-gray-600 mb-6 max-w-xs">Start chatting to see your conversation history here</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        {/* Chat History Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Recent Conversations</h3>
            <button
              onClick={loadChats}
              className="p-2 rounded-xl text-gray-500 hover:bg-white/50 hover:text-gray-700 transition-all duration-200 hover:scale-105"
              title="Refresh chat history"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Chat History List - Chat-like message bubbles */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          <div className="space-y-3">
            {chatHistory.map((chat, index) => (
              <div 
                key={chat.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <RippleEffect>
                  <button
                    onClick={() => onSelectChat(chat)}
                    className={`w-full text-left p-4 rounded-2xl transition-all duration-300 group hover:scale-[1.02] ${
                      activeChatId === chat.id
                        ? 'bg-gradient-to-r from-secondary-500 to-secondary-600 text-white shadow-large border border-secondary-400'
                        : 'bg-white/90 backdrop-blur-sm border border-white/20 hover:bg-white hover:shadow-medium hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {/* Avatar-like icon */}
                      <div className={`flex-shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center shadow-soft transition-all duration-300 ${
                        activeChatId === chat.id
                          ? 'bg-white/20 text-white'
                          : 'bg-gradient-to-br from-secondary-100 to-secondary-200 text-secondary-600 group-hover:shadow-medium'
                      }`}>
                        <MessageSquare className="h-6 w-6" />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`text-sm font-semibold ${
                            activeChatId === chat.id ? 'text-white' : 'text-gray-800'
                          }`}>
                            {formatDisplayDate(chat.date)}
                          </h4>
                          <span className={`text-xs ${
                            activeChatId === chat.id ? 'text-secondary-100' : 'text-gray-500'
                          }`}>
                            {formatTime(chat.updatedAt || chat.date)}
                          </span>
                        </div>
                        {chat.messages?.length > 0 && (
                          <p className={`text-xs truncate ${
                            activeChatId === chat.id ? 'text-secondary-100' : 'text-gray-600'
                          }`}>
                            {chat.messages[chat.messages.length - 1].text}
                          </p>
                        )}
                      </div>
                      
                      {activeChatId === chat.id && (
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse-soft"></div>
                        </div>
                      )}
                    </div>
                  </button>
                </RippleEffect>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };


  const renderTabContent = () => {
    switch (activeTab) {
      case 'sheets':
        return renderSheetsList();
      case 'chats':
        return renderChatHistory();
      default:
        return renderSheetsList();
    }
  };

  // Mobile Layout
  if (isMobile) {
    return (
      <div className={`fixed inset-0 z-50 transition-all duration-300 ease-in-out ${
        isOpen 
          ? 'bg-black/50 backdrop-blur-sm opacity-100' 
          : 'bg-transparent backdrop-blur-none opacity-0 pointer-events-none'
      }`}>
        <div 
          ref={navigationRef}
          className={`fixed left-0 top-0 h-full w-80 glass-effect shadow-large transform transition-transform duration-300 ease-in-out ${
            isOpen 
              ? 'translate-x-0' 
              : '-translate-x-full'
          }`}
        >
          {/* Header - Mobile optimized */}
          <div className="relative overflow-hidden">
            {/* Background with animated gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20"></div>
            
            {/* Animated background elements */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-10 translate-x-10 animate-pulse-soft"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full translate-y-8 -translate-x-8 animate-pulse-soft" style={{ animationDelay: '1s' }}></div>
            
            {/* Content */}
            <div className="relative z-10 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* Enhanced logo with glow effect */}
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-large animate-float border border-white/30">
                      <Sparkles className="h-7 w-7 text-white drop-shadow-lg" />
                    </div>
                    {/* Glow effect */}
                    <div className="absolute inset-0 w-12 h-12 rounded-2xl bg-white/20 blur-lg animate-pulse-soft"></div>
                  </div>
                  
                  {/* Enhanced text with better typography */}
                  <div className="space-y-0.5">
                    <h1 className="text-lg font-black text-white tracking-tight drop-shadow-lg">
                      SMART DPR
                    </h1>
                    <div className="flex items-center space-x-1.5">
                      <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-pulse-soft"></div>
                      <p className="text-xs text-white/90 font-semibold tracking-wide">
                        AI-Powered Sheets
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-0.5 h-0.5 bg-white/40 rounded-full"></div>
                      <div className="w-0.5 h-0.5 bg-white/60 rounded-full animate-pulse-soft"></div>
                      <div className="w-0.5 h-0.5 bg-white/40 rounded-full"></div>
                      <span className="text-xs text-white/70 ml-1.5 font-medium">Smart Processing</span>
                    </div>
                  </div>
                </div>
                
                {/* Mobile Close Button - Only show on mobile */}
                {isMobile && onToggle && (
                  <button
                    onClick={onToggle}
                    className="group relative p-2.5 hover:bg-white/20 rounded-xl transition-all duration-300 hover:scale-110"
                  >
                    <div className="absolute inset-0 rounded-xl bg-white/10 group-hover:bg-white/20 transition-all duration-300"></div>
                    <ChevronLeft className="h-5 w-5 text-white relative z-10 drop-shadow-sm transition-transform duration-300" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-white/10">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex-1 flex items-center justify-center py-4 text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? `${tab.bg} ${tab.color} border-b-2 border-current`
                      : 'text-gray-500 hover:text-gray-700 hover:bg-white/20'
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content - Constrained height */}
          <div className="flex-1 overflow-hidden min-h-0">
            {renderTabContent()}
          </div>


          {/* Tab Swipe Indicators */}
          <div className="flex justify-center space-x-2 p-4 border-t border-white/10">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  activeTab === tab.id ? 'bg-primary-500 scale-125' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
                  {/* User Profile Section - Mobile - Fixed to bottom */}
                  {user && (
                    <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
              <UserProfile 
                user={user}
                onLogout={onLogout}
                variant="compact"
                showSettings={false}
                showLogout={true}
                />
            </div>
          )}
          </div>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className={`h-full flex flex-col glass-effect border-r border-white/20 transform transition-transform duration-300 ease-in-out ${
      isOpen 
        ? 'translate-x-0' 
        : '-translate-x-full'
    } ${className}`}>
      {/* Header with modern gradient design */}
      <div className="relative overflow-hidden">
        {/* Background with animated gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20"></div>
        
        {/* Animated background elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16 animate-pulse-soft"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12 animate-pulse-soft" style={{ animationDelay: '1s' }}></div>
        
        {/* Content */}
        <div className="relative z-10 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Enhanced logo with glow effect */}
              <div className="relative">
                <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-large animate-float border border-white/30">
                  <Sparkles className="h-9 w-9 text-white drop-shadow-lg" />
                </div>
                {/* Glow effect */}
                <div className="absolute inset-0 w-16 h-16 rounded-3xl bg-white/20 blur-xl animate-pulse-soft"></div>
              </div>
              
              {/* Enhanced text with better typography */}
              <div className="space-y-1">
                <h1 className="text-2xl font-black text-white tracking-tight drop-shadow-lg">
                  SMART DPR
                </h1>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse-soft"></div>
                  <p className="text-sm text-white/90 font-semibold tracking-wide">
                    AI-Powered Sheets
                  </p>
                </div>
                <div className="flex items-center space-x-1 mt-1">
                  <div className="w-1 h-1 bg-white/40 rounded-full"></div>
                  <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse-soft"></div>
                  <div className="w-1 h-1 bg-white/40 rounded-full"></div>
                  <span className="text-xs text-white/70 ml-2 font-medium">Intelligent Data Processing</span>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>

      {/* Tab Navigation - Enhanced styling */}
      <div className="border-b border-white/10">
        <div className="flex">
          <button
            onClick={() => setView('sheets')}
            className={`flex-1 py-5 px-6 text-sm font-semibold text-center flex items-center justify-center transition-all duration-200 ${
              view === 'sheets' 
                ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-500 shadow-soft' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/20'
            }`}
          >
            <FileSpreadsheet className="h-5 w-5 mr-3" />
            Sheets
          </button>
          <button
            onClick={() => setView('chats')}
            className={`flex-1 py-5 px-6 text-sm font-semibold text-center flex items-center justify-center transition-all duration-200 ${
              view === 'chats' 
                ? 'bg-secondary-50 text-secondary-700 border-b-2 border-secondary-500 shadow-soft' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/20'
            }`}
            disabled={!currentSheetId}
          >
            <MessageSquare className="h-5 w-5 mr-3" />
            Chat History
          </button>
        </div>
      </div>

      {/* Content Area - Constrained height */}
      <div className="flex-1 overflow-hidden min-h-0">
        {view === 'sheets' ? renderSheetsList() : renderChatHistory()}
      </div>
      
      {/* User Profile Section - Fixed to bottom */}
      {user && (
        <div className="border-t border-white/10 p-6 bg-white/5 backdrop-blur-sm">
          <UserProfile 
            user={user}
            onLogout={onLogout}
            variant="compact"
            showSettings={false}
            showLogout={true}
          />
        </div>
      )}
    </div>
  );
};

export default Navigation;
