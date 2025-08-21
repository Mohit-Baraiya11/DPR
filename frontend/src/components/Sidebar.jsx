import React, { useState, useEffect, useCallback } from 'react';
import { FileSpreadsheet, RefreshCw, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { getChatsBySheetId } from '../utils/chatStorage';

const Sidebar = ({
  sheets = [],
  currentSheetId,
  onSelectSheet,
  onRefresh,
  onSelectChat,
  activeChatId,
  isOpen = true,
  onToggle
}) => {
  const [view, setView] = useState('sheets'); // 'sheets' or 'chats'
  const [chatHistory, setChatHistory] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);

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

  const renderSheetsList = () => (
    <div className="overflow-y-auto flex-1">
      {sheets.length === 0 ? (
        <div className="p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <FileSpreadsheet className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">No sheets found</p>
          <button
            onClick={onRefresh}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Refresh
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {sheets.map((sheet) => (
            <li key={sheet.id}>
              <button
                onClick={() => onSelectSheet(sheet)}
                className={`w-full text-left p-3 text-sm flex items-center ${
                  sheet.id === currentSheetId 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-700 hover:bg-gray-50'
                } transition-colors duration-150`}
              >
                <FileSpreadsheet 
                  className={`h-4 w-4 mr-3 flex-shrink-0 ${
                    sheet.id === currentSheetId ? 'text-blue-500' : 'text-gray-400'
                  }`} 
                />
                <span className="truncate">{sheet.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const renderChatHistory = () => {
    if (loadingChats) {
      return (
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="animate-spin h-5 w-5 text-gray-400" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-4 text-red-500 text-sm">
          <p>Error loading chat history</p>
          <button 
            onClick={loadChats}
            className="mt-2 text-blue-500 hover:underline"
          >
            Retry
          </button>
        </div>
      );
    }

    if (chatHistory.length === 0) {
      return (
        <div className="p-4 text-gray-500 text-sm">
          No chat history for this sheet
        </div>
      );
    }

    return (
      <div className="overflow-y-auto flex-1">
        <div className="py-1">
          {chatHistory.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat)}
              className={`w-full flex items-center px-3 py-2 text-sm text-left ${
                activeChatId === chat.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0 text-gray-400" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between">
                  <span className="truncate">
                    {formatDisplayDate(chat.date)}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    {formatTime(chat.updatedAt || chat.date)}
                  </span>
                </div>
                {chat.messages?.length > 0 && (
                  <p className="text-xs text-gray-500 truncate">
                    {chat.messages[chat.messages.length - 1].text}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header with same height as main navbar */}
      <div className="h-[60px] border-b border-gray-200 flex flex-col">
        <div className="flex flex-1">
          <button
            onClick={() => setView('sheets')}
            className={`flex-1 py-2 px-4 text-sm font-medium text-center flex items-center justify-center ${
              view === 'sheets' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Sheets
          </button>
          <button
            onClick={() => setView('chats')}
            className={`flex-1 py-2 px-4 text-sm font-medium text-center flex items-center justify-center ${
              view === 'chats' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            disabled={!currentSheetId}
          >
            Chat History
          </button>
        </div>
      </div>

      <div className="p-3 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-sm font-medium text-gray-900">
          {view === 'sheets' ? 'Your Sheets' : 'Chat History'}
        </h2>
        {view === 'sheets' ? (
          <button
            onClick={onRefresh}
            className="p-1 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none"
            title="Refresh sheets"
            disabled={loadingChats}
          >
            <RefreshCw className={`h-4 w-4 ${loadingChats ? 'animate-spin' : ''}`} />
          </button>
        ) : (
          <button
            onClick={loadChats}
            className="p-1 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none"
            title="Refresh chats"
            disabled={loadingChats}
          >
            <RefreshCw className={`h-4 w-4 ${loadingChats ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {view === 'sheets' ? renderSheetsList() : renderChatHistory()}
      </div>
    </div>
  );
};

export default Sidebar;
