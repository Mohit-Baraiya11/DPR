import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, RefreshCw, Plus, Trash2, Edit2, Type, LogOut } from 'lucide-react';
import googleAuthService from '../services/googleAuth';

const SheetEditor = ({ onLogout }) => {
  const { id: sheetId } = useParams();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);

  const fetchSheetData = async (id) => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching data for sheet ID:', id);
      
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
      
      // Get both sheet data and metadata in parallel
      const [sheetData, metadata] = await Promise.all([
        googleAuthService.getSheetData(id),
        googleAuthService.getSpreadsheetMetadata(id)
      ]);
      
      console.log('Received sheet data:', sheetData);
      
      // Update sheet metadata
      setSheet({
        id,
        name: metadata.properties.title,
        ...sheetData
      });
      
      // Update data state
      if (!sheetData || !sheetData.values) {
        console.warn('No data returned from sheet, initializing empty data');
        setData([[]]);
      } else {
        setData(sheetData.values);
      }
      
      return sheetData;
      
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

  const handleCellEdit = (rowIndex, colIndex) => {
    const currentValue = data[rowIndex] ? data[rowIndex][colIndex] || '' : '';
    setEditingCell({ row: rowIndex, col: colIndex });
    setEditValue(currentValue);
  };

  const handleCellSave = async () => {
    if (!editingCell) return;

    try {
      setSaving(true);
      const { row, col } = editingCell;
      
      // Update local data
      const newData = [...data];
      while (newData.length <= row) {
        newData.push([]);
      }
      while (newData[row].length <= col) {
        newData[row].push('');
      }
      newData[row][col] = editValue;
      setData(newData);

      // Update Google Sheets
      const range = `A${row + 1}:${String.fromCharCode(65 + col)}${row + 1}`;
      await googleAuthService.updateSheetData(sheetId, range, [[editValue]]);

      setEditingCell(null);
      setEditValue('');
    } catch (error) {
      console.error('Error updating cell:', error);
      setError('Failed to update cell. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRow = async () => {
    try {
      setSaving(true);
      const newRow = new Array(Math.max(5, data[0]?.length || 0)).fill('');
      const newData = [...data, newRow];
      setData(newData);

      // Add row to Google Sheets
      const range = `A${newData.length}`;
      await googleAuthService.appendSheetData(sheet.id, range, [newRow]);
    } catch (error) {
      console.error('Error adding row:', error);
      setError('Failed to add row. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrintHelloWorld = async () => {
    try {
      setIsPrinting(true);
      setError('');
      
      // Get the auth token
      const authInfo = googleAuthService.getAuthInfo();
      if (!authInfo || !authInfo.hasToken) {
        await googleAuthService.signIn();
      }
      
      // Call the backend endpoint
      const response = await fetch('http://localhost:8000/api/print-hello-world', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${googleAuthService.gapi.client.getToken().access_token}`
        },
        body: JSON.stringify({
          spreadsheet_id: sheet.id,
          sheet_name: 'Sheet1',
          row_count: 10
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to print Hello World');
      }

      // Refresh the sheet data to show the changes
      if (sheet?.id) {
        await fetchSheetData(sheet.id);
      }
      
    } catch (error) {
      console.error('Error printing Hello World:', error);
      setError(`Failed to print Hello World: ${error.message}`);
    } finally {
      setIsPrinting(false);
    }
  };

  const getColumnLetter = (index) => {
    return String.fromCharCode(65 + index);
  };

  const maxColumns = Math.max(...data.map(row => row?.length || 0), 5);

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${isPrinting ? 'p-8' : ''}`}>
      {/* Header */}
      <div className={`bg-white ${isPrinting ? 'hidden' : 'sticky top-0 z-10 shadow-sm border-b'}`}>
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
                {sheet?.name || 'Loading...'}
              </h1>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => fetchSheetContent(sheetId)}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleAddRow}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Row
              </button>
              <button
                onClick={handlePrintHelloWorld}
                disabled={isPrinting || saving}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                <Type className={`h-4 w-4 mr-2 ${isPrinting ? 'animate-pulse' : ''}`} />
                {isPrinting ? 'Printing...' : 'Hello World'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-600">Loading sheet data...</span>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      #
                    </th>
                    {Array.from({ length: maxColumns }, (_, colIndex) => (
                      <th
                        key={colIndex}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {getColumnLetter(colIndex)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 bg-gray-50">
                        {rowIndex + 1}
                      </td>
                      {Array.from({ length: maxColumns }, (_, colIndex) => (
                        <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="block w-full px-3 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleCellSave();
                                  } else if (e.key === 'Escape') {
                                    setEditingCell(null);
                                    setEditValue('');
                                  }
                                }}
                                autoFocus
                              />
                              <button
                                onClick={handleCellSave}
                                disabled={saving}
                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                              >
                                <Save className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div
                              className="cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[24px] flex items-center"
                              onClick={() => handleCellEdit(rowIndex, colIndex)}
                            >
                              {row && row[colIndex] ? row[colIndex] : (
                                <span className="text-gray-400 text-xs">Click to edit</span>
                              )}
                              <Edit2 className="h-3 w-3 ml-2 text-gray-400 opacity-0 group-hover:opacity-100" />
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No data found in this sheet</p>
                <button
                  onClick={handleAddRow}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Row
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SheetEditor;
