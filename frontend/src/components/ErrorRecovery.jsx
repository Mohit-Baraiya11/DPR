import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Lightbulb, ExternalLink, Copy } from 'lucide-react';

const ErrorRecovery = ({ error, onRetry, onFix, onDismiss }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const getErrorInfo = (error) => {
    const errorMessage = error.message || error.toString();
    
    // Parse different types of errors
    if (errorMessage.includes('Work type') && errorMessage.includes('not found')) {
      return {
        type: 'work-type-not-found',
        title: 'Work Type Not Recognized',
        message: 'The work type you mentioned wasn\'t found in your sheet.',
        suggestions: [
          'Check the spelling of the work type',
          'Try using similar terms',
          'View available work types in your sheet'
        ],
        actions: [
          { 
            label: 'Show Available Work Types', 
            action: () => onFix('show-work-types'),
            icon: <Lightbulb className="w-4 h-4" />
          },
          { 
            label: 'Suggest Similar Terms', 
            action: () => onFix('suggest-similar'),
            icon: <RefreshCw className="w-4 h-4" />
          }
        ],
        severity: 'warning'
      };
    }
    
    if (errorMessage.includes('Location') && errorMessage.includes('not found')) {
      return {
        type: 'location-not-found',
        title: 'Location Not Found',
        message: 'The location you mentioned wasn\'t found in your sheet.',
        suggestions: [
          'Check the spelling of the location',
          'Verify the location exists in your sheet',
          'Try using the exact location name from your sheet'
        ],
        actions: [
          { 
            label: 'Show Available Locations', 
            action: () => onFix('show-locations'),
            icon: <Lightbulb className="w-4 h-4" />
          },
          { 
            label: 'Auto-correct Location', 
            action: () => onFix('auto-correct-location'),
            icon: <RefreshCw className="w-4 h-4" />
          }
        ],
        severity: 'warning'
      };
    }
    
    if (errorMessage.includes('Authentication') || errorMessage.includes('401')) {
      return {
        type: 'authentication-error',
        title: 'Authentication Expired',
        message: 'Your Google authentication has expired. Please sign in again.',
        suggestions: [
          'Sign out and sign back in',
          'Check your internet connection',
          'Try refreshing the page'
        ],
        actions: [
          { 
            label: 'Sign In Again', 
            action: () => onFix('re-authenticate'),
            icon: <RefreshCw className="w-4 h-4" />
          }
        ],
        severity: 'error'
      };
    }
    
    if (errorMessage.includes('Sheet') && errorMessage.includes('not found')) {
      return {
        type: 'sheet-not-found',
        title: 'Sheet Not Found',
        message: 'The selected sheet could not be found or accessed.',
        suggestions: [
          'Check if the sheet still exists',
          'Verify you have access to the sheet',
          'Try selecting a different sheet'
        ],
        actions: [
          { 
            label: 'Refresh Sheets', 
            action: () => onFix('refresh-sheets'),
            icon: <RefreshCw className="w-4 h-4" />
          },
          { 
            label: 'Select Different Sheet', 
            action: () => onFix('select-different-sheet'),
            icon: <ExternalLink className="w-4 h-4" />
          }
        ],
        severity: 'error'
      };
    }
    
    if (errorMessage.includes('API key') || errorMessage.includes('GROQ')) {
      return {
        type: 'api-key-error',
        title: 'AI Service Unavailable',
        message: 'The AI service is temporarily unavailable. Please try again later.',
        suggestions: [
          'Wait a moment and try again',
          'Check your internet connection',
          'Contact support if the issue persists'
        ],
        actions: [
          { 
            label: 'Try Again', 
            action: () => onRetry(),
            icon: <RefreshCw className="w-4 h-4" />
          }
        ],
        severity: 'error'
      };
    }
    
    // Generic error
    return {
      type: 'generic-error',
      title: 'Something went wrong',
      message: 'An unexpected error occurred while processing your request.',
      suggestions: [
        'Try again in a moment',
        'Check your internet connection',
        'Contact support if the problem continues'
      ],
      actions: [
        { 
          label: 'Try Again', 
          action: () => onRetry(),
          icon: <RefreshCw className="w-4 h-4" />
        }
      ],
      severity: 'error'
    };
  };

  const errorInfo = getErrorInfo(error);
  
  const copyErrorDetails = () => {
    const errorText = `Error: ${errorInfo.title}\nMessage: ${errorInfo.message}\nDetails: ${error.message || error.toString()}`;
    navigator.clipboard.writeText(errorText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getSeverityStyles = (severity) => {
    switch (severity) {
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-600',
          title: 'text-yellow-800',
          message: 'text-yellow-700'
        };
      case 'error':
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-600',
          title: 'text-red-800',
          message: 'text-red-700'
        };
      default:
        return {
          container: 'bg-gray-50 border-gray-200',
          icon: 'text-gray-600',
          title: 'text-gray-800',
          message: 'text-gray-700'
        };
    }
  };

  const styles = getSeverityStyles(errorInfo.severity);

  return (
    <div className={`border-l-4 ${styles.container} p-4 rounded-r-lg shadow-sm`}>
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 ${styles.icon}`}>
          <AlertTriangle className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-medium ${styles.title}`}>
              {errorInfo.title}
            </h3>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
              
              <button
                onClick={copyErrorDetails}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1"
                title="Copy error details"
              >
                <Copy className="w-3 h-3" />
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
              
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
          
          <p className={`mt-1 text-sm ${styles.message}`}>
            {errorInfo.message}
          </p>
          
          {/* Suggestions */}
          <div className="mt-3">
            <h4 className="text-xs font-medium text-gray-600 mb-2">Suggestions:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              {errorInfo.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Action Buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            {errorInfo.actions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
            
            <button
              onClick={onRetry}
              className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Try Again</span>
            </button>
          </div>
          
          {/* Error Details (Collapsible) */}
          {showDetails && (
            <div className="mt-4 p-3 bg-gray-100 rounded-md">
              <h4 className="text-xs font-medium text-gray-600 mb-2">Technical Details:</h4>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words">
                {error.message || error.toString()}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorRecovery;
