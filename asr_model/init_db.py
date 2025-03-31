from config import connect_db

def create_tables():
    conn = connect_db()
    if conn:
        cursor = conn.cursor()
        create_table_query = """
        CREATE TABLE IF NOT EXISTS audio_transcriptions (
            id SERIAL PRIMARY KEY,
            filename TEXT NOT NULL,
            transcription TEXT NOT NULL,
            translation TEXT,  -- Added translation column
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        cursor.execute(create_table_query)
        conn.commit()
        cursor.close()
        conn.close()
        print("✅ Tables created successfully!")
    else:
        print("❌ Could not connect to the database.")

if __name__ == "__main__":
    create_tables()
