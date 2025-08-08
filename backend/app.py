import os
from fastapi import FastAPI, HTTPException, Depends, status, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import json
import os
from dotenv import load_dotenv
import uvicorn

# Load environment variables
load_dotenv()

app = FastAPI(title="SMART DPR Backend")

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:8080", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Pydantic models for request/response
class TokenData(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_uri: str
    client_id: str
    client_secret: str
    scopes: List[str]

class HelloWorldRequest(BaseModel):
    spreadsheet_id: str
    sheet_name: str = "Sheet1"
    row_count: int = 10

# Helper function to get Google Sheets service
def get_sheets_service(token_data: dict):
    try:
        creds = Credentials(
            token=token_data["access_token"],
            refresh_token=token_data.get("refresh_token"),
            token_uri=token_data["token_uri"],
            client_id=token_data["client_id"],
            client_secret=token_data["client_secret"],
            scopes=token_data["scopes"]
        )
        
        service = build('sheets', 'v4', credentials=creds)
        return service
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to authenticate with Google Sheets"
        )

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"An error occurred: {str(exc)}"}
    )

# Request validation error handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body}
    )

# Endpoint to print hello world in a spreadsheet
@app.post("/api/print-hello-world")
async def print_hello_world(
    request: HelloWorldRequest,
    authorization: str = Header(..., description="Bearer token from Google OAuth"),
):
    # Extract the token from the Authorization header
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header"
        )
    
    # In a real application, you would validate the token here
    # For now, we'll just pass it through to the Google API
    token_data = {
        "access_token": authorization[7:],  # Remove 'Bearer ' prefix
        "token_uri": "https://oauth2.googleapis.com/token",
        "client_id": "", 
        "client_secret": "", 
        "scopes": ["https://www.googleapis.com/auth/spreadsheets"]
    }
    try:
        request_data = request.dict() if hasattr(request, 'dict') else request
        
        print("\n=== Incoming Request ===")
        print(f"Request data: {request_data}")
        
        service = get_sheets_service(token_data)
        
        spreadsheet_id = request_data.get('spreadsheet_id')
        sheet_name = request_data.get('sheet_name', 'Sheet1')
        row_count = request_data.get('row_count', 10)
        
        print(f"Processing request for spreadsheet: {spreadsheet_id}, sheet: {sheet_name}")
        print(f"Will write {row_count} rows of 'Hello World' to column A")
        
        # First, get the spreadsheet to check if the sheet exists
        spreadsheet = service.spreadsheets().get(
            spreadsheetId=spreadsheet_id
        ).execute()
        
        # Check if sheet exists
        sheet_exists = any(sheet['properties']['title'] == sheet_name 
                         for sheet in spreadsheet.get('sheets', []))
        
        # If sheet doesn't exist, create it
        if not sheet_exists:
            # Create a new sheet
            body = {
                'requests': [{
                    'addSheet': {
                        'properties': {
                            'title': sheet_name
                        }
                    }
                }]
            }
            service.spreadsheets().batchUpdate(
                spreadsheetId=spreadsheet_id,
                body=body
            ).execute()
        
        # Prepare the data to write as a column
        values = [[f"Hello World {i+1}" for i in range(row_count)]]  # Single row with all values
        
        # Update the spreadsheet
        range_name = f"{sheet_name}!A1:A{row_count}"  # Remove quotes around sheet name
        
        body = {
            'values': values,
            'majorDimension': 'COLUMNS'  
        }
        
        print(f"\n=== Making Google Sheets API Call ===")
        print(f"Range: {range_name}")
        print(f"Values to write: {values}")
        print(f"Request body: {body}")
        
        # First try to get the sheet to verify it exists
        try:
            print("\n=== Verifying Sheet Access ===")
            sheet_metadata = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
            print(f"Found spreadsheet: {sheet_metadata.get('properties', {}).get('title')}")
            print(f"Sheets in document: {[s['properties']['title'] for s in sheet_metadata.get('sheets', [])]}")
            
            # Now make the update
            print("\n=== Making Update Request ===")
            result = service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=range_name,
                valueInputOption="USER_ENTERED",
                body=body
            ).execute()
            print(f"Update result: {result}")
            
        except Exception as e:
            print(f"\n=== Error Details ===")
            print(f"Error type: {type(e).__name__}")
            print(f"Error details: {str(e)}")
            if hasattr(e, 'content'):
                print(f"Error content: {e.content.decode('utf-8')}")
            raise
        
        return {"status": "success", "updated_cells": result.get('updatedCells')}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update spreadsheet: {str(e)}"
        )

# Health check endpoint
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
