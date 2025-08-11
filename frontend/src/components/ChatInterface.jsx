import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send } from 'lucide-react';

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const ChatInterface = ({ sheet, onBack }) => {
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      text: `Welcome to the chat for "${sheet?.name}"! How can I help you with this sheet?`, 
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message with timestamp
    const userMessage = { 
      id: Date.now(), 
      text: input, 
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Simulate bot response with timestamp
    setTimeout(() => {
      const botMessage = { 
        id: Date.now() + 1, 
        text: `I've received your message about "${input}" for the sheet "${sheet?.name}". This is a demo response.`, 
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center">
        <button 
          onClick={onBack}
          className="p-2 rounded-full hover:bg-gray-100 mr-2"
          aria-label="Back to sheets"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="ml-2">
          <h2 className="text-lg font-semibold text-gray-900">{sheet?.name}</h2>
          <p className="text-sm text-gray-500">Chat about this sheet</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-3/4 rounded-lg px-4 py-2 ${
                message.sender === 'user' 
                  ? 'bg-gray-200 text-gray-900 rounded-br-none' 
                  : 'bg-white border border-gray-200 rounded-bl-none'
              }`}
            >
              <p className="text-sm">{message.text}</p>
              <p className={`text-xs mt-1 ${
                message.sender === 'user' ? 'text-gray-500' : 'text-gray-400'
              }`}>
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSend} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
