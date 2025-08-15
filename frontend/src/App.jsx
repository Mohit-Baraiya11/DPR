import React, { useState, useEffect } from 'react';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import googleAuthService from './services/googleAuth.js';

// Key for storing auth state in localStorage
const AUTH_STORAGE_KEY = 'dpr_auth_state';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Initialize state from localStorage if available
    const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    return savedAuth ? JSON.parse(savedAuth) : false;
  });
  
  const [user, setUser] = useState(() => {
    // Initialize user from localStorage if available
    const savedUser = localStorage.getItem(`${AUTH_STORAGE_KEY}_user`);
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    console.log('checkAuthStatus - Starting authentication check');
    setIsLoading(true);
    
    try {
      console.log('checkAuthStatus - Initializing Google Auth...');
      await googleAuthService.initialize();
      
      // Check if user is already authenticated
      const isSignedIn = await googleAuthService.isSignedIn();
      console.log('checkAuthStatus - isSignedIn:', isSignedIn);
      
      if (!isSignedIn) {
        console.log('checkAuthStatus - User is not signed in');
        setIsAuthenticated(false);
        setUser(null);
        return;
      }
      
      // Get the user data from localStorage
      const savedUser = localStorage.getItem(`${AUTH_STORAGE_KEY}_user`);
      if (!savedUser) {
        console.log('checkAuthStatus - No user data found, logging out');
        await handleLogout();
        return;
      }
      
      try {
        const userData = JSON.parse(savedUser);
        if (userData?.email) {
          console.log('checkAuthStatus - Setting user data from localStorage');
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          console.log('checkAuthStatus - Invalid user data, logging out');
          await handleLogout();
        }
      } catch (error) {
        console.error('checkAuthStatus - Error parsing user data:', error);
        await handleLogout();
      }
      
    } catch (error) {
      console.error('Error in checkAuthStatus:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      const authInfo = await googleAuthService.signIn();
      const authState = true;
      setIsAuthenticated(authState);
      setUser(authInfo.user || { name: 'User' });
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
      if (authInfo.user) {
        localStorage.setItem(`${AUTH_STORAGE_KEY}_user`, JSON.stringify(authInfo.user));
      }
    } catch (error) {
      console.error('Login error:', error);
      // Handle login error
    }
  };

  const handleLogout = async () => {
    try {
      console.log('handleLogout - Starting logout process');
      await googleAuthService.signOut();
      console.log('handleLogout - Sign out completed');
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Always clear local state regardless of signOut result
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem(`${AUTH_STORAGE_KEY}_user`);
      console.log('handleLogout - Local state cleared');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing SMART DPR...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {isAuthenticated ? (
        <Dashboard onLogout={handleLogout} user={user} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
