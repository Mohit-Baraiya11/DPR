from src.prompt_builder import process_user_query
from src.config import SYSTEM_PROMPT, SHEET_DATA
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_sheets_service():
    """Helper function to get Google Sheets service"""
    creds = Credentials(
        None,
        refresh_token=os.getenv("GOOGLE_REFRESH_TOKEN"),
        token_uri=os.getenv("GOOGLE_TOKEN_URI"),
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        scopes=["https://www.googleapis.com/auth/spreadsheets"]
    )

    if not creds.valid:
        creds.refresh(Request())

    return build('sheets', 'v4', credentials=creds)

def update_sheet(spreadsheet_id, updates):
    """Update Google Sheet with the given updates
    
    Args:
        spreadsheet_id: ID of the Google Sheet
        updates: List of tuples (row, column, status, quantity)
    """
    service = get_sheets_service()
    today = datetime.now().strftime("%Y-%m-%d")
    
    requests = []
    
    for row, col, status, qty in updates:
        # Convert column letter to index (0-based)
        col_idx = ord(col.upper()) - ord('A')
        
        # Determine background color based on status
        bg_color = {
            "red": 0.95 if status == "WIP" else 0.0,
            "green": 0.95 if status == "COM" else 0.0,
            "blue": 0.0,
            "alpha": 1.0
        }
        
        # Create update request
        requests.append({
            "updateCells": {
                "range": {
                    "sheetId": 0,  # Assuming first sheet
                    "startRowIndex": int(row) - 1,
                    "endRowIndex": int(row),
                    "startColumnIndex": col_idx,
                    "endColumnIndex": col_idx + 1
                },
                "rows": [{
                    "values": [{
                        "userEnteredValue": {"stringValue": f"{status} - {qty} m³ - {today}"},
                        "userEnteredFormat": {
                            "backgroundColor": bg_color,
                            "textFormat": {"bold": True},
                            "horizontalAlignment": "CENTER"
                        }
                    }]
                }],
                "fields": "userEnteredValue,userEnteredFormat"
            }
        })
    
    # Execute batch update if there are updates
    if requests:
        body = {"requests": requests}
        result = service.spreadsheets().batchUpdate(
            spreadsheetId=spreadsheet_id,
            body=body
        ).execute()
        return result
    return None

if __name__ == "__main__":
    # Your Google Sheet ID - replace with your actual sheet ID
    SPREADSHEET_ID = os.getenv("GOOGLE_SHEET_ID")
    
    if not SPREADSHEET_ID:
        print("Error: GOOGLE_SHEET_ID environment variable not set")
        exit(1)

    user_query = """Location A-building , Sub Location 1ST , Peta Location Lobby, Category 6 BHK  Brickwrosk completed by 100 cubic meter and
    Location span  , Sub Location 408 , Peta Location 103, Category 7 BHK  Brickwrosk completed by 20 cubic meter"""
    
    print("Processing query:", user_query)
    print("-" * 50)
    
    ACTION_PROMPT = f"""
    You are given
    SHEET DATA: 
    {SHEET_DATA}

    USER QUERY:
    {user_query}

    Now, process the user query according to the SYSTEM_PROMPT rules:
    - Identify exact row matches first.
    - Then identify columns only if row matches exist.
    - Detect updations ("COM" or "WIP") and quantities.
    - Build the output as a SupportResult JSON with the required fields.
    - Do not add any extra keys or change the order of keys in the output.
    - Ensure that all matching and parsing follows the SYSTEM_PROMPT exactly.
    """
    
    try:
        # Process the user query
        row_indices, columns_indices, updations, quantities, feedbacks = process_user_query(ACTION_PROMPT)
        
        # Print the results
        print("Processing Results:")
        print("Row Indices:", row_indices)
        print("Column Indices:", columns_indices)
        print("Updates:", updations)
        print("Quantities:", quantities)
        print("\nFeedback:")
        for feedback in feedbacks:
            print(f"- {feedback}")
        
        # Prepare updates for the sheet
        updates = list(zip(row_indices, columns_indices, updations, quantities))
        
        if updates:
            print("\nUpdating Google Sheet...")
            result = update_sheet(SPREADSHEET_ID, updates)
            
            if result:
                print("\n✅ Sheet updated successfully!")
                print(f"Total cells updated: {len(updates)}")
            else:
                print("\n❌ No updates were made to the sheet.")
        else:
            print("\nℹ️ No updates to process.")
            
    except Exception as e:
        print(f"\n❌ An error occurred: {str(e)}")
        if hasattr(e, 'response') and hasattr(e.response, 'content'):
            print("Error details:", e.response.content)
