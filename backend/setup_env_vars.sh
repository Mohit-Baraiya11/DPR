#!/bin/bash

# Set your project ID and service name
PROJECT_ID="smart-dpr-469205"
SERVICE_NAME="smart-dpr"
REGION="us-central1"

# Update environment variables
echo "Updating environment variables for $SERVICE_NAME..."

gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --update-env-vars "$(cat <<EOF
# Backend Configuration
PORT=8080,
ENVIRONMENT=production,

# CORS Configuration
FRONTEND_URL=http://localhost:5173,

# Google OAuth Configuration
GOOGLE_CLIENT_ID=,
GOOGLE_API_KEY=,
GOOGLE_CLIENT_SECRET=,
GOOGLE_REDIRECT_URI=http://localhost:8000/docs/oauth2-redirect,
GOOGLE_REFRESH_TOKEN=,
GOOGLE_TOKEN_URI=https://oauth2.googleapis.com/token,

# GROQ API Key
GROQ_API_KEY=,

# JWT Configuration
JWT_SECRET_KEY=your-jwt-secret-key,
JWT_ALGORITHM=HS256,
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30,

# Google Application Default Credentials
GOOGLE_APPLICATION_CREDENTIALS=/secrets/credentials.json
EOF
)" \
  --platform managed

echo "Environment variables updated successfully!"
