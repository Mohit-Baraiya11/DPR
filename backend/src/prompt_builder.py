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
    result: str

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
        markdown=True,
        response_model=LogQueryResult,
        retries=5,
        add_datetime_to_instructions=True,
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
    
    Args:
        logs_data: List of log entries as dictionaries
        user_query: The user's query about the logs
        
    Returns:
        str: The response to the user's query
    """
    try:
        # Format the logs data for the prompt
        logs_context = "\n".join([
            f"Time: {log.get('time', 'N/A')}\n"
            f"Site Engineer: {log.get('site_engineer_name', 'N/A')}\n"
            f"Location: {log.get('Location', 'N/A')}, {log.get('Sub Location', 'N/A')}\n"
            f"Peta Location: {log.get('Peta Location', 'N/A')}, Category: {log.get('Category', 'N/A')}\n"
            f"Updation: {log.get('updation', 'N/A')}\n"
            f"Requested Quantity: {log.get('requested_quantity', 'N/A')}\n"
            f"Updated Quantity: {log.get('updated_quantity', 'N/A')}\n"
            f"User Query: {log.get('user_query', 'N/A')}\n"
            f"Feedback: {log.get('feedback', 'N/A')}\n"
            f"Updated Cell: {log.get('updated_cell', 'N/A')}\n"
            "-" * 50
            for log in logs_data
        ])
        
        # Create the prompt with the logs context and user query
        prompt = f"""Here are the log entries:
        
{logs_context}

User's question: {user_query}

The user asking the question is: {site_engineer_name}

Please provide a clear and concise response based on the log data above."""
        
        # Get the response from the agent
        agent = get_log_agent(groq_api_key)
        response = agent.run(prompt)
        return response.content.result
        
    except Exception as e:
        logger.error(f"Error processing logs query: {str(e)}")
        return "I'm sorry, I encountered an error while processing your request. Please try again later."

