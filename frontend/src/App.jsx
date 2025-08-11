import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import googleAuthService from './services/googleAuth.js';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    // Save the current route whenever it changes
    if (!isLoading && location.pathname !== '/login') {
      localStorage.setItem('lastPath', location.pathname);
    }
  }, [location.pathname, isLoading]);

  const checkAuthStatus = async () => {
    try {
      await googleAuthService.initialize();
      const isSignedIn = googleAuthService.isSignedIn();
      
      if (!isSignedIn) {
        const token = localStorage.getItem('google_auth_token');
        if (token) {
          try {
            await googleAuthService.signIn();
            setIsAuthenticated(true);
            // Redirect to last visited path or dashboard
            const lastPath = localStorage.getItem('lastPath') || '/';
            navigate(lastPath);
          } catch (error) {
            console.error('Failed to restore session:', error);
            localStorage.removeItem('google_auth_token');
            setIsAuthenticated(false);
            navigate('/login');
          }
        } else {
          setIsAuthenticated(false);
          navigate('/login');
        }
      } else {
        setIsAuthenticated(true);
        // If user is already authenticated but on login page, redirect to last path or dashboard
        if (location.pathname === '/login') {
          const lastPath = localStorage.getItem('lastPath') || '/';
          navigate(lastPath);
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      navigate('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    const lastPath = localStorage.getItem('lastPath') || '/';
    navigate(lastPath);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('lastPath');
    navigate('/login');
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
      <Routes>
        <Route 
          path="/login" 
          element={!isAuthenticated ? 
            <Login onLogin={handleLogin} /> : 
            <Navigate to="/" replace />
          } 
        />
        <Route 
          path="/*" 
          element={
            isAuthenticated ? 
              <Dashboard onLogout={handleLogout} /> : 
              <Navigate to="/login" state={{ from: location }} replace />
          } 
        />
      </Routes>
    </div>
  );
}

export default App;
