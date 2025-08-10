import { GOOGLE_CONFIG } from '../config.js';

class GoogleAuthService {
  constructor() {
    this.gapi = null;
    this.tokenClient = null;
    this.isInitialized = false;
    this.TOKEN_STORAGE_KEY = 'google_auth_token';
  }

  // Helper method to store token
  _storeToken(token) {
    if (token) {
      localStorage.setItem(this.TOKEN_STORAGE_KEY, JSON.stringify(token));
    } else {
      localStorage.removeItem(this.TOKEN_STORAGE_KEY);
    }
  }

  // Helper method to load token
  _loadToken() {
    const tokenString = localStorage.getItem(this.TOKEN_STORAGE_KEY);
    return tokenString ? JSON.parse(tokenString) : null;
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

          // Restore token from storage if available
          const savedToken = this._loadToken();
          if (savedToken) {
            this.gapi.client.setToken(savedToken);
          }

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

  async signIn() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      this.tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
          reject(resp);
          return;
        }
        // Store the token in gapi and localStorage
        this.gapi.client.setToken(resp);
        this._storeToken(resp);
        resolve(resp);
      };

      if (this.gapi.client.getToken() === null) {
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
        this.tokenClient.requestAccessToken({ prompt: '' });
      }
    });
  }

  signOut() {
    const token = this.gapi.client.getToken();
    if (token !== null) {
      window.google.accounts.oauth2.revoke(token.access_token);
      this.gapi.client.setToken('');
      this._storeToken(null); // Clear stored token
    }
  }

  isSignedIn() {
    return this.gapi && this.gapi.client.getToken() !== null;
  }

  // Helper method to get auth headers
  getAuthHeaders() {
    const token = this.gapi.client.getToken();
    if (!token) {
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