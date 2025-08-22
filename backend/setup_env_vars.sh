#!/bin/bash

# Set your project ID and service name
PROJECT_ID="smart-dpr-469205"
SERVICE_NAME="smart-dpr"
REGION="us-central1"

# Check if required environment variables are set
required_vars=(
    "GOOGLE_CLIENT_ID"
    "GOOGLE_CLIENT_SECRET" 
    "GOOGLE_API_KEY"
    "GROQ_API_KEY"
    "JWT_SECRET_KEY"
)

echo "Checking for required environment variables..."
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "Error: $var is not set. Please set all required environment variables before running this script."
        echo "You can set them by running: export $var='your-value-here'"
        exit 1
    fi
done

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
GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID,
GOOGLE_API_KEY=$GOOGLE_API_KEY,
GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET,
GOOGLE_REDIRECT_URI=http://localhost:8000/docs/oauth2-redirect,
GOOGLE_REFRESH_TOKEN=$GOOGLE_REFRESH_TOKEN,
GOOGLE_TOKEN_URI=https://oauth2.googleapis.com/token,

# GROQ API Key
GROQ_API_KEY=$GROQ_API_KEY,

# JWT Configuration
JWT_SECRET_KEY=$JWT_SECRET_KEY,
JWT_ALGORITHM=HS256,
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30,

# Google Application Default Credentials
GOOGLE_APPLICATION_CREDENTIALS=/secrets/credentials.json
EOF
)" \
  --platform managed

echo "Environment variables updated successfully!"
