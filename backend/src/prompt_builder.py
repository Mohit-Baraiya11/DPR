from agno.agent import Agent
from agno.models.groq import Groq
from utils.logger import get_logger
from pydantic import BaseModel, Field
from dotenv import load_dotenv 
from .config import SYSTEM_PROMPT, LOGS_SYSTEM_PROMPT
import os

load_dotenv()

logger = get_logger(__name__)


class SupportResult(BaseModel):
    row_index: list[str]
    columns_index: list[str] 
    updations: list[str]
    quantities: list[int]
    feedbacks: list[str]

class LogQueryResult(BaseModel):
    result: str = Field(description="Answer of the given Query based on the provide logs data") 


def get_support_agent(api_key: str) -> Agent:
    return Agent(
        model=Groq(id="meta-llama/llama-4-scout-17b-16e-instruct", api_key=api_key),
        system_message=SYSTEM_PROMPT,
        markdown=False,
        response_model=SupportResult,
        retries=10,
        add_datetime_to_instructions=True,
    )

def get_log_agent(api_key: str) -> Agent:
    return Agent(
        model=Groq(id="meta-llama/llama-4-scout-17b-16e-instruct", api_key=api_key),
        system_message=LOGS_SYSTEM_PROMPT,
        markdown=False,  
        response_model=LogQueryResult,
        retries=4,  
        add_datetime_to_instructions=False,
    )

def process_user_query(user_query: str, groq_api_key: str):
    agent = get_support_agent(groq_api_key)
    output = agent.run(user_query)
    return ( 
        output.content.row_index,
        output.content.columns_index,
        output.content.updations,
        output.content.quantities,
        output.content.feedbacks
    )


def process_logs_query(logs_data: list[dict], user_query: str, site_engineer_name: str, groq_api_key: str) -> str:
    """
    Process a query about the logs data.
    
    Optimized to reduce token usage by:
    - Only including essential fields (date, site_engineer, location, peta_location, updation, update_quantity)
    - Removing newlines and tabs from data
    - Using compact single-line format for each log entry
    
    Args:
        logs_data: List of log entries as dictionaries
        user_query: The user's query about the logs
        site_engineer_name: Name of the user making the query
        groq_api_key: API key for Groq
        
    Returns:
        str: The response to the user's query
    """
    try:
        # Handle empty logs case
        if not logs_data:
            return "No log entries found to analyze."
        
        # Format the logs data in compact tuple format
        # Clean data by removing newlines and tabs before formatting
        logs_entries = []
        for log in logs_data:
            # Clean each field and handle None values
            date = str(log.get('time', 'N/A') or 'N/A').replace('\n', ' ').replace('\t', ' ').strip()
            engineer = str(log.get('site_engineer_name', 'N/A') or 'N/A').replace('\n', ' ').replace('\t', ' ').strip()
            location = str(log.get('Location', 'N/A') or 'N/A').replace('\n', ' ').replace('\t', ' ').strip()
            peta_location = str(log.get('Peta Location', 'N/A') or 'N/A').replace('\n', ' ').replace('\t', ' ').strip()
            updation = str(log.get('updation', 'N/A') or 'N/A').replace('\n', ' ').replace('\t', ' ').strip()
            quantity = str(log.get('updated_quantity', 'N/A') or 'N/A').replace('\n', ' ').replace('\t', ' ').strip()
            
            # Format as tuple
            log_entry = f"({date} | {engineer} | {location} | {peta_location} | {updation} | {quantity})"
            logs_entries.append(log_entry)
        
        # Limit the number of log entries to prevent token overflow
        # if len(logs_entries) > 50:
        #     logs_entries = logs_entries[:50]
        #     logger.info(f"Limited logs to 50 entries for token efficiency")
        
        logs_context = "\n".join(logs_entries)
        
        print(logs_context) 
        print("\n")
        print("\n")
        
        # Create the prompt with clear JSON format instruction
        prompt = f"""Here are the log entries from the construction site:
        {logs_context}
        
        User's question: {user_query}

        INSTRUCTIONS:
        - Analyze the log data above
        - Provide a factual answer based only on the given data
        - Respond in this EXACT JSON format: {{"result": "your answer"}}
        - Keep the answer concise and precise
        - If question is unrelated to logs, respond: {{"result": "You can ask about all construction site updates from the log data"}}
        """ 
        
        # Get the response from the agent with error handling
        agent = get_log_agent(groq_api_key)
        
        # Try to get response with fallback
        try:
            response = agent.run(prompt)
            if response and hasattr(response, 'content') and hasattr(response.content, 'result'):
                return response.content.result
            # else:
            #     logger.warning("Response structure is invalid, using fallback")
            #     return generate_fallback_response(logs_data, user_query, site_engineer_name)
                
        except Exception as agent_error:
            logger.error(f"Agent processing failed: {str(agent_error)}")
            return generate_fallback_response(logs_data, user_query, site_engineer_name)
        
    except Exception as e:
        logger.error(f"Error processing logs query: {str(e)}")
        return "I'm sorry, I encountered an error while processing your request. Please try again later."
