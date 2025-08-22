import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, RefreshCw, LogOut, Edit3, Plus } from 'lucide-react';
import googleAuthService from '../services/googleAuth.js';
import { FiChevronUp, FiChevronDown, FiLogOut } from 'react-icons/fi';

const Dashboard = ({ onLogout, user }) => {
  console.log('Dashboard - User prop:', user);
  const [spreadsheets, setSpreadsheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  useEffect(() => {
    fetchSpreadsheets();
  }, []);

  const fetchSpreadsheets = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Debug authentication status
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
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        result: error.result
      });
      
      // More specific error messages
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

  const handleSheetClick = (sheet) => {
    navigate(`/sheet/${sheet.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 gap-4 sm:gap-0">
            <h1 className="text-2xl font-bold text-gray-900">SMART DPR</h1>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={fetchSpreadsheets}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <div className="relative">
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center space-x-2 focus:outline-none"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{user?.name || 'User'}</span>
                  {isProfileDropdownOpen ? <FiChevronUp /> : <FiChevronDown />}
                </button>
                
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                    <div className="px-4 py-2">
                      <p className="text-sm font-medium">{user?.name || 'User'}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
                    </div>
                    <button
                      onClick={() => {
                        onLogout();
                        setIsProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <FiLogOut className="mr-2" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Your Google Sheets</h2>
          <p className="text-sm text-gray-600">
            Select a spreadsheet to view and edit your data
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-600">Loading spreadsheets...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {spreadsheets.map((sheet) => (
              <div
                key={sheet.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleSheetClick(sheet)}
              >
                <div className="flex items-start space-x-3">
                  <FileSpreadsheet className="h-8 w-8 text-green-600 mt-1" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {sheet.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Modified: {formatDate(sheet.modifiedTime)}
                    </p>
                  </div>
                  <Edit3 className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && spreadsheets.length === 0 && (
          <div className="text-center py-12">
            <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No spreadsheets found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Create a Google Sheet to get started
            </p>
            <div className="mt-6">
              <a
                href="https://docs.google.com/spreadsheets/create"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Sheet
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
