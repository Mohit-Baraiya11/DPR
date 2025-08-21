import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, FileSpreadsheet, LogOut, MessageSquare, User, Menu, X, Mic, MicOff, ExternalLink } from 'lucide-react';
import googleAuthService from '../services/googleAuth';
import Sidebar from './Sidebar';
import { saveChatHistory, getTodaysChat } from '../utils/chatStorage';

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
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [pendingSheet, setPendingSheet] = useState(null);
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
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const messagesEndRef = useRef(null);

  // Handle sheet selection with API key validation
  const handleSheetSelect = async (selectedSheet) => {
    console.log('Sheet selected:', selectedSheet);
    
    // Check if we already have a valid API key
    const savedApiKey = localStorage.getItem('GROQ_API_KEY');
    
    if (!savedApiKey || savedApiKey.trim() === '') {
      console.log('No API key found, showing modal');
      setPendingSheet(selectedSheet);
      setShowApiKeyModal(true);
      return;
    }
    
    console.log('API key found, proceeding with sheet selection');
    
    // Update the sheet and URL
    setSheet(selectedSheet);
    navigate(`/sheet/${selectedSheet.id}`);
    
    // Load today's chat history for this sheet
    const todaysChat = await getTodaysChat(selectedSheet.id);
    
    if (todaysChat && todaysChat.messages && todaysChat.messages.length > 0) {
      // Load existing chat messages for today
      setMessages(todaysChat.messages);
      setActiveChatId(todaysChat.id);
    } else {
      // Start fresh with welcome message
      setActiveChatId(null);
      setMessages([{
        id: 'welcome',
        text: `You've selected "${selectedSheet.name}". Ask me anything about this sheet.`,
        isUser: false,
        timestamp: new Date().toISOString()
      }]);
    }
    
    // Reset any pending sheet
    setPendingSheet(null);
  };

  // Save API key and continue with sheet selection
  const handleSaveApiKey = async () => {
    if (apiKey.trim() === '') return;
    
    console.log('Saving API key and continuing with sheet selection');
    
    // Save the API key to local storage
    localStorage.setItem('GROQ_API_KEY', apiKey);
    setShowApiKeyModal(false);
    setApiKey(''); // Clear the input field
    
    // If there was a pending sheet selection, complete it
    if (pendingSheet) {
      console.log('Completing pending sheet selection:', pendingSheet);
      setSheet(pendingSheet);
      navigate(`/sheet/${pendingSheet.id}`);
      // Load today's chat history
      const todaysChat = await getTodaysChat(pendingSheet.id);
      if (todaysChat && todaysChat.messages && todaysChat.messages.length > 0) {
        setMessages(todaysChat.messages);
        setActiveChatId(todaysChat.id);
      } else {
        setMessages([{
          id: 'welcome',
          text: `You've selected "${pendingSheet.name}". Ask me anything about this sheet.`,
          isUser: false,
          timestamp: new Date().toISOString()
        }]);
      }
      setPendingSheet(null);
    }
  };

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
            const savedApiKey = localStorage.getItem('GROQ_API_KEY');
            if (!savedApiKey || savedApiKey.trim() === '') {
              setPendingSheet(selectedSheet);
              setShowApiKeyModal(true);
            } else {
              setSheet(selectedSheet);
              // Load today's chat history
              const todaysChat = await getTodaysChat(selectedSheet.id);
              if (todaysChat && todaysChat.messages && todaysChat.messages.length > 0) {
                setMessages(todaysChat.messages);
                setActiveChatId(todaysChat.id);
              } else {
                setMessages([{
                  id: 'welcome',
                  text: `You've selected "${selectedSheet.name}". Ask me anything about this sheet.`,
                  isUser: false,
                  timestamp: new Date().toISOString()
                }]);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching sheets:', error);
        setError('Failed to load sheets. Please try refreshing the page.');
      }
    };
    
    fetchSheets();
  }, [sheetId]);

  // Audio recording state
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const streamRef = useRef(null);

  // Initialize media recorder
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Handle audio data
  useEffect(() => {
    if (audioChunks.length > 0 && !isRecording) {
      processAudio(audioChunks);
      setAudioChunks([]);
    }
  }, [audioChunks, isRecording]);

  // Process recorded audio with Groq STT
  const processAudio = async (chunks) => {
    try {
      const audioBlob = new Blob(chunks, { type: 'audio/webm' });
      const groqApiKey = localStorage.getItem('GROQ_API_KEY');
      
      if (!groqApiKey) {
        alert('Please set your GROQ API key first');
        return;
      }

      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('model', 'whisper-large-v3-turbo');
      formData.append('language', 'en');

      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to transcribe audio');
      }

      const result = await response.json();
      setInputMessage(prev => prev + ' ' + result.text);
    } catch (error) {
      console.error('Error processing audio:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Start/stop recording
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      // Stop all tracks to release microphone
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        streamRef.current = null;
      }
      setIsRecording(false);
    } else {
      try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        const recorder = new MediaRecorder(stream);
        const chunks = [];
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        
        recorder.onstop = () => {
          setAudioChunks([...chunks]);
          // Stop all tracks when recording stops
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
              track.stop();
            });
            streamRef.current = null;
          }
        };
        
        recorder.start(1000); // Collect data every second
        setMediaRecorder(recorder);
        setIsRecording(true);
        
      } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Could not access microphone. Please ensure you have granted microphone permissions.');
      }
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      
      // Get GROQ API key from local storage
      const groqApiKey = localStorage.getItem('GROQ_API_KEY') || '';
      
      if (mode === 'chat') {
        apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/query-logs`;
        requestBody = {
          spreadsheet_id: sheetId,
          query: inputMessage,
          groq_api_key: groqApiKey,
          max_logs: 100
        };
      } else {
        apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/update-sheet`;
        requestBody = {
          spreadsheet_id: sheetId,
          sheet_name: sheet?.name || '',
          user_query: inputMessage,
          site_engineer_name: user?.name || 'Unknown User',
          groq_api_key: groqApiKey
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

      // Save chat to history (save regardless of success/failure to preserve conversation)
      if (sheet) {
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

  // API Key Modal
  const ApiKeyModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">GROQ API Key Required</h3>
          <button
            onClick={() => setShowApiKeyModal(false)}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Please enter your GROQ API key to continue. This will be stored in your browser's local storage.
        </p>
        <div className="mb-4">
          <a
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center"
          >
            <span>Get your API key from Groq Console</span>
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your GROQ API key"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="mt-4 flex justify-end space-x-3">
          <button
            onClick={() => setShowApiKeyModal(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveApiKey}
            disabled={!apiKey.trim()}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md ${apiKey.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-400 cursor-not-allowed'}`}
          >
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {showApiKeyModal && <ApiKeyModal />}
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
        
        {/* Mode Selector and Sheet Button */}
        {sheetId && (
          <div className="flex items-center space-x-3 ml-4">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="block w-full pl-3 pr-10 py-1.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="chat">Chat Mode</option>
              <option value="update">Update Mode</option>
            </select>
            
            {/* Open in Google Sheets Button */}
            <button
              onClick={() => {
                if (sheet && sheet.id) {
                  window.open(`https://docs.google.com/spreadsheets/d/${sheet.id}`, '_blank');
                }
              }}
              className="inline-flex items-center whitespace-nowrap px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              title="Open sheet in Google Sheets"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              <span>Open Sheet</span>
            </button>
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
          <div className="border-t border-gray-200 bg-gray-50 p-4">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSendMessage} className="relative">
                <div className="relative flex items-center bg-white rounded-full shadow-sm border border-gray-200 focus-within:border-gray-300 focus-within:ring-2 focus-within:ring-gray-200 transition-all duration-200">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder={isRecording ? 'Recording...' : mode === 'chat' ? 'Get details...' : 'Update the sheet...'}
                    className="flex-1 px-5 py-3 bg-transparent border-0 outline-none text-gray-700 placeholder-gray-400"
                  />
                  <div className="flex items-center space-x-1 pr-2">
                    <button
                      type="button"
                      onClick={toggleRecording}
                      className={`p-2 rounded-full transition-colors duration-200 ${isRecording ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                      title={isRecording ? 'Stop recording' : 'Start voice input'}
                    >
                      {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </button>
                    <button
                      type="submit"
                      className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!inputMessage.trim()}
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </div>
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
