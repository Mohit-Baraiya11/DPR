import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, RefreshCw, LogOut, MessageSquare, User, Trash2, Menu } from 'lucide-react';
import googleAuthService from '../services/googleAuth';
import { 
  saveChatHistory, 
  getChatHistory, 
  getChatById,
  getTodaysChat
} from '../utils/chatStorage';
import ChatHistorySidebar from './ChatHistorySidebar';

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

const SheetEditor = ({ onLogout }) => {
  const { id: sheetId } = useParams();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('chat'); // 'chat' or 'update'
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isGoogleInitialized, setIsGoogleInitialized] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentChatId, setCurrentChatId] = useState(null);
  const messagesEndRef = useRef(null);

  // Load chat history when sheetId changes
  useEffect(() => {
    let isMounted = true;
    
    const loadChat = async () => {
      if (!sheetId) return;
      
      try {
        // First check if there's a chat for today
        const todaysChat = await getTodaysChat(sheetId);
        
        if (todaysChat) {
          // Use today's chat if it exists
          setMessages(todaysChat.messages);
          setCurrentChatId(todaysChat.id);
        } else {
          // Otherwise start a new chat for today
          const newChat = {
            id: `${sheetId}_${new Date().toISOString().split('T')[0]}`,
            sheetId,
            title: `Chat - ${new Date().toLocaleDateString()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: [
              { 
                id: Date.now(), 
                text: 'Hello! I can help you analyze and understand your spreadsheet data. What would you like to know?', 
                isUser: false,
                timestamp: new Date().toISOString()
              }
            ]
          };
          
          // Save the new chat
          await saveChatHistory(sheetId, newChat.messages);
          if (!isMounted) return;
          
          setMessages(newChat.messages);
          setCurrentChatId(newChat.id);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
        if (isMounted) {
          setError('Failed to load chat history. Please try refreshing the page.');
        }
      }
    };
    
    loadChat();
    
    return () => {
      isMounted = false;
    };
  }, [sheetId]);
  
  // Save messages to localStorage whenever they change
  useEffect(() => {
    let isMounted = true;
    
    const saveChat = async () => {
      if (messages.length > 0 && sheetId) {
        try {
          // This will automatically handle updating the existing chat for today
          const savedChat = await saveChatHistory(sheetId, messages);
          if (savedChat && isMounted) {
            setCurrentChatId(savedChat.id);
          }
        } catch (error) {
          console.error('Error saving chat history:', error);
          if (isMounted) {
            setError('Failed to save chat. Your messages may not be saved.');
          }
        }
      }
    };
    
    // Debounce save to prevent too many writes
    const timer = setTimeout(saveChat, 500);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [messages, sheetId]);
  
  // Handle chat selection from sidebar
  const handleSelectChat = (chatId, chatMessages) => {
    setCurrentChatId(chatId);
    setMessages(chatMessages);
  };
  

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSheetData = async (id) => {
    try {
      setLoading(true);
      setError('');
      
      // Validate spreadsheet ID format
      if (!id || typeof id !== 'string' || id.trim() === '') {
        throw new Error('Invalid spreadsheet ID');
      }
      
      console.log('Fetching sheet metadata for ID:', id);
      
      // First, ensure we're properly authenticated
      const authInfo = googleAuthService.getAuthInfo();
      console.log('Auth info in SheetEditor:', authInfo);
      
      if (!authInfo || !authInfo.hasToken) {
        console.warn('No auth token found, attempting to re-authenticate...');
        try {
          await googleAuthService.signIn();
        } catch (authError) {
          console.error('Re-authentication failed:', authError);
          throw new Error('Please sign in again to continue.');
        }
      }
      
      try {
        // Get sheet metadata
        const metadata = await googleAuthService.getSpreadsheetMetadata(id);
        
        if (!metadata || !metadata.properties || !metadata.properties.title) {
          throw new Error('Invalid response from Google Sheets API');
        }
        
        console.log('Received sheet metadata:', metadata);
        
        // Update sheet metadata
        setSheet({
          id,
          name: metadata.properties.title
        });
        
        return metadata;
      } catch (apiError) {
        console.error('Error fetching spreadsheet:', apiError);
        if (apiError.message.includes('404') || apiError.message.includes('not found')) {
          throw new Error('Spreadsheet not found. Please check the URL or ensure you have access.');
        }
        throw apiError; // Re-throw for the outer catch block
      }
      
    } catch (error) {
      console.error('Error in fetchSheetData:', {
        message: error.message,
        status: error.status,
        details: error.details
      });
      
      // More specific error messages based on the error status
      let errorMessage = 'Failed to load sheet data. ';
      
      if (error.status === 403) {
        errorMessage = `You don't have permission to access this sheet. `;
        errorMessage += `Please ensure you have edit access to the spreadsheet.`;
      } else if (error.status === 404) {
        errorMessage = `The spreadsheet was not found. It may have been deleted or moved.`;
      } else if (error.message.includes('quota')) {
        errorMessage = `API quota exceeded. Please try again later or check your Google Cloud quota.`;
      } else {
        errorMessage += error.message || 'Please try again later.';
      }
      
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch when component mounts or sheetId changes
  useEffect(() => {
    console.log('SheetEditor - Sheet ID from URL:', sheetId);
    if (sheetId) {
      fetchSheetData(sheetId).catch(console.error);
    }
  }, [sheetId]);

  // Alias for backward compatibility
  const fetchSheetContent = fetchSheetData;

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    // Store the message first
    const messageText = inputMessage;
    setInputMessage('');
    setError('');

    // Add user message to the chat
    const userMessage = {
      id: Date.now(),
      text: messageText,
      isUser: true,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    // Get the current user's Google profile info
    let siteEngineerName = 'Unknown';
    try {
      const userInfo = JSON.parse(localStorage.getItem('dpr_google_token_user'));
      siteEngineerName = userInfo?.name || 'Unknown';
    } catch (error) {
      console.error('Error getting user info:', error);
    }
    
    // Show initial loading indicator
    const initialLoadingId = 'loading-' + Date.now();
    setMessages(prev => [
      ...prev,
      {
        id: initialLoadingId,
        text: 'Connecting to Google...',
        isUser: false,
        isLoading: true
      }
    ]);

    try {
      // Ensure we're properly authenticated using the googleAuthService
      const authInfo = googleAuthService.getAuthInfo();
      console.log('Auth info:', authInfo);
      
      if (!authInfo || !authInfo.hasToken) {
        console.warn('No auth token found, attempting to re-authenticate...');
        try {
          await googleAuthService.signIn();
        } catch (authError) {
          console.error('Re-authentication failed:', authError);
          throw new Error('Please sign in again to continue.');
        }
      }

      // Get the current token
      const token = googleAuthService.getAccessToken();
      console.log('Using token:', token ? token.substring(0, 10) + '...' : 'No token');

      // Update loading message to show we're processing
      setMessages(prev => [
        ...prev.filter(msg => msg.id !== initialLoadingId),
        {
          id: 'processing-' + Date.now(),
          text: 'Processing your request...',
          isUser: false,
          isLoading: true
        }
      ]);

      // Prepare the request data
      const requestData = {
        spreadsheet_id: sheetId,
        sheet_name: 'DPR',
        user_query: messageText,
        site_engineer_name: siteEngineerName
      };

      console.log('Sending request with data:', requestData);
      console.log('Using token:', token ? token.substring(0, 10) + '...' : 'No token');

      // Determine the API endpoint based on the current mode
      const apiUrl = mode === 'update' 
        ? 'http://localhost:8000/api/update-sheet'
        : 'http://localhost:8000/api/query-logs';
      
      // Prepare the request data based on the mode
      const requestPayload = mode === 'update' 
        ? requestData
        : {
            spreadsheet_id: sheetId,
            query: messageText,
            max_logs: 100
          };

      console.log(`Sending ${mode} request to:`, apiUrl);
      console.log('Request payload:', requestPayload);

      // Call the appropriate API endpoint
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestPayload)
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      // Try to parse the response as JSON if possible
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { detail: responseText };
      }

      if (!response.ok) {
        throw new Error(responseData.detail || `Request failed with status ${response.status}`);
      }

      // Format the response message based on the mode
      let botResponse;
      
      if (mode === 'update') {
        // Format for update mode
        botResponse = responseData.feedback || responseData.message || 'Update processed successfully';
        
        // Add update-specific details
        if (responseData.updates_applied !== undefined) {
          botResponse += `\n\nUpdates Applied: ${responseData.updates_applied}`;
        }
        if (responseData.updated_cells !== undefined) {
          botResponse += `\nUpdated Cells: ${responseData.updated_cells}`;
        }
      } else {
        // Format for chat/query mode - use result field from logs query
        botResponse = responseData.result || responseData.message || 'No results found';
        
        // Add logs analyzed count if available
        if (responseData.logs_analyzed !== undefined) {
          botResponse += `\n\nAnalyzed ${responseData.logs_analyzed} log entries.`;
        }
      }
      
      // Update messages with the response
      setMessages(prev => [
        ...prev.filter(msg => msg.id !== initialLoadingId && !msg.isLoading),
        {
          id: 'response-' + Date.now(),
          text: botResponse,
          isUser: false,
          timestamp: new Date().toISOString(),
          rawData: responseData // Store the raw data for debugging
        }
      ]);
    } catch (error) {
      console.error('Error in API call:', error);
      
      // Update messages with error
      setMessages(prev => [
        ...prev.filter(msg => !msg.isLoading),
        {
          id: 'error-' + Date.now(),
          text: `Error: ${error.message}`,
          isUser: false,
          isError: true,
          timestamp: new Date().toISOString()
        }
      ]);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Toggle Button (Mobile) */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed left-4 top-4 z-20 p-2 rounded-md bg-white shadow-md lg:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5 text-gray-600" />
      </button>
      
      {/* Chat History Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-10 w-64 bg-white shadow-lg transform ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex-shrink-0`}>
        <ChatHistorySidebar
          sheetId={sheetId}
          onSelectChat={handleSelectChat}
          activeChatId={currentChatId}
        />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center">
            <button
              onClick={handleBack}
              className="mr-4 p-1 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-medium text-gray-900">
              {sheet?.name || 'Loading...'}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="block appearance-none bg-white border border-gray-300 text-gray-700 py-2 px-4 pr-8 rounded-md leading-tight focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="chat">💬 Chat Mode</option>
                <option value="update">✏️ Update Mode</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-1 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 overflow-hidden flex flex-col max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.map((message) => (
            <ChatMessage 
              key={message.id} 
              message={message.text} 
              isUser={message.isUser}
              isLoading={message.isLoading}
              isError={message.isError}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSendMessage} className="mt-4">
          <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask me anything about your sheet..."
              className="flex-1 px-4 py-3 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="px-4 py-3 bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500 text-center">
            Ask questions about your data or request analysis
          </p>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="fixed bottom-4 right-4 max-w-sm bg-red-50 border-l-4 border-red-400 p-4 rounded shadow-lg z-50">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg 
                className="h-5 w-5 text-red-400" 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 20 20" 
                fill="currentColor"
                aria-hidden="true"
              >
                <path 
                  fillRule="evenodd" 
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
                  clipRule="evenodd" 
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-red-800">
                {error}
              </p>
              <button
                onClick={() => setError('')}
                className="mt-1 text-xs text-red-600 hover:text-red-500 focus:outline-none"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default SheetEditor;
