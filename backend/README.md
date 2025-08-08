# SMART DPR Backend

This is the FastAPI backend for the SMART DPR Manager application. It provides API endpoints for interacting with Google Sheets.

## Setup

1. Create a Python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the values in `.env` with your Google OAuth credentials

4. Run the development server:
   ```bash
   uvicorn app:app --reload
   ```

## API Endpoints

- `POST /api/print-hello-world`: Writes "Hello World" to a Google Sheet
- `GET /api/health`: Health check endpoint

## Development

- The server will automatically reload when you make changes to the code.
- API documentation is available at `http://localhost:8000/docs` when the server is running.
