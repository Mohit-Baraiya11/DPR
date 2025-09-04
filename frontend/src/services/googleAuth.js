import { GOOGLE_CONFIG } from '../config.js';

// Key for storing token in localStorage
const TOKEN_STORAGE_KEY = 'dpr_google_token';

class GoogleAuthService {
  constructor() {
    this.gapi = null;
    this.tokenClient = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      return Promise.resolve();
    }

    return new Promise(async (resolve) => {
      const waitForScripts = () => {
        return new Promise((scriptResolve) => {
          const checkReady = () => {
            if (window.gapi && window.google) {
              scriptResolve();
            } else {
              setTimeout(checkReady, 100);
            }
          };
          checkReady();
        });
      };

      await waitForScripts();

      // Initialize GAPI - simplified, no API key needed
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            // No API key needed for OAuth-only approach
          });
          
          this.gapi = window.gapi;

          // Initialize GSI
          this.tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CONFIG.CLIENT_ID,
            scope: GOOGLE_CONFIG.SCOPES,
            callback: '',
          });

          this.isInitialized = true;
          resolve();
        } catch (error) {
          console.error('Error initializing Google APIs:', error);
          // Continue anyway for OAuth-only flow
          this.gapi = window.gapi;
          this.tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CONFIG.CLIENT_ID,
            scope: GOOGLE_CONFIG.SCOPES,
            callback: '',
          });
          this.isInitialized = true;
          resolve();
        }
      });
    });
  }

  async signIn(options = {}) {
    console.log('signIn - Starting sign in process...');
    if (!this.isInitialized) {
      console.log('signIn - Initializing Google Auth...');
      await this.initialize();
    }
    
    // Set default prompt to 'none' for silent authentication
    const prompt = options.prompt || 'none';

    // Try to load token and user info from localStorage first
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const savedUser = localStorage.getItem(`${TOKEN_STORAGE_KEY}_user`);
    
    if (savedToken && savedUser) {
      try {
        console.log('signIn - Found saved token and user in localStorage');
        const token = JSON.parse(savedToken);
        const user = JSON.parse(savedUser);
        
        if (token?.access_token) {
          console.log('signIn - Setting token from localStorage');
          
          // Set the token in gapi client
          if (this.gapi?.client) {
            this.gapi.client.setToken(token);
          }
          
          // Verify the token is still valid
          const isValid = await this.isTokenValid(token);
          console.log('signIn - Token validity check:', { 
            isValid, 
            hasUserData: !!user,
            hasEmail: !!user?.email 
          });
          
          if (isValid && user?.email) {
            console.log('signIn - Returning saved user data');
            return { ...token, user };
          } else {
            console.log('signIn - Token or user data invalid, will re-authenticate');
            // Clear invalid data
            this.clearAuthData();
          }
        }
      } catch (error) {
        console.error('signIn - Error loading saved token or user:', error);
        this.clearAuthData();
      }
    }

    return new Promise((resolve, reject) => {
      // Create a one-time callback for the token client
      const tokenCallback = async (resp) => {
        if (resp.error !== undefined) {
          console.error('Error in token callback:', resp.error);
          reject(resp);
          return;
        }
        
        try {
          console.log('Token received, processing...');
          
          // Add expires_at if not present (default to 1 hour from now)
          if (!resp.expires_at && resp.expires_in) {
            resp.expires_at = Math.floor(Date.now() / 1000) + resp.expires_in;
            console.log('Added expires_at to token:', new Date(resp.expires_at * 1000).toISOString());
          }
          
          // Store the token in gapi and localStorage
          if (this.gapi?.client) {
            this.gapi.client.setToken(resp);
          }
          
          localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(resp));
          console.log('Token stored in localStorage');
          
          // Get user info using Google Identity Services
          console.log('Fetching user profile...');
          const user = await this.getUserProfile(resp.access_token);
          
          if (!user?.email) {
            throw new Error('Failed to fetch user profile');
          }
          
          // Store user info in localStorage
          localStorage.setItem(`${TOKEN_STORAGE_KEY}_user`, JSON.stringify(user));
          console.log('User profile stored in localStorage');
          
          resolve({ ...resp, user });
          
        } catch (error) {
          console.error('Error in token callback:', error);
          // Clean up on error
          this.clearAuthData();
          reject(error);
        }
      };

      // Create a new token client for this request
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CONFIG.CLIENT_ID,
        scope: GOOGLE_CONFIG.SCOPES,
        callback: (resp) => {
          tokenCallback(resp);
          // Clean up the callback after use
          this.tokenClient.callback = null;
        },
        error_callback: (error) => {
          console.error('Error in token client:', error);
          reject(error);
        }
      });

      // Request access token with the appropriate prompt
      const prompt = options.prompt || (this.gapi.client.getToken() === null ? 'consent' : '');
      tokenClient.requestAccessToken({ prompt });
    });
  }

  async getTokenInfo(accessToken) {
    try {
      const response = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
      if (!response.ok) {
        throw new Error(`Token info request failed: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting token info:', error);
      throw error;
    }
  }

  async isTokenValid(token) {
    if (!token || !token.access_token) {
      console.log('isTokenValid - No token or access token');
      return false;
    }
    
    // Check token expiration with a 5-minute buffer
    const now = Date.now();
    const expiresAt = token.expires_at * 1000; // Convert to milliseconds
    
    // If we have an expiration time, check it first
    if (expiresAt) {
      const isExpired = now >= (expiresAt - 300000); // 5 minutes buffer
      console.log('isTokenValid - Token expiration check:', { 
        now, 
        expiresAt, 
        isExpired,
        timeRemaining: Math.max(0, (expiresAt - now) / 1000 / 60) + ' minutes'
      });
      
      if (isExpired) {
        console.log('isTokenValid - Token expired or expiring soon');
        return false;
      }
      
      // If token is not expired, we can consider it valid without checking with Google
      // This reduces unnecessary API calls and improves performance
      console.log('isTokenValid - Token is not expired, considering it valid');
      return true;
    }
    
    // If we don't have an expiration time, try to validate with Google
    // This is a fallback for tokens that don't include expiration
    console.log('isTokenValid - No expiration time, validating with Google...');
    try {
      const tokenInfo = await this.getTokenInfo(token.access_token);
      const isValid = !!(tokenInfo && tokenInfo.email);
      console.log('isTokenValid - Token validation result:', { 
        hasEmail: !!tokenInfo.email,
        tokenInfo: { email: tokenInfo.email, name: tokenInfo.name }
      });
      return isValid;
      
    } catch (error) {
      console.error('isTokenValid - Error validating token with Google:', error);
      // If we can't validate with Google, be conservative and consider it invalid
      return false;
    }
  }
  
  async getUserProfile(accessToken) {
    if (!accessToken) {
      console.error('getUserProfile - No access token provided');
      throw new Error('No access token provided');
    }

    console.log('getUserProfile - Fetching user profile...');
    
    try {
      // First try to get user info from Google's userinfo endpoint
      console.log('getUserProfile - Trying userinfo endpoint...');
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        console.log('getUserProfile - Successfully retrieved user info:', {
          name: userInfo.name,
          email: userInfo.email,
          hasPicture: !!userInfo.picture
        });
        
        if (!userInfo.email) {
          throw new Error('No email found in user info');
        }
        
        return {
          name: userInfo.name || 'User',
          email: userInfo.email,
          picture: userInfo.picture || null
        };
      } else {
        console.warn(`getUserProfile - Userinfo endpoint returned ${userInfoResponse.status}:`, await userInfoResponse.text().catch(() => 'Could not read error response'));
      }
      
      // Fallback to tokeninfo if userinfo fails
      console.log('getUserProfile - Falling back to tokeninfo endpoint...');
      const tokenInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
      
      if (!tokenInfoResponse.ok) {
        const errorText = await tokenInfoResponse.text().catch(() => 'Unknown error');
        throw new Error(`Tokeninfo endpoint returned ${tokenInfoResponse.status}: ${errorText}`);
      }
      
      const tokenInfo = await tokenInfoResponse.json();
      console.log('getUserProfile - Successfully retrieved token info:', {
        email: tokenInfo.email,
        name: tokenInfo.name
      });
      
      if (!tokenInfo.email) {
        throw new Error('No email found in token info');
      }
      
      return {
        name: tokenInfo.name || 'User',
        email: tokenInfo.email,
        picture: tokenInfo.picture || null
      };
      
    } catch (error) {
      console.error('getUserProfile - Error fetching user profile:', error);
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }
  }

  clearAuthData() {
    console.log('Clearing authentication data...');
    
    // Clear tokens from memory
    if (this.gapi?.client) {
      this.gapi.client.setToken(null);
    }
    
    // Clear local storage
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(`${TOKEN_STORAGE_KEY}_user`);
    
    // Clear any Google session data
    if (window.google?.accounts) {
      try {
        // Revoke token if available
        const token = this.gapi?.client?.getToken();
        if (token?.access_token) {
          window.google.accounts.oauth2.revoke(token.access_token, () => {
            console.log('Token revoked');
          });
        }
        
        // Disable auto sign-in
        if (window.google.accounts.id) {
          window.google.accounts.id.disableAutoSelect();
        }
      } catch (error) {
        console.error('Error clearing Google session:', error);
      }
    }
    
    console.log('Authentication data cleared');
  }
  
  async signOut() {
    try {
      console.log('Starting sign out process...');
      
      // Clear all authentication data
      this.clearAuthData();
      
      // Additional cleanup for GAPI
      if (this.gapi?.auth2) {
        try {
          const auth2 = this.gapi.auth2.getAuthInstance();
          if (auth2) {
            await auth2.signOut();
            console.log('Signed out from GAPI');
          }
        } catch (error) {
          console.error('Error during GAPI sign out:', error);
        }
      }
      
      console.log('Sign out completed');
      
    } catch (error) {
      console.error('Error during sign out:', error);
      // Even if there's an error, we should still clear local data
      this.clearAuthData();
      throw error;
    }
  }

  async isSignedIn() {
    console.log('isSignedIn - Starting sign-in check...');
    
    try {
      // Check if we have the required data in localStorage
      const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      const savedUser = localStorage.getItem(`${TOKEN_STORAGE_KEY}_user`);
      
      if (!savedToken || !savedUser) {
        console.log('isSignedIn - No saved token or user data found');
        return false;
      }
      
      // Parse the saved data
      let token;
      let user;
      
      try {
        token = JSON.parse(savedToken);
        user = JSON.parse(savedUser);
        console.log('isSignedIn - Parsed token and user data');
      } catch (error) {
        console.error('isSignedIn - Error parsing saved data:', error);
        this.clearAuthData();
        return false;
      }
      
      // Check if we have the required fields
      if (!token?.access_token || !user?.email) {
        console.log('isSignedIn - Missing required token or user data');
        this.clearAuthData();
        return false;
      }
      
      // Initialize GAPI if needed
      if (!this.isInitialized) {
        try {
          await this.initialize();
        } catch (error) {
          console.error('isSignedIn - Error initializing Google Auth:', error);
          return false;
        }
      }
      
      // Set the token in gapi
      if (this.gapi?.client) {
        this.gapi.client.setToken(token);
      } else {
        console.error('isSignedIn - GAPI client not available');
        return false;
      }
      
      // Check token validity
      const isTokenValid = await this.isTokenValid(token);
      console.log('isSignedIn - Token validation result:', { isTokenValid });
      
      if (!isTokenValid) {
        console.log('isSignedIn - Token is invalid or expired');
        this.clearAuthData();
        return false;
      }
      
      console.log('isSignedIn - User is authenticated');
      return true;
      
    } catch (error) {
      console.error('isSignedIn - Error during sign-in check:', error);
      this.clearAuthData();
      return false;
    }
  }
  
  getAuthHeaders() {
    const token = this.gapi?.client?.getToken();
    if (!token?.access_token) {
      throw new Error('No authentication token available');
    }
    
    return {
      'Authorization': `Bearer ${token.access_token}`,
      'Content-Type': 'application/json',
    };
  }

  // Helper method to handle API responses
  async handleApiResponse(response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      
      // Handle specific error cases
      if (response.status === 401) {
        throw new Error('Authentication expired. Please sign in again.');
      } else if (response.status === 403) {
        throw new Error('You do not have permission to access this resource.');
      } else if (response.status === 404) {
        throw new Error('The requested resource was not found.');
      }
      
      throw new Error(errorMessage);
    }
    
    return response.json();
  }

  // Debug method to check authentication status
  getAuthInfo() {
    const token = this.gapi?.client?.getToken();
    return {
      isInitialized: this.isInitialized,
      hasGapi: !!this.gapi,
      hasToken: !!token,
      hasTokenClient: !!this.tokenClient,
      tokenExpiry: token?.expires_at ? new Date(token.expires_at * 1000) : null
    };
  }

  getAccessToken() {
    const token = this.gapi?.client?.getToken();
    if (!token?.access_token) {
      throw new Error('No access token available. Please sign in again.');
    }
    return token.access_token;
  }

  async getSpreadsheets() {
    try {
      const response = await fetch('https://www.googleapis.com/drive/v3/files?' + new URLSearchParams({
        q: "mimeType='application/vnd.google-apps.spreadsheet'",
        fields: 'files(id,name,modifiedTime)',
        pageSize: '100'
      }), {
        headers: this.getAuthHeaders()
      });
      
      const data = await this.handleApiResponse(response);
      return data.files || [];
    } catch (error) {
      console.error('Error fetching spreadsheets:', error);
      throw error;
    }
  }

  async getSheetData(spreadsheetId, range = 'A1:Z100') {
    try {
      console.log('Fetching sheet data for:', { spreadsheetId, range });
      
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
        headers: this.getAuthHeaders()
      });
      
      const data = await this.handleApiResponse(response);
      console.log('Successfully fetched sheet data');
      
      // If no data, return empty structure
      if (!data.values) {
        return { values: [[]] };
      }
      
      return data;
      
    } catch (error) {
      console.error('Error in getSheetData:', error);
      
      // Handle token expiration with retry
      if (error.message.includes('Authentication expired')) {
        try {
          console.log('Attempting to refresh token...');
          await this.signIn();
          
          // Retry the request
          const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
            headers: this.getAuthHeaders()
          });
          
          return await this.handleApiResponse(response);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          throw new Error('Session expired. Please sign in again.');
        }
      }
      
      throw error;
    }
  }
  
  async updateSheetData(spreadsheetId, range, values) {
    try {
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          values: values
        })
      });
      
      return await this.handleApiResponse(response);
    } catch (error) {
      console.error('Error updating sheet data:', error);
      
      // Handle token expiration with retry
      if (error.message.includes('Authentication expired')) {
        try {
          await this.signIn();
          const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`, {
            method: 'PUT',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({
              values: values
            })
          });
          
          return await this.handleApiResponse(response);
        } catch (refreshError) {
          throw new Error('Session expired. Please sign in again.');
        }
      }
      
      throw error;
    }
  }
  
  async appendSheetData(spreadsheetId, range, values) {
    try {
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          values: values
        })
      });
      
      return await this.handleApiResponse(response);
    } catch (error) {
      console.error('Error appending sheet data:', error);
      
      // Handle token expiration with retry
      if (error.message.includes('Authentication expired')) {
        try {
          await this.signIn();
          const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({
              values: values
            })
          });
          
          return await this.handleApiResponse(response);
        } catch (refreshError) {
          throw new Error('Session expired. Please sign in again.');
        }
      }
      
      throw error;
    }
  }

  // Bonus: Get spreadsheet metadata
  async getSpreadsheetMetadata(spreadsheetId) {
    try {
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties`, {
        headers: this.getAuthHeaders()
      });
      
      return await this.handleApiResponse(response);
    } catch (error) {
      console.error('Error fetching spreadsheet metadata:', error);
      throw error;
    }
  }
}

export default new GoogleAuthService();