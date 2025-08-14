from agno.agent import Agent
from agno.models.groq import Groq
from utils.logger import get_logger
from pydantic import BaseModel, Field
from dotenv import load_dotenv 
from .config import SYSTEM_PROMPT
import os

load_dotenv()

logger = get_logger(__name__)


class SupportResult(BaseModel):
    row_index: list[str]
    columns_index: list[str] 
    updations: list[str]
    quantities: list[int]
    feedbacks: list[str] 

support_agent = Agent(
    model=Groq(id="meta-llama/llama-4-scout-17b-16e-instruct", api_key=os.getenv("GROQ_API_KEY")),
    system_message=SYSTEM_PROMPT,
    markdown=False,
    response_model=SupportResult,
    retries=10,
    add_datetime_to_instructions=True,
)

def process_user_query(user_query):
    output =  support_agent.run(user_query)
    return ( 
        output.content.row_index,
        output.content.columns_index,
        output.content.updations,
        output.content.quantities,
        output.content.feedbacks
    )

