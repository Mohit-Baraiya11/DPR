import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, FileSpreadsheet, LogOut, MessageSquare, User, Menu, X, Mic, MicOff, ExternalLink, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';
import googleAuthService from '../services/googleAuth';
import Onboarding from './Onboarding';
import MobileChatInterface from './MobileChatInterface';
import ErrorRecovery from './ErrorRecovery';
import { ChatMessage, Input, Navigation } from './shared';
import { useToast, LoadingOverlay, RippleEffect } from './VisualFeedback';
import { saveChatHistory, getTodaysChat } from '../utils/chatStorage';
import { API_BASE_URL } from '../config';
import { triggerHaptic } from '../utils/gestureDetector';


const SheetEditor = ({ user, onLogout }) => {
  const { id: sheetId } = useParams();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(null);
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentError, setCurrentError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { showToast, ToastContainer } = useToast();

  // Handle sheet selection
  const handleSheetSelect = async (selectedSheet) => {
    console.log('Sheet selected:', selectedSheet);
    
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
  };

  // Check if user needs onboarding
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('dpr_onboarding_completed');
    if (!hasSeenOnboarding && user) {
      setShowOnboarding(true);
    }
  }, [user]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem('dpr_onboarding_completed', 'true');
    setShowOnboarding(false);
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
      triggerHaptic('medium');
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
        triggerHaptic('light');
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

    triggerHaptic('success');
    showToast('Message sent!', 'success', 2000);

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
        apiUrl = `${API_BASE_URL}/api/query-logs`;
        requestBody = {
          spreadsheet_id: sheetId,
          query: inputMessage,
          max_logs: 100
        };
      } else {
        apiUrl = `${API_BASE_URL}/api/update-sheet`;
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

      // Save chat to history (save regardless of success/failure to preserve conversation)
      if (sheet) {
        await saveChatHistory(sheet.id, sheet.name, finalMessages);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Set current error for error recovery component
      setCurrentError(error);
      
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

  // Error handling functions
  const handleErrorRetry = () => {
    setCurrentError(null);
    triggerHaptic('light');
    // Retry the last action
    if (inputMessage.trim()) {
      handleSendMessage({ preventDefault: () => {} });
    }
  };

  const handleRefresh = async () => {
    triggerHaptic('success');
    showToast('Refreshing sheets...', 'info', 2000);
    await refreshSheets();
    showToast('Sheets refreshed!', 'success', 2000);
  };

  const handleErrorFix = (fixType) => {
    setCurrentError(null);
    switch (fixType) {
      case 'show-work-types':
        // Show available work types in a modal or sidebar
        console.log('Show work types');
        break;
      case 'show-locations':
        // Show available locations
        console.log('Show locations');
        break;
      case 're-authenticate':
        // Trigger re-authentication
        onLogout();
        break;
      case 'refresh-sheets':
        // Refresh sheets list
        handleRefreshSheets();
        break;
      default:
        console.log('Fix type:', fixType);
    }
  };

  const handleErrorDismiss = () => {
    setCurrentError(null);
  };

  // Show onboarding if needed
  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} user={user} />;
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Unified Navigation - Mobile responsive with overlay on small screens */}
      <>
        {/* Mobile overlay */}
        {isSidebarOpen && isMobile && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        
        <div className={`${
          isSidebarOpen 
            ? 'w-64 sm:w-72 md:w-80 fixed md:relative left-0 top-0 z-50 md:z-auto' 
            : 'w-0 md:w-0'
        } transition-all duration-300 ease-in-out overflow-hidden h-full`}>
          {isSidebarOpen && (
            <Navigation
              key={`navigation-${isSidebarOpen}`}
              sheets={availableSheets}
              currentSheetId={sheetId}
              isOpen={isSidebarOpen}
              onSelectSheet={(sheet) => {
                handleSheetSelect(sheet);
                // Auto-close sidebar on mobile after selection
                if (isMobile) {
                  setIsSidebarOpen(false);
                }
              }}
              onRefresh={handleRefreshSheets}
              onSelectChat={handleSelectChat}
              activeChatId={activeChatId}
              onToggle={() => setIsSidebarOpen(false)}
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
      {/* Header - Mobile responsive with glassmorphism */}
      <header className="glass-effect border-b border-white/20 px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between min-h-[60px] sm:min-h-[70px]">
        <div className="flex items-center flex-1 min-w-0">
          {/* Unified Toggle Button - Hidden on mobile when sidebar is open */}
          <button
            onClick={() => {
              setIsSidebarOpen(!isSidebarOpen);
              triggerHaptic('light');
            }}
            className={`p-2 sm:p-3 rounded-xl text-gray-600 hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-2 mr-3 flex-shrink-0 transition-all duration-200 hover:scale-105 group ${
              isMobile && isSidebarOpen ? 'hidden' : ''
            }`}
            title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            <div className="relative">
              {isSidebarOpen ? (
                <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-300 group-hover:scale-110" />
              ) : (
                <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-300 group-hover:scale-110" />
              )}
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
              {sheet ? sheet.name : 'No sheet selected'}
            </h1>
            {sheet && (
              <span className="text-sm text-gray-600 truncate border border-green-200 bg-green-50 rounded-full px-2 py-1">
                Sheet Connected { " "} <CheckCircle className="inline-block h-4 w-4 mr-2 text-green-800" />
              </span>
            )}
          </div>
        </div>
        
        {/* Open Sheet Button - Mobile responsive */}
        {sheetId && (
          <button
            onClick={() => {
              if (sheet && sheet.id) {
                window.open(`https://docs.google.com/spreadsheets/d/${sheet.id}`, '_blank');
              }
            }}
            className="inline-flex items-center px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 shadow-soft hover:shadow-medium hover:scale-105 flex-shrink-0 ml-3"
            title="Open sheet in Google Sheets"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            <span>Open Sheet</span>
          </button>
        )}
      </header>

        {/* Chat Area - Mobile responsive with modern styling */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-4xl mx-auto h-full flex flex-col">
            {!sheetId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-12">
                <div className="max-w-lg mx-auto w-full animate-fade-in-up">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 sm:mb-8 bg-gradient-to-br from-primary-100 to-primary-200 rounded-3xl flex items-center justify-center shadow-large animate-float">
                    <FileSpreadsheet size={32} className="text-primary-600 sm:w-10 sm:h-10" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 text-gradient-primary">
                    Welcome to Smart DPR
                  </h2>
                  <p className="text-base sm:text-lg text-gray-600 mb-8 px-4 leading-relaxed">
                    Select a sheet from the sidebar to start chatting with your data and unlock AI-powered insights
                  </p>
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 text-base font-medium rounded-2xl shadow-soft text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 hover:scale-105 hover:shadow-medium"
                  >
                    <FileSpreadsheet className="mr-3 h-5 w-5" />
                    Browse Sheets
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {messages.map((msg, index) => (
                  <div 
                    key={msg.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <ChatMessage 
                      message={msg}
                      isUser={msg.isUser}
                      isLoading={msg.isLoading}
                      isError={msg.isError}
                      enableGestures={isMobile}
                      showActions={true}
                      userProfile={user}
                      onRegenerate={(message) => {
                        // Handle regenerate functionality
                        console.log('Regenerate message:', message);
                      }}
                      onCopy={(message) => {
                        // Handle copy functionality
                        console.log('Copy message:', message);
                      }}
                    />
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area - Only show when a sheet is selected */}
        {sheetId && (
          <div className=" pt-0 p-4 sm:p-6">
            <div className="max-w-4xl mx-auto">
              {/* Error Recovery Component */}
              {currentError && (
                <div className="mb-6">
                  <ErrorRecovery
                    error={currentError}
                    onRetry={handleErrorRetry}
                    onFix={handleErrorFix}
                    onDismiss={handleErrorDismiss}
                  />
                </div>
              )}
              
              {/* Unified Input Component */}
              <Input
                inputMessage={inputMessage}
                setInputMessage={setInputMessage}
                onSubmit={handleSendMessage}
                mode={mode}
                setMode={setMode}
                isRecording={isRecording}
                onToggleRecording={toggleRecording}
                disabled={loading}
                onRefresh={handleRefresh}
              />
              
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="fixed bottom-6 right-6 max-w-sm glass-effect border border-error-200/50 p-4 rounded-2xl shadow-large z-50 animate-slide-in-right">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-error-100 to-error-200 flex items-center justify-center">
                <svg className="h-5 w-5 text-error-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm text-error-800 font-medium">{error}</p>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                onClick={() => setError('')}
                className="inline-flex text-error-400 hover:text-error-600 focus:outline-none transition-colors duration-200"
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


      {/* Toast Container */}
      <ToastContainer />

      {/* Loading Overlay */}
      <LoadingOverlay 
        message="Processing your request..." 
        isVisible={isLoading} 
      />
    </div>
  );
};

export default SheetEditor;
