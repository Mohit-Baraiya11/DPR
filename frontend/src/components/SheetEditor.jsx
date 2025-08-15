import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, RefreshCw, LogOut, MessageSquare, User } from 'lucide-react';
import googleAuthService from '../services/googleAuth';

// Chat message component
const ChatMessage = ({ message, isUser }) => (
  <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
    <div className={`flex max-w-xs md:max-w-md lg:max-w-lg xl:max-w-2xl ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${isUser ? 'ml-3 bg-gray-200 text-gray-700' : 'mr-3 bg-gray-200 text-gray-700'}`}>
        {isUser ? <User size={16} /> : <MessageSquare size={16} />}
      </div>
      <div className={`px-4 py-2 rounded-lg ${isUser ? 'bg-gray-200 text-gray-900' : 'bg-white border border-gray-200'}`}>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  </div>
);

const SheetEditor = ({ onLogout }) => {
  const { id: sheetId } = useParams();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hello! I can help you analyze and understand your spreadsheet data. What would you like to know?', isUser: false }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSheetData = async (id) => {
    try {
      setLoading(true);
      setError('');
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
      
      // Get sheet metadata
      const metadata = await googleAuthService.getSpreadsheetMetadata(id);
      
      console.log('Received sheet metadata:', metadata);
      
      // Update sheet metadata
      setSheet({
        id,
        name: metadata.properties.title
      });
      
      return metadata;
      
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

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      text: inputMessage,
      isUser: true,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    try {
      // Here you would typically call your AI/backend service
      // For now, we'll just echo the message
      setTimeout(() => {
        const botMessage = {
          id: messages.length + 2,
          text: `I received your message: "${inputMessage}"`,
          isUser: false,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botMessage]);
      }, 1000);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sheets
              </button>
              <h1 className="text-lg font-medium text-gray-900">
                {sheet?.name || 'Chat with Sheet'}
              </h1>
            </div>
            <button
              onClick={onLogout}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 overflow-hidden flex flex-col max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.map((message) => (
            <ChatMessage 
              key={message.id} 
              message={message.text} 
              isUser={message.isUser} 
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
        <div className="fixed bottom-4 right-4 max-w-sm bg-red-50 border-l-4 border-red-400 p-4 rounded shadow-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SheetEditor;
