import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, useOutlet } from 'react-router-dom';
import Login from './components/Login.jsx';
import SheetEditor from './components/SheetEditor.jsx';
import googleAuthService from './services/googleAuth.js';

// Key for storing auth state in localStorage
const AUTH_STORAGE_KEY = 'dpr_auth_state';
const LAST_ROUTE_KEY = 'dpr_last_route';
const USER_INFO_KEY = 'dpr_user_info';

// Route Guard component
const RouteGuard = ({ isAuthenticated, isLoading }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const outlet = useOutlet();

  useEffect(() => {
    // Store the current route whenever it changes
    if (isAuthenticated && !isLoading && location.pathname !== '/') {
      console.log('RouteGuard - Storing current route:', location.pathname);
      localStorage.setItem(LAST_ROUTE_KEY, location.pathname);
    }
  }, [location.pathname, isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Store the intended destination before redirecting to login
    if (location.pathname !== '/login') {
      console.log('RouteGuard - Storing path for redirect:', location.pathname);
      localStorage.setItem(LAST_ROUTE_KEY, location.pathname);
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{outlet}</>;
};

// Create a wrapper component to handle the app logic
function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Initialize state from localStorage if available
    const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    return savedAuth ? JSON.parse(savedAuth) : false;
  });
  
  const [user, setUser] = useState(() => {
    // Initialize user from localStorage if available
    const savedUser = localStorage.getItem(USER_INFO_KEY) || localStorage.getItem(`${AUTH_STORAGE_KEY}_user`);
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      console.log('checkAuthStatus - Starting authentication check');
      setIsLoading(true);
      
      try {
        console.log('checkAuthStatus - Initializing Google Auth...');
        await googleAuthService.initialize();
        
        // Check if user is already authenticated
        const isSignedIn = await googleAuthService.isSignedIn();
        console.log('checkAuthStatus - isSignedIn:', isSignedIn);
        
        if (isSignedIn) {
          // Get user info
          const token = await googleAuthService.getAccessToken();
          const userInfo = await googleAuthService.getUserProfile(token);
          console.log('checkAuthStatus - User info:', userInfo);
          
          // Update state and localStorage
          setIsAuthenticated(true);
          setUser(userInfo);
          localStorage.setItem(AUTH_STORAGE_KEY, 'true');
          localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
          
          // Get the current path and the last saved route
          const currentPath = window.location.pathname;
          const lastRoute = localStorage.getItem(LAST_ROUTE_KEY) || '/';
          
          console.log('checkAuthStatus - Current path:', currentPath);
          console.log('checkAuthStatus - Last saved route:', lastRoute);
          
          // Redirect to the last visited route if coming from login
          if (currentPath === '/login') {
            navigate(lastRoute, { replace: true });
          }
        } else {
          console.log('checkAuthStatus - User is not signed in');
          setIsAuthenticated(false);
          setUser(null);
          localStorage.removeItem(AUTH_STORAGE_KEY);
          localStorage.removeItem(USER_INFO_KEY);
          
          // Store current path if not login page
          if (!location.pathname.includes('/login')) {
            console.log('checkAuthStatus - Storing current path for redirect:', location.pathname);
            localStorage.setItem(LAST_ROUTE_KEY, location.pathname);
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(USER_INFO_KEY);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuthStatus();
  }, [navigate, location.pathname]);

  const handleLogin = async () => {
    try {
      await googleAuthService.signIn();
      const isSignedIn = await googleAuthService.isSignedIn();
      
      if (isSignedIn) {
        // Get user info
        const token = await googleAuthService.getAccessToken();
        const userInfo = await googleAuthService.getUserProfile(token);
        
        // Update state and localStorage
        setIsAuthenticated(true);
        setUser(userInfo);
        localStorage.setItem(AUTH_STORAGE_KEY, 'true');
        localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
        
        // Redirect to the last visited route or home
        const lastRoute = localStorage.getItem(LAST_ROUTE_KEY) || '/';
        navigate(lastRoute, { replace: true });
      }
    } catch (error) {
      console.error('Login error:', error);
      // Reset state on error
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(USER_INFO_KEY);
    }
  };

  const handleLogout = async () => {
    try {
      await googleAuthService.signOut();
      // Clear all auth-related data
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(USER_INFO_KEY);
      localStorage.removeItem(LAST_ROUTE_KEY);
      // Redirect to login page
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, we should still clear the auth state
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(USER_INFO_KEY);
      localStorage.removeItem(LAST_ROUTE_KEY);
      navigate('/login', { replace: true });
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
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? 
            <Navigate to="/" replace /> : 
            <Login onLogin={handleLogin} />
        } />
        
        <Route element={
          <RouteGuard 
            isAuthenticated={isAuthenticated} 
            isLoading={isLoading} 
          />
        }>
          <Route 
            path="/" 
            element={
              <SheetEditor 
                user={user}
                onLogout={handleLogout} 
              />
            } 
          />
          <Route 
            path="/sheet/:id" 
            element={
              <SheetEditor 
                user={user}
                onLogout={handleLogout} 
              />
            } 
          />
        </Route>
        
        {/* 404 - Redirect to home if authenticated, otherwise to login */}
        <Route path="*" element={
          isAuthenticated ? 
            <Navigate to="/" replace /> : 
            <Navigate to="/login" replace />
        } />
      </Routes>
    </div>
  );
}

// Main App component that wraps everything with Router
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
