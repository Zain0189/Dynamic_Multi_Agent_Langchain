import os

from dotenv import load_dotenv
from groq import Groq

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is missing. Please set it in backend/.env")

client = Groq(api_key=GROQ_API_KEY)
models = client.models.list()
for model in models.data:
    print(model.id)
