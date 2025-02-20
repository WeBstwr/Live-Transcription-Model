import os
import psycopg2
from dotenv import load_dotenv


load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("No DATABASE_URL found in environment variables")

def connect_db():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        print("✅ Database connected successfully!")
        return conn
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        return None
