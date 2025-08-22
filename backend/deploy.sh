#!/bin/bash

# Set your project ID
PROJECT_ID="smart-dpr-469205"
SERVICE_NAME="smart-dpr"
REGION="us-central1"

# Enable required APIs
echo "Enabling required APIs..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com

# Build the Docker image
echo "Building Docker image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_APPLICATION_CREDENTIALS=/secrets/credentials.json" \
  --update-secrets=GOOGLE_CREDENTIALS=smart-dpr-credentials:latest \
  --memory=2Gi \
  --timeout=300

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')
echo "Service deployed successfully!"
echo "Service URL: $SERVICE_URL"
