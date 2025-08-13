import os
import string
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
from typing import Optional, List
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build
from dotenv import load_dotenv
from datetime import datetime
import uvicorn

# Load environment variables
load_dotenv()

app = FastAPI(title="SMART DPR Backend")

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# -----------------------------
# Pydantic models
# -----------------------------
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

class SheetInfoRequest(BaseModel):
    spreadsheet_id: str
    sheet_name: str = "Sheet1"

class UpdateSheetRequest(BaseModel):
    spreadsheet_id: str
    sheet_name: str = "Sheet1"
    user_query: str

# -----------------------------
# Helper function to get Sheets service
# -----------------------------
def get_sheets_service():
    creds = Credentials(
        None,
        refresh_token=os.getenv("GOOGLE_REFRESH_TOKEN"),
        token_uri=os.getenv("GOOGLE_TOKEN_URI"),
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        scopes=["https://www.googleapis.com/auth/spreadsheets"]
    )

    if not creds.valid:
        creds.refresh(GoogleRequest())

    return build('sheets', 'v4', credentials=creds)

# -----------------------------
# Exception handlers
# -----------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"An error occurred: {str(exc)}"}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body}
    )

# -----------------------------
# Existing Hello World endpoint
# -----------------------------
@app.post("/api/print-hello-world")
async def print_hello_world(request: HelloWorldRequest):
    service = get_sheets_service()
    
    spreadsheet_id = request.spreadsheet_id
    sheet_name = request.sheet_name
    row_count = request.row_count

    values = [[f"Hello World {i+1}" for i in range(row_count)]]
    range_name = f"{sheet_name}!A1:A{row_count}"
    body = {'values': values, 'majorDimension': 'COLUMNS'}

    result = service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range=range_name,
        valueInputOption="USER_ENTERED",
        body=body
    ).execute()
    return {"status": "success", "updated_cells": result.get('updatedCells')}

# -----------------------------
# New endpoint: get_sheet_info
# -----------------------------
@app.post("/api/get-sheet-info")
async def get_sheet_info(request: SheetInfoRequest):
    service = get_sheets_service()
    sheet = service.spreadsheets().values().get(
        spreadsheetId=request.spreadsheet_id,
        range=request.sheet_name
    ).execute()

    values = sheet.get("values", [])
    if not values or len(values) < 2:
        return {"status": "error", "message": "No data found in the sheet"}

    # Step 1: Get header row (second row in the sheet)
    header_row = values[1]

    # Detect breakpoint (first empty cell)
    breakpoint_index = 0
    for i, col in enumerate(header_row):
        if col.strip() == "":
            breakpoint_index = i
            break
    else:
        breakpoint_index = len(header_row)

    headers_before_break = header_row[:breakpoint_index]

    # Step 2: Prepare ROW_INDEX data
    row_index_data = {}
    for idx, row in enumerate(values[2:], start=3):  # start=3 to match sheet row numbers
        if all((cell.strip() == "" if isinstance(cell, str) else True) for cell in row[:breakpoint_index]):
            break
        row_data = row[:breakpoint_index] + [""] * (len(headers_before_break) - len(row))
        row_index_data[idx] = dict(zip(headers_before_break, row_data))

    # Step 3: Prepare COLUMN_INDEX data (after breakpoint until empty after non-empty found)
    column_index_data = {}
    col_letters = list(string.ascii_uppercase)
    col_letters += [a + b for a in string.ascii_uppercase for b in string.ascii_uppercase]

    found_non_empty = False
    for i in range(breakpoint_index, len(header_row)):
        col_name = header_row[i] if i < len(header_row) else ""
        if col_name.strip() != "":
            found_non_empty = True
            column_index_data[col_letters[i]] = col_name
        elif found_non_empty:  
            # Stop only if we already started collecting column headers
            break

    return {
        "status": "success",
        "ROW_INDEX": row_index_data,
        "COLUMN_INDEX": column_index_data
    }

# -----------------------------
# New endpoint: update_sheet
# -----------------------------
@app.post("/api/update-sheet")
async def update_sheet(request: UpdateSheetRequest):
    try:
        # First get the sheet data using existing endpoint
        sheet_info = await get_sheet_info(SheetInfoRequest(
            spreadsheet_id=request.spreadsheet_id,
            sheet_name=request.sheet_name
        ))
        
        if sheet_info.get("status") != "success":
            return {"status": "error", "message": "Failed to fetch sheet data"}
        
        # Import process_user_query here to avoid circular imports
        from src.prompt_builder import process_user_query
        from src.config import SHEET_DATA
        
        # Prepare the ACTION_PROMPT with sheet data and user query
        ACTION_PROMPT = f"""
        You are given
        SHEET DATA: 
        {SHEET_DATA}

        USER QUERY:
        {request.user_query}

        Now, process the user query according to the SYSTEM_PROMPT rules:
        - Identify exact row matches first.
        - Then identify columns only if row matches exist.
        - Detect updations ("COM" or "WIP") and quantities.
        - Build the output as a SupportResult JSON with the required fields.
        - Do not add any extra keys or change the order of keys in the output.
        - Ensure that all matching and parsing follows the SYSTEM_PROMPT exactly.
        """
        
        # Process the query
        row_indices, columns_indices, updations, quantities, feedbacks = process_user_query(ACTION_PROMPT)
        
        # Debug print
        print("\nProcessing results:")
        print(f"Row Indices: {row_indices}")
        print(f"Column Indices: {columns_indices}")
        print(f"Updates: {updations}")
        print(f"Quantities: {quantities}")
        print(f"Feedbacks: {feedbacks}")
        
        # Get Google Sheets service
        service = get_sheets_service()
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Get the sheet ID first
        spreadsheet = service.spreadsheets().get(
            spreadsheetId=request.spreadsheet_id
        ).execute()
        
        # Find the sheet ID for the requested sheet
        sheet_id = None
        for sheet in spreadsheet.get('sheets', []):
            if sheet['properties']['title'] == request.sheet_name:
                sheet_id = sheet['properties']['sheetId']
                break
                
        if sheet_id is None:
            return {"status": "error", "message": f"Sheet '{request.sheet_name}' not found in the spreadsheet"}
        
        # Prepare batch update request for cell formatting and values
        requests = []
        
        for row_idx, col_idx, update in zip(row_indices, columns_indices, updations):
            # Convert column letter to column number (0-based)
            col_num = ord(col_idx.upper()) - ord('A')
            row_num = int(row_idx) - 1  # Convert to 0-based
            
            # Determine cell formatting based on update type
            bg_color = {
                'red': 1.0,          # Full red for yellow mix
                'green': 0.9,        # High green for yellow mix
                'blue': 0.0,         # No blue
                'alpha': 1.0
            } if update == 'WIP' else {
                'red': 0.0,          # No red
                'green': 0.8,        # Green for COM
                'blue': 0.0,         # No blue
                'alpha': 1.0
            }
            
            # Add request to update cell value and format
            requests.append({
                'updateCells': {
                    'range': {
                        'sheetId': sheet_id,
                        'startRowIndex': row_num,
                        'endRowIndex': row_num + 1,
                        'startColumnIndex': col_num,
                        'endColumnIndex': col_num + 1
                    },
                    'rows': [{
                        'values': [{
                            'userEnteredValue': {'stringValue': today},  # Only today's date
                            'userEnteredFormat': {
                                'backgroundColor': bg_color,
                                'textFormat': {'bold': True},
                                'horizontalAlignment': 'CENTER',
                                'verticalAlignment': 'MIDDLE'
                            }
                        }]
                    }],
                    'fields': 'userEnteredValue,userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
                }
            })
        
        # Execute the batch update if there are requests
        if requests:
            body = {'requests': requests}
            result = service.spreadsheets().batchUpdate(
                spreadsheetId=request.spreadsheet_id,
                body=body
            ).execute()
        
        # Combine all feedbacks into a single message
        combined_feedback = "\n\n".join(feedbacks)
        
        return {
            "status": "success",
            "message": "Sheet updated successfully",
            "feedback": combined_feedback,
            "updates_applied": len(updations),
            "updated_cells": len(updations)
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to update sheet: {str(e)}"
        }

# -----------------------------
# Health check endpoint
# -----------------------------
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# -----------------------------
# Main entry
# -----------------------------
if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
