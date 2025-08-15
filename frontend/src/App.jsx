import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, useOutlet } from 'react-router-dom';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import SheetEditor from './components/SheetEditor.jsx';
import googleAuthService from './services/googleAuth.js';

// Key for storing auth state in localStorage
const AUTH_STORAGE_KEY = 'dpr_auth_state';
const LAST_ROUTE_KEY = 'dpr_last_route';

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
  const [initialPath, setInitialPath] = useState('/');

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
        
        // Store current path if not login page
        if (!window.location.pathname.includes('/login')) {
          console.log('checkAuthStatus - Storing current path for redirect:', window.location.pathname);
          localStorage.setItem(LAST_ROUTE_KEY, window.location.pathname);
        }
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
          
          // Get the current path and the last saved route
          const currentPath = window.location.pathname;
          const lastRoute = localStorage.getItem(LAST_ROUTE_KEY);
          
          console.log('checkAuthStatus - Current path:', currentPath);
          console.log('checkAuthStatus - Last saved route:', lastRoute);
          
          // If we're on the root path and have a last route, navigate there
          if (currentPath === '/' && lastRoute && lastRoute !== '/') {
            console.log('checkAuthStatus - Redirecting to last route:', lastRoute);
            // Use a small timeout to ensure the router is ready
            setTimeout(() => {
              window.history.replaceState({}, '', lastRoute);
              window.location.reload(); // Force a reload to ensure components update
            }, 100);
          }
        } else {
          console.error('checkAuthStatus - Error parsing user data');
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
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/login" element={
            isAuthenticated ? (
              <Navigate to={"/"} replace />
            ) : (
              <Login onLogin={handleLogin} />
            )
          } />
          
          {/* Protected Routes */}
          <Route element={
            <RouteGuard isAuthenticated={isAuthenticated} isLoading={isLoading} />
          }>
            <Route path="/" element={<Dashboard user={user} onLogout={handleLogout} />} />
            <Route path="/sheet/:id" element={
              <SheetEditor 
                onLogout={handleLogout}
                user={user}
              />
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
