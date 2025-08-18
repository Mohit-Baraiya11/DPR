import os
import string
from datetime import datetime
from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
from typing import Optional, List

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build
from src.prompt_builder import process_user_query, process_logs_query
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
        "http://localhost:8000",
        "https://smart-dpr-469205.uc.r.appspot.com"  # Production URL
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600  # Cache preflight requests for 10 minutes
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
    site_engineer_name: str = "Unknown"

class LogsQueryRequest(BaseModel):
    spreadsheet_id: str
    query: str
    max_logs: int = 100  # Default to last 100 logs

# -----------------------------
# Helper function to get Sheets service
# -----------------------------
def get_sheets_service(token: str = Depends(oauth2_scheme)):
    try:
        creds = Credentials(
            token=token,
            token_uri=os.getenv("GOOGLE_TOKEN_URI"),
            client_id=os.getenv("GOOGLE_CLIENT_ID"),
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
            scopes=["https://www.googleapis.com/auth/spreadsheets"]
        )
        
        # Check if the token is valid and refresh if necessary
        if not creds.valid:
            if creds.expired and creds.refresh_token:
                creds.refresh(GoogleRequest())
            else:
                # This part might need to be improved depending on how refresh tokens are handled client-side
                pass

        return build('sheets', 'v4', credentials=creds)
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid authentication credentials: {str(e)}"
        )

def ensure_log_sheet_exists(service, spreadsheet_id):
    """Ensure LOG sheet exists and has the correct headers."""
    try:
        # Check if LOG sheet exists
        spreadsheet = service.spreadsheets().get(
            spreadsheetId=spreadsheet_id
        ).execute()
        
        log_sheet_id = None
        for sheet in spreadsheet.get('sheets', []):
            if sheet['properties']['title'] == 'LOG':
                log_sheet_id = sheet['properties']['sheetId']
                # Check if headers exist
                result = service.spreadsheets().values().get(
                    spreadsheetId=spreadsheet_id,
                    range="'LOG'!A1:L1"
                ).execute()
                
                if 'values' not in result:
                    # Add headers
                    headers = [
                        'time', 'site_engineer_name', 'Location', 'Sub Location',
                        'Peta Location', 'Category', 'updation', 'requested_quantity',
                        'updated_quantity', 'user_query', 'feedback', 'updated_cell'
                    ]
                    service.spreadsheets().values().update(
                        spreadsheetId=spreadsheet_id,
                        range="'LOG'!A1",
                        valueInputOption='USER_ENTERED',
                        body={'values': [headers]}
                    ).execute()
                break
        
        # If LOG sheet doesn't exist, create it
        if log_sheet_id is None:
            add_sheet_request = {
                'addSheet': {
                    'properties': {
                        'title': 'LOG',
                        'gridProperties': {
                            'rowCount': 1000,
                            'columnCount': 12
                        }
                    }
                }
            }
            
            result = service.spreadsheets().batchUpdate(
                spreadsheetId=spreadsheet_id,
                body={'requests': [add_sheet_request]}
            ).execute()
            
            log_sheet_id = result['replies'][0]['addSheet']['properties']['sheetId']
            
            # Add headers
            headers = [
                'time', 'site_engineer_name', 'Location', 'Sub Location',
                'Peta Location', 'Category', 'updation', 'requested_quantity',
                'updated_quantity', 'user_query', 'feedback', 'updated_cell'
            ]
            
            service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range="'LOG'!A1",
                valueInputOption='USER_ENTERED',
                body={'values': [headers]}
            ).execute()
            
            # Freeze the header row
            service.spreadsheets().batchUpdate(
                spreadsheetId=spreadsheet_id,
                body={
                    'requests': [{
                        'updateSheetProperties': {
                            'properties': {
                                'sheetId': log_sheet_id,
                                'gridProperties': {
                                    'frozenRowCount': 1
                                }
                            },
                            'fields': 'gridProperties.frozenRowCount'
                        }
                    }]
                }
            ).execute()
        
        return log_sheet_id
        
    except Exception as e:
        print(f"Warning: Could not ensure LOG sheet exists: {str(e)}")
        return None

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
async def print_hello_world(request: HelloWorldRequest, service=Depends(get_sheets_service)):
    
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
async def get_sheet_info(request: SheetInfoRequest, service=Depends(get_sheets_service)):
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
    empty_row_count = 0
    max_consecutive_empty = 4
    
    for idx, row in enumerate(values[2:], start=3):  # start=3 to match sheet row numbers
        # Check if current row is empty (all cells before breakpoint are empty)
        is_empty = all((cell.strip() == "" if isinstance(cell, str) else True) 
                      for cell in row[:breakpoint_index])
        
        if is_empty:
            empty_row_count += 1
            if empty_row_count >= max_consecutive_empty:
                break  # Stop if we hit 4 consecutive empty rows
            continue
        else:
            empty_row_count = 0  # Reset counter if we find a non-empty row
            
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
async def update_sheet(request: UpdateSheetRequest, service=Depends(get_sheets_service), token: str = Depends(oauth2_scheme)):
    try:
        # First get the sheet data
        sheet = service.spreadsheets().values().get(
            spreadsheetId=request.spreadsheet_id,
            range=request.sheet_name
        ).execute()

        # Manually process sheet_info as it's done in get_sheet_info
        values = sheet.get("values", [])
        if not values or len(values) < 2:
            return {"status": "error", "message": "No data found in the sheet"}

        header_row = values[1]
        breakpoint_index = 0
        for i, col in enumerate(header_row):
            if col.strip() == "":
                breakpoint_index = i
                break
        else:
            breakpoint_index = len(header_row)
        headers_before_break = header_row[:breakpoint_index]

        row_index_data = {}
        empty_row_count = 0
        max_consecutive_empty = 4
        for idx, row in enumerate(values[2:], start=3):
            is_empty = all((cell.strip() == "" if isinstance(cell, str) else True) for cell in row[:breakpoint_index])
            if is_empty:
                empty_row_count += 1
                if empty_row_count >= max_consecutive_empty:
                    break
                continue
            else:
                empty_row_count = 0
            row_data = row[:breakpoint_index] + [""] * (len(headers_before_break) - len(row))
            row_index_data[idx] = dict(zip(headers_before_break, row_data))

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
                break

        sheet_info = {
            "status": "success",
            "ROW_INDEX": row_index_data,
            "COLUMN_INDEX": column_index_data
        }
        
        if sheet_info.get("status") != "success":
            return {"status": "error", "message": "Failed to fetch sheet data"}
         
        
        ACTION_PROMPT = f"""
        You are given
        SHEET DATA: 
        {sheet_info}

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
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Get both sheet IDs (main sheet and QNT sheet) from the same spreadsheet
        spreadsheet = service.spreadsheets().get(
            spreadsheetId=request.spreadsheet_id
        ).execute()
        
        main_sheet_id = None
        qnt_sheet_id = None
        
        for sheet in spreadsheet.get('sheets', []):
            title = sheet['properties']['title']
            if title == request.sheet_name:
                main_sheet_id = sheet['properties']['sheetId']
            elif title == 'QNT':
                qnt_sheet_id = sheet['properties']['sheetId']
        
        if main_sheet_id is None:
            return {"status": "error", "message": f"Sheet '{request.sheet_name}' not found in the spreadsheet"}
            
        if qnt_sheet_id is None:
            # Create the QNT sheet if it doesn't exist
            try:
                add_sheet_request = {
                    'addSheet': {
                        'properties': {
                            'title': 'QNT',
                            'gridProperties': {
                                'rowCount': 1000,
                                'columnCount': 26
                            }
                        }
                    }
                }
                
                # Execute the batch update to add the sheet
                result = service.spreadsheets().batchUpdate(
                    spreadsheetId=request.spreadsheet_id,
                    body={'requests': [add_sheet_request]}
                ).execute()
                
                # Get the new sheet's ID from the response
                qnt_sheet_id = result['replies'][0]['addSheet']['properties']['sheetId']
                
                print(f"Created new QNT sheet with ID: {qnt_sheet_id}")
                    
            except Exception as e:
                return {"status": "error", "message": f"Failed to create QNT sheet: {str(e)}"}
        
        # Prepare batch update request for cell formatting and values
        requests = []
        
        for (row_idx, col_idx, update, qty) in zip(row_indices, columns_indices, updations, quantities):
            # Convert column letter to column number (0-based)
            col_num = ord(col_idx.upper()) - ord('A')
            row_num = int(row_idx)  # Convert to 0-based
            
            # 1. Update main sheet with date and formatting
            bg_color = {
                'red': 1.0, 'green': 0.9, 'blue': 0.0, 'alpha': 1.0  # Yellow for WIP
            } if update == 'WIP' else {
                'red': 0.0, 'green': 0.8, 'blue': 0.0, 'alpha': 1.0  # Green for COM
            }
            
            # Add request for main sheet update
            requests.append({
                'updateCells': {
                    'range': {
                        'sheetId': main_sheet_id,
                        'startRowIndex': row_num,
                        'endRowIndex': row_num + 1,
                        'startColumnIndex': col_num,
                        'endColumnIndex': col_num + 1
                    },
                    'rows': [{
                        'values': [{
                            'userEnteredValue': {'stringValue': today},
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
            
            # 2. Get existing value from QNT sheet and add new quantity
            try:
                # First, get the current value from the QNT sheet
                cell_range = f"{col_idx}{row_num + 1}"  # +1 because row_num is 0-based
                result = service.spreadsheets().values().get(
                    spreadsheetId=request.spreadsheet_id,
                    range=f"'QNT'!{cell_range}",
                    valueRenderOption='UNFORMATTED_VALUE'
                ).execute()
                
                # Parse the existing value (default to 0 if empty)
                existing_value = 0.0
                if 'values' in result and result['values']:
                    try:
                        existing_value = float(str(result['values'][0][0]))
                    except (ValueError, IndexError, KeyError):
                        existing_value = 0.0
                
                # Parse the new quantity
                try:
                    new_qty = float(str(qty).strip()) if str(qty).strip().replace('.', '').isdigit() else 0.0
                except (ValueError, AttributeError):
                    new_qty = 0.0
                
                # Calculate the total
                total_value = existing_value + new_qty
                
            except Exception as e:
                return {"status": "error", "message": f"Failed to read from QNT sheet: {str(e)}"}
            
            # Add request to update QNT sheet with the total
            requests.append({
                'updateCells': {
                    'range': {
                        'sheetId': qnt_sheet_id,
                        'startRowIndex': row_num,
                        'endRowIndex': row_num + 1,
                        'startColumnIndex': col_num,
                        'endColumnIndex': col_num + 1
                    },
                    'rows': [{
                        'values': [{
                            'userEnteredValue': {'numberValue': total_value},
                            'userEnteredFormat': {
                                'numberFormat': {
                                    'type': 'NUMBER',
                                    'pattern': '0.00'
                                },
                                'horizontalAlignment': 'CENTER',
                                'verticalAlignment': 'MIDDLE'
                            }
                        }]
                    }],
                    'fields': 'userEnteredValue,userEnteredFormat(numberFormat,horizontalAlignment,verticalAlignment)'
                }
            })
        
        # Execute the batch update if there are requests
        if requests:
            body = {'requests': requests}
            service.spreadsheets().batchUpdate(
                spreadsheetId=request.spreadsheet_id,
                body=body
            ).execute()
            
            # Log the updates to LOG sheet
            log_entries = []
            for i, (row_idx, col_idx, update, qty, feedback) in enumerate(zip(row_indices, columns_indices, updations, quantities, feedbacks)):
                try:
                    # Get the row data (A,B,C,D columns)
                    row_num = int(row_idx)
                    range_notation = f"{request.sheet_name}!A{row_num}:D{row_num}"
                    result = service.spreadsheets().values().get(
                        spreadsheetId=request.spreadsheet_id,
                        range=range_notation,
                        valueRenderOption='UNFORMATTED_VALUE'
                    ).execute()
                    
                    # Get the column header (row 2 of the updated column)
                    header_range = f"{request.sheet_name}!{col_idx}2"
                    header_result = service.spreadsheets().values().get(
                        spreadsheetId=request.spreadsheet_id,
                        range=header_range,
                        valueRenderOption='UNFORMATTED_VALUE'
                    ).execute()
                    
                    # Get the column header value
                    column_header = header_result.get('values', [['']])[0][0] if 'values' in header_result else ''
                    
                    # Get the row values
                    row_values = result.get('values', [['', '', '', '']])[0]
                    
                    # Get the updated quantity from the QNT sheet (add 1 to row_num for 1-based indexing)
                    qnt_range = f"'QNT'!{col_idx.upper()}{row_num + 1}"
                    qnt_result = service.spreadsheets().values().get(
                        spreadsheetId=request.spreadsheet_id,
                        range=qnt_range,
                        valueRenderOption='UNFORMATTED_VALUE'
                    ).execute()
                    
                    updated_qty = 0.0
                    if 'values' in qnt_result and qnt_result['values']:
                        try:
                            updated_qty = float(str(qnt_result['values'][0][0]))
                        except (ValueError, IndexError, KeyError):
                            updated_qty = 0.0
                    
                    # Create log entry
                    log_entry = [
                        datetime.now().strftime('%Y-%m-%d %H:%M:%S'),  # time
request.site_engineer_name,                    # site_engineer_name
                        str(row_values[0]) if len(row_values) > 0 else '',  # Location
                        str(row_values[1]) if len(row_values) > 1 else '',  # Sub Location
                        str(row_values[2]) if len(row_values) > 2 else '',  # Peta Location
                        str(row_values[3]) if len(row_values) > 3 else '',  # Category
                        str(column_header),                            # updation (column header)
                        float(qty) if str(qty).replace('.', '').isdigit() else 0.0,  # quantity
                        updated_qty,                                   # updated_quantity
                        request.user_query,                            # user_query
                        str(feedback),                                 # feedback
                        f"{col_idx.upper()}{row_num + 1}"                  # updated_cell (add 1 for 1-based indexing)
                    ]
                    log_entries.append(log_entry)
                    
                except Exception as e:
                    print(f"Warning: Could not prepare log entry for {col_idx}{row_idx}: {str(e)}")
            
            # Write log entries to LOG sheet if any
            if log_entries:
                try:
                    # Ensure LOG sheet exists and get its ID
                    log_sheet_id = ensure_log_sheet_exists(service, request.spreadsheet_id)
                    
                    if log_sheet_id is not None:
                        # Get the next empty row in LOG sheet
                        result = service.spreadsheets().values().get(
                            spreadsheetId=request.spreadsheet_id,
                            range="'LOG'!A:A",
                            valueRenderOption='UNFORMATTED_VALUE'
                        ).execute()
                        
                        next_row = len(result.get('values', [])) + 1
                        
                        # Append log entries
                        service.spreadsheets().values().update(
                            spreadsheetId=request.spreadsheet_id,
                            range=f"'LOG'!A{next_row}",
                            valueInputOption='USER_ENTERED',
                            body={'values': log_entries}
                        ).execute()
                        
                except Exception as e:
                    print(f"Warning: Could not write to LOG sheet: {str(e)}")
        
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
# -----------------------------
# New endpoint: query_logs
# -----------------------------
@app.post("/api/query-logs")
async def query_logs(request: LogsQueryRequest, service=Depends(get_sheets_service), site_engineer_name: str = Depends(oauth2_scheme)):
    """
    Query the logs in the spreadsheet.
    
    Args:
        request: Contains:
            - spreadsheet_id: ID of the spreadsheet
            - query: The user's query about the logs
            - max_logs: Maximum number of logs to retrieve (default: 100)
            
    Returns:
        A response containing the answer to the user's query
    """
    try:
            
        # Ensure LOG sheet exists
        log_sheet_id = ensure_log_sheet_exists(service, request.spreadsheet_id)
        if log_sheet_id is None:
            return {"status": "error", "message": "Could not access or create LOG sheet"}
        
        # Get the log data
        result = service.spreadsheets().values().get(
            spreadsheetId=request.spreadsheet_id,
            range="'LOG'!A2:L" + str(request.max_logs + 1),  # +1 because of 1-based indexing
            valueRenderOption='UNFORMATTED_VALUE'
        ).execute()
        
        # If no logs found, return empty response
        if 'values' not in result or not result['values']:
            return {
                "status": "success",
                "result": "No log entries found in the spreadsheet.",
                "logs_analyzed": 0
            }
        
        # Convert the log data to a list of dictionaries
        headers = [
            'time', 'site_engineer_name', 'Location', 'Sub Location',
            'Peta Location', 'Category', 'updation', 'requested_quantity',
            'updated_quantity', 'user_query', 'feedback', 'updated_cell'
        ]
        
        logs = []
        for row in result['values']:
            if len(row) < len(headers):
                # Pad the row with empty strings if it's shorter than the headers
                row = row + [''] * (len(headers) - len(row))
            log_entry = dict(zip(headers, row[:len(headers)]))
            logs.append(log_entry)
        
        # Process the query using the log agent
        result = process_logs_query(logs, request.query, site_engineer_name)
        
        return {
            "status": "success",
            "result": result,
            "logs_analyzed": len(logs)
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "message": f"An error occurred while processing your query: {str(e)}"
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