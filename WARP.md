# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

SMART DPR Manager is a full-stack application for managing Daily Progress Reports (DPR) in construction projects using Google Sheets integration. It consists of:
- **Frontend**: React application with Vite, TailwindCSS
- **Backend**: FastAPI with Google Sheets API integration and AI-powered query processing using Groq/Llama

## Development Commands

### Backend Development

```bash
# Navigate to backend
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app:app --reload

# Run with specific host/port
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Run development server (opens on http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Running Tests

```bash
# Backend tests
cd backend
python test.py

# No frontend tests configured yet
```

## Architecture Overview

### Backend Architecture

The backend uses FastAPI and follows this structure:

1. **Main Entry Point** (`app.py`):
   - Configures CORS for frontend communication
   - Defines Pydantic models for request/response validation
   - Implements OAuth2 authentication for Google Sheets access
   - Provides endpoints for sheet operations and AI-powered query processing

2. **AI Integration** (`src/prompt_builder.py`):
   - Uses Agno Agent framework with Groq's Llama model
   - Two specialized agents:
     - `SupportAgent`: Processes construction work updates against sheet data
     - `LogAgent`: Analyzes log entries to answer queries
   - Implements structured output with Pydantic models for consistent responses

3. **Configuration** (`src/config.py`):
   - Contains detailed system prompts for AI agents
   - Defines strict parsing rules for construction site data
   - Handles various query scenarios (single/multiple work types, quantities, etc.)

4. **Key API Endpoints**:
   - `/api/print-hello-world`: Test endpoint for Google Sheets write
   - `/api/health`: Health check
   - `/api/update-sheet`: Process natural language updates to sheets
   - `/api/logs-query`: Query historical log data

### Frontend Architecture

React application with component-based structure:
- Uses React Router for navigation
- Google OAuth integration for authentication
- Real-time updates to Google Sheets
- Audio components for voice features

### Data Flow

1. User authenticates with Google OAuth
2. Frontend sends natural language queries to backend
3. Backend AI agent parses query to extract:
   - Location and Peta Location
   - Work types and quantities
   - Status updates (WIP/COM)
4. Backend updates Google Sheets and maintains audit log
5. Response sent back to frontend with feedback

## Environment Setup

1. Copy `backend/.env.example` to `backend/.env`
2. Configure required credentials:
   - Google OAuth credentials (Client ID, Secret, API Key)
   - Groq API key for AI functionality
   - JWT secret for authentication

## Google Sheets Integration

The application expects sheets with specific structure:
- Main data sheet with construction work items
- LOG sheet (auto-created) with columns:
  - time, site_engineer_name, Location, Sub Location, Peta Location, Category, updation, requested_quantity, updated_quantity, user_query, feedback, updated_cell

## AI Query Processing

The system handles complex natural language queries for construction updates:
- Supports single/multiple work types
- Handles quantity distributions
- Provides fuzzy matching for work type recognition
- Returns structured feedback for ambiguous queries

Example queries:
- "A building from 101 to 105 Granite kitchen OTTA work has been done by 40 cubic meter"
- "SPAN 201 Plaster Work, Gypsum work completed by 30, 25 cubic meter"
