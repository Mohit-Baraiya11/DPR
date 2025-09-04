import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import googleAuthService from '../services/googleAuth';

// Key for storing auth state in localStorage
const AUTH_STORAGE_KEY = 'dpr_auth_state';
const USER_INFO_KEY = 'dpr_user_info';

export const useUserManagement = () => {
  const navigate = useNavigate();
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

  // Check authentication status on component mount
  const checkAuthStatus = useCallback(async () => {
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
      } else {
        console.log('checkAuthStatus - User is not signed in');
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(USER_INFO_KEY);
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
  }, []);

  // Handle login
  const handleLogin = useCallback(async () => {
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
        
        return { success: true, user: userInfo };
      }
      return { success: false, error: 'Failed to sign in' };
    } catch (error) {
      console.error('Login error:', error);
      // Reset state on error
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(USER_INFO_KEY);
      return { success: false, error: error.message };
    }
  }, []);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await googleAuthService.signOut();
      // Clear all auth-related data
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(USER_INFO_KEY);
      localStorage.removeItem('dpr_last_route');
      // Redirect to login page
      navigate('/login', { replace: true });
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, we should still clear the auth state
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(USER_INFO_KEY);
      localStorage.removeItem('dpr_last_route');
      navigate('/login', { replace: true });
      return { success: false, error: error.message };
    }
  }, [navigate]);

  // Get user profile information
  const getUserProfile = useCallback(() => {
    return {
      name: user?.name || 'User',
      email: user?.email || '',
      avatar: user?.picture || null,
      initials: user?.name ? user.name.charAt(0).toUpperCase() : 'U'
    };
  }, [user]);

  // Check if user has specific permission (for future use)
  const hasPermission = useCallback((permission) => {
    // This can be extended to check user roles/permissions
    return isAuthenticated;
  }, [isAuthenticated]);

  // Refresh user data
  const refreshUserData = useCallback(async () => {
    if (!isAuthenticated) return { success: false, error: 'Not authenticated' };
    
    try {
      const token = await googleAuthService.getAccessToken();
      const userInfo = await googleAuthService.getUserProfile(token);
      
      setUser(userInfo);
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
      return { success: true, user: userInfo };
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return { success: false, error: error.message };
    }
  }, [isAuthenticated]);

  // Initialize auth check on mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return {
    // State
    isAuthenticated,
    user,
    isLoading,
    
    // Actions
    handleLogin,
    handleLogout,
    checkAuthStatus,
    refreshUserData,
    
    // Utilities
    getUserProfile,
    hasPermission
  };
};

export default useUserManagement;
