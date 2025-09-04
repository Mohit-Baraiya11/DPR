import React, { useState } from 'react';
import { User, LogOut, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { triggerHaptic } from '../../utils/gestureDetector';

const UserProfile = ({ 
  user, 
  onLogout, 
  variant = 'compact', // 'compact', 'expanded', 'dropdown'
  className = '',
  showSettings = true,
  showLogout = true
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  React.useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = () => {
    triggerHaptic('medium');
    onLogout?.();
  };

  const handleSettings = () => {
    triggerHaptic('light');
    // Settings functionality to be implemented
    console.log('Settings clicked');
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
    triggerHaptic('light');
  };

  // Compact variant (for sidebars)
  if (variant === 'compact') {
    return (
      <div className={`border-t border-gray-200 p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-medium overflow-hidden">
              {user?.picture ? (
                <img 
                  src={user.picture} 
                  alt={user.name || 'User'} 
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    // Fallback to initials if image fails to load
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <span style={{ display: user?.picture ? 'none' : 'flex' }}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name || 'User'}
              </p>
              {user?.email && (
                <p className="text-xs text-gray-500 truncate">
                  {user.email}
                </p>
              )}
            </div>
          </div>
          {showLogout && (
            <button
              onClick={handleLogout}
              className="flex-shrink-0 p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Expanded variant (for mobile navigation)
  if (variant === 'expanded') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Profile</h3>
          <div className="text-xs text-gray-500">
            Account settings
          </div>
        </div>
        
        {/* User Info */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden">
              {user?.picture ? (
                <img 
                  src={user.picture} 
                  alt={user.name || 'User'} 
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    // Fallback to initials if image fails to load
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <span style={{ display: user?.picture ? 'none' : 'flex' }}>
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="ml-3">
              <p className="font-medium text-gray-800">{user?.name || 'User'}</p>
              <p className="text-sm text-gray-500">{user?.email || 'user@example.com'}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          {showSettings && (
            <button 
              onClick={handleSettings}
              className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
            >
              <div className="flex items-center">
                <Settings className="h-5 w-5 mr-3 text-gray-600" />
                <span className="text-gray-700">Settings</span>
              </div>
            </button>
          )}
          
          {showLogout && (
            <button 
              onClick={handleLogout}
              className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-200 transition-colors duration-200"
            >
              <div className="flex items-center">
                <LogOut className="h-5 w-5 mr-3 text-red-600" />
                <span className="text-red-600">Sign Out</span>
              </div>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Dropdown variant (for headers)
  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={toggleDropdown}
          className="flex items-center space-x-2 focus:outline-none"
        >
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white overflow-hidden">
            {user?.picture ? (
              <img 
                src={user.picture} 
                alt={user.name || 'User'} 
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  // Fallback to initials if image fails to load
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <span style={{ display: user?.picture ? 'none' : 'flex' }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </span>
          </div>
          {!isMobile && (
            <>
              <span className="text-sm font-medium">{user?.name || 'User'}</span>
              {isDropdownOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </>
          )}
        </button>
        
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
            <div className="px-4 py-2">
              <p className="text-sm font-medium">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
            </div>
            {showSettings && (
              <button
                onClick={handleSettings}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <Settings className="mr-2 w-4 h-4" />
                Settings
              </button>
            )}
            {showLogout && (
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <LogOut className="mr-2 w-4 h-4" />
                Sign Out
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default variant (simple display)
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white overflow-hidden">
        {user?.picture ? (
          <img 
            src={user.picture} 
            alt={user.name || 'User'} 
            className="w-full h-full object-cover rounded-full"
            onError={(e) => {
              // Fallback to initials if image fails to load
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <span style={{ display: user?.picture ? 'none' : 'flex' }}>
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {user?.name || 'User'}
        </p>
        {user?.email && (
          <p className="text-xs text-gray-500 truncate">
            {user.email}
          </p>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
