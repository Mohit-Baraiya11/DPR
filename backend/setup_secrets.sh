#!/bin/bash

# Set your project ID
PROJECT_ID="smart-dpr-469205"
SERVICE_ACCOUNT_KEY="service-account-key.json"
SECRET_NAME="smart-dpr-credentials"

# Authenticate with gcloud
echo "Please authenticate with gcloud..."
gcloud auth login

echo "Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Create a service account if it doesn't exist
SERVICE_ACCOUNT_EMAIL="smart-dpr-sa@${PROJECT_ID}.iam.gserviceaccount.com"

if ! gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL &> /dev/null; then
    echo "Creating service account..."
    gcloud iam service-accounts create smart-dpr-sa \
        --display-name "Smart DPR Service Account"
    
    # Add required roles
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
        --role="roles/secretmanager.secretAccessor"
    
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
        --role="roles/cloudsql.client"
    
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
        --role="roles/secretmanager.secretAccessor"
    
    # Create and download service account key
    echo "Creating service account key..."
    gcloud iam service-accounts keys create $SERVICE_ACCOUNT_KEY \
        --iam-account=$SERVICE_ACCOUNT_EMAIL
    
    echo "Service account key created: $SERVICE_ACCOUNT_KEY"
else
    echo "Service account already exists: $SERVICE_ACCOUNT_EMAIL"
fi

# Create secret if it doesn't exist
if ! gcloud secrets describe $SECRET_NAME --project=$PROJECT_ID &> /dev/null; then
    echo "Creating secret $SECRET_NAME..."
    gcloud secrets create $SECRET_NAME \
        --replication-policy="automatic"
    
    # Add service account as secret accessor
    gcloud secrets add-iam-policy-binding $SECRET_NAME \
        --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
        --role="roles/secretmanager.secretAccessor"
    
    echo "Please add your service account key to the secret..."
    gcloud secrets versions add $SECRET_NAME --data-file=$SERVICE_ACCOUNT_KEY
    
    # Clean up the key file
    rm -f $SERVICE_ACCOUNT_KEY
    
    echo "Secret $SECRET_NAME created and populated with service account key"
else
    echo "Secret $SECRET_NAME already exists"
fi

echo "Setup complete!"
