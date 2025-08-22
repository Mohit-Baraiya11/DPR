import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, MessageSquare, Loader2, Calendar, FileText, ChevronUp } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { getChatsBySheetId } from '../utils/chatStorage';

const ChatHistorySidebar = ({ sheetId, onSelectChat, activeChatId, isOpen, onToggle }) => {
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedMonths, setExpandedMonths] = useState({});

  // Load chat history when sheetId changes
  const loadChats = useCallback(async () => {
    if (!sheetId) return;
    
    try {
      setLoading(true);
      const chats = await getChatsBySheetId(sheetId);
      setChatHistory(chats);
      
      // Expand the most recent month by default
      if (chats.length > 0 && chats[0].type === 'month') {
        setExpandedMonths(prev => ({
          ...prev,
          [chats[0].id]: true
        }));
      }
    } catch (err) {
      console.error('Error loading chat history:', err);
      setError('Failed to load chat history');
    } finally {
      setLoading(false);
    }
  }, [sheetId]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Toggle month expansion
  const toggleMonth = (monthId) => {
    setExpandedMonths(prev => ({
      ...prev,
      [monthId]: !prev[monthId]
    }));
  };

  // Format date for display
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin h-6 w-6 text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 text-sm">
        <p>Error loading chat history. Please try again.</p>
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
        <p>No chat history found for this sheet.</p>
      </div>
    );
  }

  // Format time for display
  const formatTime = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return format(date, 'h:mm a');
    } catch (e) {
      return '';
    }
  };

  // Get the most recent chat
  const getMostRecentChat = () => {
    if (!chatHistory || chatHistory.length === 0) return null;
    
    // Find the first date entry (most recent)
    const dateEntry = chatHistory.find(item => item.type === 'date');
    if (dateEntry) return dateEntry;
    
    return null;
  };

  const mostRecentChat = getMostRecentChat();

  const [isExpanded, setIsExpanded] = useState(true);
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="flex flex-col bg-white border-b border-gray-200">
      <button 
        onClick={toggleExpand}
        className="flex items-center justify-between w-full p-3 text-left hover:bg-gray-50 focus:outline-none"
      >
        <div className="flex items-center">
          <h2 className="text-sm font-medium text-gray-900">Chat History</h2>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {isExpanded && (
        <div className="overflow-y-auto max-h-96">
          {chatHistory.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">No chat history</div>
          ) : (
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
                        {chat.messages[chat.messages.length - 1].content}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatHistorySidebar;
