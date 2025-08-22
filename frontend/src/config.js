export const API_BASE_URL = 'http://localhost:8000';

export const GOOGLE_CONFIG = {
  CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '753600118822-10ju79ml8obmm030e12dvgb8to2qaej9.apps.googleusercontent.com',
  API_KEY: import.meta.env.VITE_GOOGLE_API_KEY || 'AIzaSyC8jHTVcNQrVNXmvXRQfIgdWMIU7wHiF-4',
  DISCOVERY_DOCS: [
    'https://sheets.googleapis.com/$discovery/rest?version=v4',
    'https://people.googleapis.com/$discovery/rest?version=v1'
  ],
  SCOPES: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'openid'
  ].join(' ')
};