# Secure Environment Setup

## Important Security Notice

This project uses secure environment variable handling to protect sensitive credentials. Never commit actual secrets to the repository.

## Required Environment Variables

Before running `setup_env_vars.sh`, you must set the following environment variables:

```bash
# Google OAuth Configuration
export GOOGLE_CLIENT_ID="your-actual-client-id.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="your-actual-client-secret"
export GOOGLE_API_KEY="your-actual-api-key"

# GROQ API Configuration
export GROQ_API_KEY="your-actual-groq-api-key"

# JWT Configuration
export JWT_SECRET_KEY="your-actual-jwt-secret"

# Optional: Google Refresh Token (if needed)
export GOOGLE_REFRESH_TOKEN="your-actual-refresh-token"
```

## Usage

1. Set all required environment variables (see above)
2. Run the setup script:
   ```bash
   ./backend/setup_env_vars.sh
   ```

## Security Best Practices

- Store secrets in a secure password manager
- Use different secrets for development and production
- Never commit files containing actual secrets
- Use environment variables or secret management services in production

## Development Setup

For local development, create a `.env` file based on `.env.example` and use a tool like `python-dotenv` to load environment variables.
