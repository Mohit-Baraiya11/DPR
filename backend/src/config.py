SYSTEM_PROMPT = """
You are a strict data extraction and validation assistant.  
Your job is to read the provided SHEET DATA (ROW_INDEX and COLUMN_INDEX) and process the USER QUERY according to the rules below.  
Your output must always be a valid JSON object with exactly these fields:

{
  "row_index": [list of strings],
  "columns_index": [list of strings],
  "updations": [list of strings],
  "quantities": [list of integers],
  "feedbacks": [list of strings]
}

### RULES ###

1. ROW MATCH IS THE GATEKEEPER:
   - For each instruction in the user query, you must find a row in ROW_INDEX where **all four fields** exactly match:
       Location, Sub Location, Peta Location, Category
   - Matching is case-insensitive and ignores extra spaces at the start/end of the field.
   - The match is considered valid only if ALL four fields match exactly after normalization.
   - If there is NO exact match for an instruction:
       - row_index = []
       - columns_index = []
       - updations = []
       - quantities = []
       - feedbacks = ["No exact match found in the given sheet."]
       - STOP processing that instruction completely (do not check columns, updations, or quantities).

2. COLUMN MATCHING (only if row match exists):
   - Compare the work term from the user query to COLUMN_INDEX values (case-insensitive, trim spaces).
   - If a match is found:
       • Store the matching column's **key** (e.g., "F", "G") in `columns_index`.
       • Use the matching column's **value** (e.g., "Brickwrosk") in the feedback message.
   - If multiple column values contain the user term (ambiguous), return:
       row_index = []
       columns_index = []
       updations = []
       quantities = []
       feedbacks = ["Which thing you want to update specifically? <term> inside or <term> outside?"]
     and skip processing that instruction.
   - Only one exact or unambiguous match should be used.

3. UPDATIONS:
   - The status can only be:
       "completed" → "COM"
       "work in progress" → "WIP"
   - If neither is found, do not assume a value — leave that instruction as-is.

4. QUANTITIES:
   - If the user specifies a quantity after the word "by" (e.g., "by 20 cubic meter"), extract the integer value.
   - If no quantity is mentioned, use 0.

5. MULTIPLE INSTRUCTIONS:
   - The user query may contain more than one update (separated by "and", commas, etc.).
   - Each instruction is processed independently according to all the rules above.
   - Output lists should keep the same order as the valid matched instructions.

6. FEEDBACKS:
   - If a match is successful:
       "Location <Location>, Sub Location <Sub Location>, Peta Location <Peta Location>, Category <Category> has been updated to <updation> for <column name>"
   - If no exact row match:
       "No exact match found in the given sheet."
   - If ambiguous column:
       "Which thing you want to update specifically? <term> inside or <term> outside?"

7. STRICTNESS:
   - Do NOT attempt fuzzy matching for Location, Sub Location, Peta Location, or Category.
   - Do NOT try to correct spelling or infer missing values.
   - Do NOT output any keys or fields that are not listed in the JSON format above.

""" 


ADDITIONAL_PROMPT = """
**CRITICAL INSTRUCTION:** 
You MUST consolidate synonymous terms into single work concepts. NEVER create separate entries for the same physical work activity.

**FORCED CONSOLIDATION PROCESS:**

**EXAMPLE 1:**
Search: "25 kgs structural steel at 05-07-2025"
Sheet: "30: Structural Steel"
Output:
found_descriptions_list=["Structural Steel"],
not_found_descriptions_list=[],
relevant_indexes=[30],
updated_quantity=[25.0],
dates=["05-07-2025"],
conclution="Structural Steel is updated with 25.0 at 05-07-2025"

**EXAMPLE 2:**
Search: "Structural Steel done on 13th July"
Sheet: "30: Structural Steel"
Output:
found_descriptions_list=[],
not_found_descriptions_list=["Structural Steel"],
relevant_indexes=[],
updated_quantity=[],
dates=[],
conclution="Structural Steel - quantity is missing"

**EXAMPLE 3:**
Search: "25 kgs of structural steel work is done and excavation has been done on 5-07-2025"
Sheet: "30: Structural Steel, 6: Excavation for foundation..."
Expected Output:
found_descriptions_list=["Structural Steel"],
not_found_descriptions_list=["Excavation for foundation of all type of soil upto1.5 mt depth"],
relevant_indexes=[30],
updated_quantity=[25.0],
dates=["05-07-2025"],
conclution="Structural Steel is updated with 25.0 at 05-07-2025 but Excavation for foundation of all type of soil upto1.5 mt depth - quantity is missing"

**THOUGHT PROCESS - Complete this reasoning:**

**STEP 1 - IDENTIFY ITEMS:**
Think: "What work items are mentioned in the search text?"
List each item separately.

**STEP 2 - QUANTITY ANALYSIS:**  
For each item, think:
- "What is the EXPLICIT quantity mentioned for [ITEM NAME]?"
- "Is this quantity a real number with units, or just words like 'done'?"
- "If I see 'done/completed/finished' without numbers, this means NO QUANTITY"

**STEP 3 - SHEET MATCHING:**
For each item, think:
- "Does [ITEM NAME] exist in the provided sheet data?"
- "What is the closest match and its index?"

**STEP 4 - VALIDATION DECISION:**
For each item, validate:
- ✅ Has explicit quantity (real number > 0) AND exists in sheet → FOUND
- ❌ Missing quantity OR not in sheet OR quantity is 0 → NOT FOUND

**STEP 5 - CLASSIFICATION:**
Based on validation, classify each item into appropriate list.

**DETAILED REASONING EXAMPLE:**
Search: "25 kgs of structural steel work is done and excavation has been done"

THOUGHT: I see two items:
1. "structural steel work" - has "25 kgs" explicitly mentioned ✅
2. "excavation" - only says "has been done", no quantity mentioned ❌

THOUGHT: Checking sheet data:
1. "Structural Steel" exists at index 30 ✅  
2. "Excavation for foundation..." exists at index 6 ✅

VALIDATION:
1. Structural steel: Has quantity (25.0) + exists in sheet → FOUND
2. Excavation: No quantity (only "done") → NOT FOUND

ACTION: 
- found_descriptions_list = ["Structural Steel"]
- not_found_descriptions_list = ["Excavation for foundation of all type of soil upto1.5 mt depth"]
- relevant_indexes = [30]
- updated_quantity = [25.0]
- conclution = "Structural Steel is updated with 25.0 at 05-07-2025 but Excavation for foundation of all type of soil upto1.5 mt depth - quantity is missing"

**NOW ANALYZE THE CURRENT SEARCH TEXT:**
Apply the same ReAct process to: 

**REASONING CHECKPOINT:**
Before generating final output, verify:
- Did I find explicit quantities (numbers + units) for each found item?
- Did I put any 0.0 quantities in found_descriptions_list? (This should be NO)
- Are all found items backed by real numbers from the search text?

**GENERATE OUTPUT ONLY AFTER COMPLETING THIS REASONING**

""" 

SHEET_DATA = """
{
  "status": "success",
  "ROW_INDEX": {
    "3": {
      "Location": "A building",
      "Sub Location": "1ST ",
      "Peta Location": "101",
      "Category": "1 BHK"
    },
    "4": {
      "Location": "A building",
      "Sub Location": "1ST ",
      "Peta Location": "101",
      "Category": "1 BHK"
    },
    "5": {
      "Location": "A building",
      "Sub Location": "1ST ",
      "Peta Location": "102",
      "Category": "NA"
    },
    "6": {
      "Location": "A building",
      "Sub Location": "1ST ",
      "Peta Location": "103",
      "Category": "2 BHK "
    },
    "7": {
      "Location": "A building",
      "Sub Location": "1ST ",
      "Peta Location": "Lobby",
      "Category": "3 BHK"
    },
    "8": {
      "Location": "SPAN ",
      "Sub Location": "405",
      "Peta Location": "103",
      "Category": "4 BHK"
    },
    "9": {
      "Location": "SPAN ",
      "Sub Location": "406",
      "Peta Location": "103",
      "Category": "5 BHK"
    },
    "10": {
      "Location": "SPAN ",
      "Sub Location": "407",
      "Peta Location": "103",
      "Category": "6 BHK"
    },
    "11": {
      "Location": "SPAN ",
      "Sub Location": "408",
      "Peta Location": "103",
      "Category": "7 BHK"
    },
    "12": {
      "Location": "SPAN ",
      "Sub Location": "409",
      "Peta Location": "103",
      "Category": "8 BHK"
    },
    "13": {
      "Location": "SPAN ",
      "Sub Location": "410",
      "Peta Location": "103",
      "Category": "9 BHK"
    },
    "14": {
      "Location": "SPAN ",
      "Sub Location": "411",
      "Peta Location": "103",
      "Category": "10 BHK"
    },
    "15": {
      "Location": "SPAN ",
      "Sub Location": "412",
      "Peta Location": "103",
      "Category": "11 BHK"
    },
    "16": {
      "Location": "SPAN ",
      "Sub Location": "413",
      "Peta Location": "103",
      "Category": "12 BHK"
    },
    "17": {
      "Location": "SPAN ",
      "Sub Location": "414",
      "Peta Location": "103",
      "Category": "13 BHK"
    },
    "18": {
      "Location": "SPAN ",
      "Sub Location": "415",
      "Peta Location": "103",
      "Category": "14 BHK"
    },
    "19": {
      "Location": "SPAN ",
      "Sub Location": "416",
      "Peta Location": "103",
      "Category": "15 BHK"
    },
    "20": {
      "Location": "SPAN ",
      "Sub Location": "417",
      "Peta Location": "103",
      "Category": "16 BHK"
    },
    "21": {
      "Location": "SPAN ",
      "Sub Location": "418",
      "Peta Location": "103",
      "Category": "17 BHK"
    },
    "22": {
      "Location": "SPAN ",
      "Sub Location": "419",
      "Peta Location": "103",
      "Category": "18 BHK"
    },
    "23": {
      "Location": "SPAN ",
      "Sub Location": "420",
      "Peta Location": "103",
      "Category": "19 BHK"
    },
    "24": {
      "Location": "SPAN ",
      "Sub Location": "421",
      "Peta Location": "103",
      "Category": "20 BHK"
    },
    "25": {
      "Location": "SPAN ",
      "Sub Location": "422",
      "Peta Location": "103",
      "Category": "21 BHK"
    },
    "26": {
      "Location": "SPAN ",
      "Sub Location": "423",
      "Peta Location": "103",
      "Category": "22 BHK"
    },
    "27": {
      "Location": "SPAN ",
      "Sub Location": "424",
      "Peta Location": "103",
      "Category": "23 BHK"
    },
    "28": {
      "Location": "SPAN ",
      "Sub Location": "425",
      "Peta Location": "103",
      "Category": "24 BHK"
    },
    "29": {
      "Location": "SPAN ",
      "Sub Location": "426",
      "Peta Location": "103",
      "Category": "25 BHK"
    },
    "30": {
      "Location": "SPAN ",
      "Sub Location": "427",
      "Peta Location": "103",
      "Category": "26 BHK"
    },
    "31": {
      "Location": "SPAN ",
      "Sub Location": "428",
      "Peta Location": "103",
      "Category": "27 BHK"
    },
    "32": {
      "Location": "SPAN ",
      "Sub Location": "429",
      "Peta Location": "103",
      "Category": "28 BHK"
    },
    "33": {
      "Location": "SPAN ",
      "Sub Location": "430",
      "Peta Location": "103",
      "Category": "29 BHK"
    },
    "34": {
      "Location": "SPAN ",
      "Sub Location": "431",
      "Peta Location": "103",
      "Category": "30 BHK"
    },
    "35": {
      "Location": "SPAN ",
      "Sub Location": "432",
      "Peta Location": "103",
      "Category": "31 BHK"
    },
    "36": {
      "Location": "SPAN ",
      "Sub Location": "433",
      "Peta Location": "103",
      "Category": "32 BHK"
    },
    "37": {
      "Location": "SPAN ",
      "Sub Location": "434",
      "Peta Location": "103",
      "Category": "33 BHK"
    },
    "38": {
      "Location": "SPAN ",
      "Sub Location": "435",
      "Peta Location": "103",
      "Category": "34 BHK"
    },
    "39": {
      "Location": "SPAN ",
      "Sub Location": "436",
      "Peta Location": "103",
      "Category": "35 BHK"
    },
    "40": {
      "Location": "SPAN ",
      "Sub Location": "437",
      "Peta Location": "103",
      "Category": "36 BHK"
    },
    "41": {
      "Location": "SPAN ",
      "Sub Location": "438",
      "Peta Location": "103",
      "Category": "37 BHK"
    },
    "42": {
      "Location": "SPAN ",
      "Sub Location": "439",
      "Peta Location": "103",
      "Category": "38 BHK"
    },
    "43": {
      "Location": "SPAN ",
      "Sub Location": "440",
      "Peta Location": "103",
      "Category": "39 BHK"
    },
    "44": {
      "Location": "SPAN ",
      "Sub Location": "441",
      "Peta Location": "103",
      "Category": "40 BHK"
    },
    "45": {
      "Location": "SPAN ",
      "Sub Location": "442",
      "Peta Location": "103",
      "Category": "41 BHK"
    },
    "46": {
      "Location": "SPAN ",
      "Sub Location": "443",
      "Peta Location": "103",
      "Category": "42 BHK"
    },
    "47": {
      "Location": "SPAN ",
      "Sub Location": "444",
      "Peta Location": "103",
      "Category": "43 BHK"
    },
    "48": {
      "Location": "SPAN ",
      "Sub Location": "445",
      "Peta Location": "103",
      "Category": "44 BHK"
    },
    "49": {
      "Location": "SPAN ",
      "Sub Location": "446",
      "Peta Location": "103",
      "Category": "45 BHK"
    },
    "50": {
      "Location": "SPAN ",
      "Sub Location": "447",
      "Peta Location": "103",
      "Category": "46 BHK"
    },
    "51": {
      "Location": "SPAN ",
      "Sub Location": "448",
      "Peta Location": "103",
      "Category": "47 BHK"
    },
    "52": {
      "Location": "SPAN ",
      "Sub Location": "449",
      "Peta Location": "103",
      "Category": "48 BHK"
    },
    "53": {
      "Location": "SPAN ",
      "Sub Location": "450",
      "Peta Location": "103",
      "Category": "49 BHK"
    },
    "54": {
      "Location": "SPAN",
      "Sub Location": "451",
      "Peta Location": "103",
      "Category": "50 BHK"
    },
    "55": {
      "Location": "SPAN",
      "Sub Location": "452",
      "Peta Location": "103",
      "Category": "51 BHK"
    },
    "56": {
      "Location": "SPAN",
      "Sub Location": "453",
      "Peta Location": "103",
      "Category": "52 BHK"
    },
    "57": {
      "Location": "SPAN",
      "Sub Location": "454",
      "Peta Location": "103",
      "Category": "53 BHK"
    },
    "58": {
      "Location": "SPAN",
      "Sub Location": "455",
      "Peta Location": "103",
      "Category": "54 BHK"
    },
    "59": {
      "Location": "SPAN",
      "Sub Location": "456",
      "Peta Location": "103",
      "Category": "55 BHK"
    },
    "60": {
      "Location": "SPAN",
      "Sub Location": "457",
      "Peta Location": "103",
      "Category": "56 BHK"
    },
    "61": {
      "Location": "SPAN",
      "Sub Location": "458",
      "Peta Location": "103",
      "Category": "57 BHK"
    },
    "62": {
      "Location": "SPAN",
      "Sub Location": "459",
      "Peta Location": "103",
      "Category": "58 BHK"
    },
    "63": {
      "Location": "SPAN",
      "Sub Location": "460",
      "Peta Location": "103",
      "Category": "59 BHK"
    },
    "64": {
      "Location": "SPAN",
      "Sub Location": "461",
      "Peta Location": "103",
      "Category": "60 BHK"
    },
    "65": {
      "Location": "SPAN",
      "Sub Location": "462",
      "Peta Location": "103",
      "Category": "61 BHK"
    },
    "66": {
      "Location": "SPAN",
      "Sub Location": "463",
      "Peta Location": "103",
      "Category": "62 BHK"
    },
    "67": {
      "Location": "SPAN",
      "Sub Location": "464",
      "Peta Location": "103",
      "Category": "63 BHK"
    },
    "68": {
      "Location": "SPAN",
      "Sub Location": "465",
      "Peta Location": "103",
      "Category": "64 BHK"
    },
    "69": {
      "Location": "SPAN",
      "Sub Location": "466",
      "Peta Location": "103",
      "Category": "65 BHK"
    },
    "70": {
      "Location": "SPAN",
      "Sub Location": "467",
      "Peta Location": "103",
      "Category": "66 BHK"
    },
    "71": {
      "Location": "SPAN",
      "Sub Location": "468",
      "Peta Location": "103",
      "Category": "67 BHK"
    },
    "72": {
      "Location": "SPAN",
      "Sub Location": "469",
      "Peta Location": "103",
      "Category": "68 BHK"
    },
    "73": {
      "Location": "SPAN",
      "Sub Location": "470",
      "Peta Location": "103",
      "Category": "69 BHK"
    },
    "74": {
      "Location": "SPAN",
      "Sub Location": "471",
      "Peta Location": "103",
      "Category": "70 BHK"
    },
    "75": {
      "Location": "SPAN",
      "Sub Location": "472",
      "Peta Location": "103",
      "Category": "71 BHK"
    },
    "76": {
      "Location": "SPAN",
      "Sub Location": "473",
      "Peta Location": "103",
      "Category": "72 BHK"
    },
    "77": {
      "Location": "SPAN",
      "Sub Location": "474",
      "Peta Location": "103",
      "Category": "73 BHK"
    },
    "78": {
      "Location": "SPAN",
      "Sub Location": "475",
      "Peta Location": "103",
      "Category": "74 BHK"
    },
    "79": {
      "Location": "SPAN",
      "Sub Location": "476",
      "Peta Location": "103",
      "Category": "75 BHK"
    },
    "80": {
      "Location": "SPAN",
      "Sub Location": "477",
      "Peta Location": "103",
      "Category": "76 BHK"
    },
    "81": {
      "Location": "SPAN",
      "Sub Location": "478",
      "Peta Location": "103",
      "Category": "77 BHK"
    },
    "82": {
      "Location": "SPAN",
      "Sub Location": "479",
      "Peta Location": "103",
      "Category": "78 BHK"
    },
    "83": {
      "Location": "SPAN",
      "Sub Location": "480",
      "Peta Location": "103",
      "Category": "79 BHK"
    },
    "84": {
      "Location": "SPAN",
      "Sub Location": "481",
      "Peta Location": "103",
      "Category": "80 BHK"
    },
    "85": {
      "Location": "SPAN",
      "Sub Location": "482",
      "Peta Location": "103",
      "Category": "81 BHK"
    },
    "86": {
      "Location": "SPAN",
      "Sub Location": "483",
      "Peta Location": "103",
      "Category": "82 BHK"
    },
    "87": {
      "Location": "SPAN",
      "Sub Location": "484",
      "Peta Location": "103",
      "Category": "83 BHK"
    },
    "88": {
      "Location": "SPAN",
      "Sub Location": "485",
      "Peta Location": "103",
      "Category": "84 BHK"
    },
    "89": {
      "Location": "SPAN",
      "Sub Location": "486",
      "Peta Location": "103",
      "Category": "85 BHK"
    },
    "90": {
      "Location": "SPAN",
      "Sub Location": "487",
      "Peta Location": "103",
      "Category": "86 BHK"
    },
    "91": {
      "Location": "SPAN",
      "Sub Location": "488",
      "Peta Location": "103",
      "Category": "87 BHK"
    },
    "92": {
      "Location": "SPAN",
      "Sub Location": "489",
      "Peta Location": "103",
      "Category": "88 BHK"
    },
    "93": {
      "Location": "SPAN",
      "Sub Location": "490",
      "Peta Location": "103",
      "Category": "89 BHK"
    },
    "94": {
      "Location": "SPAN",
      "Sub Location": "491",
      "Peta Location": "103",
      "Category": "90 BHK"
    },
    "95": {
      "Location": "SPAN",
      "Sub Location": "492",
      "Peta Location": "103",
      "Category": "91 BHK"
    },
    "96": {
      "Location": "SPAN",
      "Sub Location": "493",
      "Peta Location": "103",
      "Category": "92 BHK"
    },
    "97": {
      "Location": "SPAN",
      "Sub Location": "494",
      "Peta Location": "103",
      "Category": "93 BHK"
    },
    "98": {
      "Location": "SPAN",
      "Sub Location": "495",
      "Peta Location": "103",
      "Category": ""
    }
  },
  "COLUMN_INDEX": {
    "F": "Brickwrosk",
    "G": "Gypsum",
    "H": "Internal Plaster : Wall Cladding",
    "I": " FITUP",
    "J": " WELDING",
    "K": " FIT UP",
    "L": "WELDING",
    "M": " FIT UP",
    "N": "WELDING",
    "O": "WELDING",
    "P": "WELDING",
    "Q": "WELDING",
    "R": " FIT UP",
    "S": "WELDING",
    "T": " FIT UP",
    "U": "WELDING"
  }
}
""" 