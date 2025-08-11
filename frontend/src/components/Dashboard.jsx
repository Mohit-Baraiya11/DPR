import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, RefreshCw, LogOut, MessageSquare } from 'lucide-react';
import googleAuthService from '../services/googleAuth.js';
import ChatInterface from './ChatInterface';

const Dashboard = ({ onLogout }) => {
  const [spreadsheets, setSpreadsheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [error, setError] = useState('');
  const [view, setView] = useState('list'); // 'list' or 'chat'

  useEffect(() => {
    fetchSpreadsheets();
  }, []);

  const fetchSpreadsheets = async () => {
    try {
      setLoading(true);
      setError('');
      
      const authInfo = googleAuthService.getAuthInfo();
      console.log('Auth info:', authInfo);
      
      if (!authInfo.hasToken) {
        setError('Authentication token is missing. Please sign in again.');
        onLogout();
        return;
      }
      
      const sheets = await googleAuthService.getSpreadsheets();
      console.log('Fetched sheets:', sheets);
      setSpreadsheets(sheets);
    } catch (error) {
      console.error('Error fetching spreadsheets:', error);
      
      if (error.status === 403) {
        setError('Access denied. Please check your Google Drive permissions.');
      } else if (error.status === 401) {
        setError('Authentication expired. Please sign in again.');
        onLogout();
      } else {
        setError(`Failed to fetch spreadsheets: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    googleAuthService.signOut();
    onLogout();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSheetSelect = (sheet) => {
    setSelectedSheet(sheet);
    setView('chat');
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedSheet(null);
  };

  if (view === 'chat' && selectedSheet) {
    return (
      <ChatInterface 
        sheet={selectedSheet} 
        onBack={handleBackToList}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">SMART DPR</h1>
            <div className="flex space-x-4">
              <button
                onClick={fetchSpreadsheets}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Your Google Sheets</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Select a sheet to start chatting about it</p>
          </div>
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4">
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

          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {spreadsheets.map((sheet) => (
                <li key={sheet.id}>
                  <button
                    onClick={() => handleSheetSelect(sheet)}
                    className="w-full text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                  >
                    <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                      <div className="flex items-center">
                        <FileSpreadsheet className="h-5 w-5 text-green-600 mr-3" />
                        <p className="text-sm font-medium text-primary-600 truncate">
                          {sheet.name}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Open Chat
                        </span>
                        <MessageSquare className="ml-2 h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
