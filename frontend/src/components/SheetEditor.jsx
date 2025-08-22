import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, FileSpreadsheet, LogOut, MessageSquare, User, Menu, X, Mic, MicOff, ExternalLink, ChevronDown } from 'lucide-react';
import googleAuthService from '../services/googleAuth';
import Sidebar from './Sidebar';
import { saveChatHistory, getTodaysChat } from '../utils/chatStorage';
import { API_BASE_URL } from '../config';

// Chat message component
const ChatMessage = ({ message, isUser, isLoading, isError }) => {
  if (isLoading) {
    return (
      <div className="flex justify-start mb-4">
        <div className="flex max-w-xs md:max-w-md lg:max-w-lg xl:max-w-2xl">
          <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mr-3 bg-gray-300 text-gray-600">
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
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 sm:mb-4`}>
      <div className={`flex max-w-[280px] sm:max-w-xs md:max-w-md lg:max-w-lg xl:max-w-2xl ${isUser ? 'flex-row-reverse' : ''}`}>
        <div className={`flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center ${isUser ? 'ml-2 sm:ml-3 bg-gray-300 text-gray-600' : 'mr-2 sm:mr-3 bg-gray-300 text-gray-600'}`}>
          {isUser ? <User size={14} className="sm:w-4 sm:h-4" /> : <MessageSquare size={14} className="sm:w-4 sm:h-4" />}
        </div>
        <div className={`px-3 sm:px-4 py-2 rounded-lg ${isUser ? 'bg-gray-200 text-gray-900' : isError ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-white border border-gray-200'}`}>
          <p className="text-sm leading-relaxed">{message}</p>
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
  const [mode, setMode] = useState('update');
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const dropdownRef = useRef(null);

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

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isDropdownOpen]);

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
        apiUrl = `${API_BASE_URL}/api/query-logs`;
        requestBody = {
          spreadsheet_id: sheetId,
          query: inputMessage,
          groq_api_key: groqApiKey,
          max_logs: 100
        };
      } else {
        apiUrl = `${API_BASE_URL}/api/update-sheet`;
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
    <div className="flex h-screen bg-white">
      {showApiKeyModal && <ApiKeyModal />}
      {/* Sidebar - Mobile responsive with overlay on small screens */}
      <>
        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        
        <div className={`${
          isSidebarOpen 
            ? 'w-64 sm:w-72 md:w-80 fixed md:relative left-0 top-0 z-50 md:z-auto' 
            : 'w-0 md:w-0'
        } transition-all duration-300 ease-in-out overflow-hidden bg-white border-r border-gray-200 h-full`}>
          {isSidebarOpen && (
            <Sidebar
              sheets={availableSheets}
              currentSheetId={sheetId}
              onSelectSheet={(sheet) => {
                handleSheetSelect(sheet);
                // Auto-close sidebar on mobile after selection
                if (window.innerWidth < 768) {
                  setIsSidebarOpen(false);
                }
              }}
              onRefresh={handleRefreshSheets}
              onSelectChat={handleSelectChat}
              activeChatId={activeChatId}
              user={user}
              onLogout={async () => {
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
            />
          )}
        </div>
      </>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Header - Mobile responsive */}
      <header className="bg-white border-b border-gray-200 px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between min-h-[48px] sm:min-h-[56px]">
        <div className="flex items-center flex-1 min-w-0">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 sm:p-2 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mr-2 flex-shrink-0"
          >
            <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <h1 className="text-sm sm:text-lg font-medium text-gray-900 truncate">
            {sheet ? sheet.name : 'No sheet selected'}
          </h1>
        </div>
        
        {/* Open Sheet Button - Mobile responsive */}
        {sheetId && (
          <button
            onClick={() => {
              if (sheet && sheet.id) {
                window.open(`https://docs.google.com/spreadsheets/d/${sheet.id}`, '_blank');
              }
            }}
            className="inline-flex items-center px-2 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md sm:rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 shadow-md hover:shadow-lg flex-shrink-0 ml-2"
            title="Open sheet in Google Sheets"
          >
            <span>Sheet</span>
          </button>
        )}
      </header>

        {/* Chat Area - Mobile responsive */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4 bg-white">
          <div className="max-w-3xl mx-auto h-full flex flex-col">
            {!sheetId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 sm:p-8">
                <div className="max-w-sm sm:max-w-md mx-auto w-full">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileSpreadsheet size={24} className="text-blue-600 sm:w-8 sm:h-8" />
                  </div>
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-800 mb-2">Welcome to Smart DPR</h2>
                  <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 px-4">
                    Select a sheet from the sidebar to start chatting with your data
                  </p>
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Browse Sheets
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
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
          <div className="border-t border-gray-200 bg-white p-2 sm:p-3 lg:p-4">
            <div className="max-w-4xl mx-auto px-2">
              <form onSubmit={handleSendMessage} className="relative">
                {/* Mobile Layout - Modern two-line design */}
                <div className="block sm:hidden">
                  <div className="bg-white rounded-3xl shadow-md border border-gray-100 overflow-hidden">
                    {/* First line - Input field only */}
                    <div className="px-5 py-3 border-b border-gray-100">
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
                        placeholder="Describe what you want"
                        className="w-full bg-transparent border-0 outline-none text-gray-800 placeholder-gray-400 text-base focus:placeholder-gray-500"
                      />
                    </div>
                    
                    {/* Second line - Controls */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50">
                      {/* Mode Selector Dropdown */}
                      <div className="relative" ref={dropdownRef}>
                        <button
                          type="button"
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200 focus:outline-none"
                        >
                          <span>{mode === 'update' ? 'Update' : 'Chat Mode'}</span>
                          <svg 
                            className={`ml-1 w-4 h-4 text-gray-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {/* Dropdown menu - Fixed positioning */}
                        {isDropdownOpen && (
                          <div className="fixed left-0 right-0 mx-4 bottom-24 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-w-[200px]">
                            <button
                              type="button"
                              onClick={() => {
                                setMode('update');
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                                mode === 'update' 
                                  ? 'bg-gray-50 text-gray-900' 
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              Update
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMode('chat');
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                                mode === 'chat' 
                                  ? 'bg-gray-50 text-gray-900' 
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              Chat Mode
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Right side buttons */}
                      <div className="flex items-center space-x-3">
                        {/* Microphone button */}
                        <button
                          type="button"
                          onClick={toggleRecording}
                          className={`flex items-center justify-center h-10 w-10 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                            isRecording 
                              ? 'bg-red-100 text-red-600 hover:bg-red-200 focus:ring-red-500' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 focus:ring-gray-500'
                          }`}
                          title={isRecording ? 'Stop recording' : 'Start voice input'}
                        >
                          {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        </button>
                        
                        {/* Send button */}
                        <button
                          type="submit"
                          className={`flex items-center justify-center h-10 w-10 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                            inputMessage.trim()
                              ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm focus:ring-blue-500'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed focus:ring-gray-500'
                          }`}
                          disabled={!inputMessage.trim()}
                          title="Send message"
                        >
                          <Send className="h-5 w-5" style={{ transform: 'rotate(-45deg)' }} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Desktop/Tablet Layout - Single line */}
                <div className="hidden sm:block">
                  <div className="relative flex items-center bg-white" style={{ borderRadius: '199px' }}>
                    <div className="flex items-center w-full border-2 border-gray-200 hover:border-gray-300 focus-within:border-gray-400 focus-within:shadow-sm transition-all duration-200" style={{ borderRadius: '199px' }}>
                      {/* Mode Selector Dropdown on the left */}
                      <div className="flex-shrink-0 pl-2">
                        <select
                          value={mode}
                          onChange={(e) => setMode(e.target.value)}
                          className="bg-transparent border-0 outline-none text-sm font-medium text-gray-700 cursor-pointer px-2 py-1 focus:ring-0"
                        >
                          <option value="update">Update</option>
                          <option value="chat">Chat</option>
                        </select>
                      </div>
                      
                      {/* Divider */}
                      <div className="w-px h-6 bg-gray-200 mx-2"></div>
                      
                      {/* Input field */}
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
                        placeholder={isRecording ? 'Recording...' : mode === 'chat' ? 'Ask anything about your data...' : 'Describe what you want to update...'}
                        className="flex-1 px-2 py-3 lg:py-4 bg-transparent border-0 outline-none text-gray-800 placeholder-gray-400 text-base focus:placeholder-gray-300"
                      />
                      
                      {/* Right side buttons */}
                      <div className="flex items-center space-x-2 pr-2 lg:pr-3">
                        {/* Microphone button */}
                        <button
                          type="button"
                          onClick={toggleRecording}
                          className={`p-2.5 rounded-full transition-colors duration-200 ${
                            isRecording 
                              ? 'bg-red-500 text-white hover:bg-red-600' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                          }`}
                          title={isRecording ? 'Stop recording' : 'Start voice input'}
                        >
                          {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </button>
                        
                        {/* Send button */}
                        <button
                          type="submit"
                          className={`p-2.5 rounded-full transition-colors duration-200 ${
                            inputMessage.trim()
                              ? 'bg-gray-800 text-white hover:bg-gray-900 shadow-sm'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                          disabled={!inputMessage.trim()}
                          title="Send message"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
              
              {/* Support text - Different for mobile and desktop */}
              <div className="mt-3 text-center">
                {/* Mobile - Short version */}
                <p className="text-xs text-gray-500 block sm:hidden">
                  Powered by <a 
                    href="https://xaneur.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    XNR
                  </a>
                </p>
                
                {/* Desktop - Full version */}
                <p className="text-xs text-gray-500 hidden sm:block">
                  Contact information for support and issue reporting: innovate@xaneur.com
                  <span className="mx-2">•</span>
                  Powered by <a 
                    href="https://xaneur.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    XNR
                  </a>
                </p>
              </div>
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
