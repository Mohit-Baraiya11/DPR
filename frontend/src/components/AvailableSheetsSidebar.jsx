import React from 'react';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';

const AvailableSheetsSidebar = ({ onSelectSheet, currentSheetId, onRefresh, sheets = [] }) => {
  const loading = sheets.length === 0;

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Your Sheets</h2>
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          title="Refresh sheets"
          disabled={loading}
        >
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <RefreshCw className="animate-spin h-5 w-5 text-gray-500" />
          </div>
        ) : sheets.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {sheets.map((sheet) => (
              <li key={sheet.id}>
                <button
                  onClick={() => onSelectSheet(sheet)}
                  className={`w-full text-left p-3 hover:bg-gray-100 text-sm flex items-center ${
                    sheet.id === currentSheetId 
                      ? 'bg-blue-50 text-blue-700 font-medium' 
                      : 'text-gray-700 hover:bg-gray-50'
                  } transition-colors duration-150`}
                >
                  <FileSpreadsheet 
                    className={`h-4 w-4 mr-3 flex-shrink-0 ${
                      sheet.id === currentSheetId ? 'text-blue-500' : 'text-gray-400'
                    }`} 
                  />
                  <span className="truncate">{sheet.name}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <FileSpreadsheet className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No sheets found</p>
            <button
              onClick={onRefresh}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailableSheetsSidebar;
