import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { getChatsBySheetId, getTodaysChat } from '../utils/chatStorage';

const ChatHistorySidebar = ({ sheetId, onSelectChat, activeChatId }) => {
  const [chatsByMonth, setChatsByMonth] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [todaysChat, setTodaysChat] = useState(null);

  const loadChats = useCallback(async () => {
    if (!sheetId) return;
    
    try {
      setLoading(true);
      const todayChat = await getTodaysChat(sheetId);
      setTodaysChat(todayChat);
      
      const chats = await getChatsBySheetId(sheetId);
      setChatsByMonth(chats);
    } catch (err) {
      console.error('Error loading chat history:', err);
      setError('Failed to load chat history');
    } finally {
      setLoading(false);
    }
  }, [sheetId]);

  useEffect(() => {
    loadChats();
    
    const interval = setInterval(loadChats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [loadChats]);


  const formatChatDate = useCallback((dateString) => {
    if (!dateString) return 'No date';
    try {
      const date = new Date(dateString);
      if (isToday(date)) return 'Today';
      if (isYesterday(date)) return 'Yesterday';
      return format(date, 'MMM d, yyyy');
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid date';
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin h-6 w-6 text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 text-sm">
        <p>{error}</p>
        <button 
          onClick={loadChats}
          className="mt-2 text-blue-600 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Chat History</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-2">

        {/* Today's Chat */}
        {todaysChat && (
          <div className="mb-6">
            <h3 className="px-4 py-2 text-sm font-medium text-gray-500">Today</h3>
            <div className="group flex items-center justify-between px-4 py-2 text-sm font-medium text-gray-900 bg-blue-50 rounded-md">
              <button
                onClick={() => onSelectChat(todaysChat.id, todaysChat.messages)}
                className="flex-1 text-left flex items-center"
              >
                <MessageSquare size={14} className="inline-block mr-2 text-blue-600" />
                <span className="truncate">
                  {formatChatDate(todaysChat.date)}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Previous Chats by Month */}
        {Object.keys(chatsByMonth).length > 0 ? (
          <div className="divide-y">
            {Object.entries(chatsByMonth).map(([month, monthChats]) => {
              if (!Array.isArray(monthChats)) return null;
              
              return (
                <div key={month} className="py-2">
                  <h3 className="px-4 py-2 text-sm font-medium text-gray-500">
                    {format(new Date(`${month}-01`), 'MMMM yyyy')}
                  </h3>
                  <div className="space-y-1">
                    {monthChats
                      .filter(chat => !todaysChat || chat.id !== todaysChat.id)
                      .map((chat) => (
                        <div key={chat.id} className="group flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                          <button
                            type="button"
                            onClick={() => onSelectChat(chat.id, chat.messages)}
                            className="flex-1 text-left flex items-center min-w-0"
                          >
                            <MessageSquare size={14} className="flex-shrink-0 mr-2 text-gray-400" />
                            <span className="truncate">
                              {formatChatDate(chat.date)}
                            </span>
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-gray-500">
            No previous chats found
          </div>
        )}
      </div>
      <div className="p-3 border-t border-gray-200 text-xs text-gray-500 text-center">
        Chats are saved in your browser
      </div>
    </div>
  );
};

export default ChatHistorySidebar;
