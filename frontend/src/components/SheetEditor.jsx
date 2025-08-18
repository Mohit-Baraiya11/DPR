import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, FileSpreadsheet, LogOut, MessageSquare, User, Menu } from 'lucide-react';
import googleAuthService from '../services/googleAuth';
import Sidebar from './Sidebar';
import { saveChatHistory } from '../utils/chatStorage';

// Chat message component
const ChatMessage = ({ message, isUser, isLoading, isError }) => {
  if (isLoading) {
    return (
      <div className="flex justify-start mb-4">
        <div className="flex max-w-xs md:max-w-md lg:max-w-lg xl:max-w-2xl">
          <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mr-3 bg-gray-200 text-gray-700">
            <MessageSquare size={16} />
          </div>
          <div className="px-4 py-2 rounded-lg bg-white border border-gray-200">
            <div className="flex space-x-2">
              <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex max-w-xs md:max-w-md lg:max-w-lg xl:max-w-2xl ${isUser ? 'flex-row-reverse' : ''}`}>
        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${isUser ? 'ml-3 bg-gray-200 text-gray-700' : 'mr-3 bg-gray-200 text-gray-700'}`}>
          {isUser ? <User size={16} /> : <MessageSquare size={16} />}
        </div>
        <div className={`px-4 py-2 rounded-lg ${isUser ? 'bg-gray-200 text-gray-900' : isError ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-white border border-gray-200'}`}>
          <p className="text-sm">{message}</p>
        </div>
      </div>
    </div>
  );
};

const SheetEditor = ({ user, onLogout }) => {
  const { id: sheetId } = useParams();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('chat');
  const [availableSheets, setAvailableSheets] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      text: 'Please select a sheet from the sidebar to get started.',
      isUser: false,
      timestamp: new Date().toISOString()
    }
  ]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Fetch available sheets on component mount
  useEffect(() => {
    const fetchSheets = async () => {
      try {
        const sheets = await googleAuthService.getSpreadsheets();
        setAvailableSheets(sheets);
        
        // If there's a sheetId in the URL, find and set it
        if (sheetId) {
          const selectedSheet = sheets.find(s => s.id === sheetId);
          if (selectedSheet) {
            setSheet(selectedSheet);
            setMessages([{
              id: 'welcome',
              text: `You've selected "${selectedSheet.name}". Ask me anything about this sheet.`,
              isUser: false,
              timestamp: new Date().toISOString()
            }]);
          }
        }
      } catch (error) {
        console.error('Error fetching sheets:', error);
        setError('Failed to load sheets. Please try refreshing the page.');
      }
    };
    
    fetchSheets();
  }, [sheetId]);

  const handleSheetSelect = async (selectedSheet) => {
    if (selectedSheet && selectedSheet.id) {
      navigate(`/sheet/${selectedSheet.id}`);
      setSheet(selectedSheet);
      setMessages([{
        id: 'welcome',
        text: `You've selected "${selectedSheet.name}". Ask me anything about this sheet.`,
        isUser: false,
        timestamp: new Date().toISOString()
      }]);
      setActiveChatId(null);
    } else {
      navigate('/');
      setSheet(null);
      setMessages([{
        id: 'welcome',
        text: 'Please select a sheet from the sidebar to get started.',
        isUser: false,
        timestamp: new Date().toISOString()
      }]);
      setActiveChatId(null);
    }
  };

  const handleSelectChat = (chat) => {
    setActiveChatId(chat.id);
    if (chat.messages) {
      setMessages(chat.messages);
    }
  };

  const handleRefreshSheets = async () => {
    try {
      const sheets = await googleAuthService.getSpreadsheets();
      setAvailableSheets(sheets);
      
      // If the current sheet is no longer in the list, clear the selection
      if (sheetId && !sheets.some(s => s.id === sheetId)) {
        navigate('/');
        setSheet(null);
      }
    } catch (error) {
      console.error('Error refreshing sheets:', error);
      setError('Failed to refresh sheets. Please try again.');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !sheetId) return;

    const userMessage = {
      id: `msg-${Date.now()}`,
      text: inputMessage,
      isUser: true,
      timestamp: new Date().toISOString()
    };

    // Add user message to chat
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputMessage('');

    // Add a loading message
    const loadingMessage = {
      id: `loading-${Date.now()}`,
      text: '',
      isUser: false,
      isLoading: true,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, loadingMessage]);

    try {
      // Get the access token for authorization
      const accessToken = await googleAuthService.getAccessToken();
      
      // Determine the API endpoint and request body based on the current mode
      let apiUrl, requestBody;
      
      if (mode === 'chat') {
        apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/query-logs`;
        requestBody = {
          spreadsheet_id: sheetId,
          query: inputMessage,
          max_logs: 100
        };
      } else {
        apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/update-sheet`;
        requestBody = {
          spreadsheet_id: sheetId,
          sheet_name: sheet?.name || '',
          user_query: inputMessage,
          site_engineer_name: user?.name || 'Unknown User'
        };
      }

      // Make the API call
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

      // Create response message
      const responseMessage = {
        id: `resp-${Date.now()}`,
        text: mode === 'chat' 
          ? (data.result || 'No response from server')
          : (data.feedback || data.response || 'No response from server'),
        isUser: false,
        timestamp: new Date().toISOString(),
        isError: data.status !== 'success'
      };

      // Update messages with the response
      const finalMessages = [...updatedMessages, responseMessage];
      setMessages(finalMessages);

      // Save chat to history
      if (sheet && data.status === 'success') {
        await saveChatHistory(sheet.id, sheet.name, finalMessages);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Update the loading message with error
      setMessages(prev => {
        const updated = prev.filter(msg => !msg.isLoading);
        return [
          ...updated,
          {
            id: `error-${Date.now()}`,
            text: `Error: ${error.message || 'Failed to get response'}`,
            isUser: false,
            isError: true,
            timestamp: new Date().toISOString()
          }
        ];
      });
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 ease-in-out overflow-hidden bg-white border-r border-gray-200`}>
        {isSidebarOpen && (
          <Sidebar
            sheets={availableSheets}
            currentSheetId={sheetId}
            onSelectSheet={handleSheetSelect}
            onRefresh={handleRefreshSheets}
            onSelectChat={handleSelectChat}
            activeChatId={activeChatId}
          />
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mr-2"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-medium text-gray-900">
            {sheet ? sheet.name : 'No sheet selected'}
          </h1>
        </div>
        
        {/* Mode Selector */}
        {sheetId && (
          <div className="ml-4">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="block w-full pl-3 pr-10 py-1.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="chat">Chat Mode</option>
              <option value="update">Update Mode</option>
            </select>
          </div>
        )}
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {user?.name && (
              <span className="hidden md:inline text-sm font-medium text-gray-700">
                {user.name}
              </span>
            )}
            <button
              onClick={async () => {
                try {
                  await googleAuthService.signOut();
                  if (onLogout) {
                    onLogout();
                  }
                  navigate('/login');
                } catch (error) {
                  console.error('Error signing out:', error);
                  setError('Failed to sign out. Please try again.');
                }
              }}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              title="Sign out"
            >
              <LogOut size={16} className="text-gray-500" />
              <span className="hidden md:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="max-w-3xl mx-auto h-full flex flex-col">
            {!sheetId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileSpreadsheet size={32} className="text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Smart DPR</h2>
                  <p className="text-gray-600 mb-6">
                    Select a sheet from the sidebar to start chatting with your data
                  </p>
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Browse Sheets
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <ChatMessage 
                    key={msg.id}
                    message={msg.text}
                    isUser={msg.isUser}
                    isLoading={msg.isLoading}
                    isError={msg.isError}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area - Only show when a sheet is selected */}
        {sheetId && (
          <div className="border-t border-gray-200 bg-white p-4">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={`Ask something about ${sheet?.name || 'this sheet'}...`}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="fixed bottom-4 right-4 max-w-sm bg-red-50 border-l-4 border-red-400 p-4 rounded shadow-lg z-50">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                onClick={() => setError('')}
                className="inline-flex text-gray-400 focus:outline-none focus:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SheetEditor;
