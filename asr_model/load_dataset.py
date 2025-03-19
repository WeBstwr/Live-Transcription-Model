import os
import csv
from config import connect_db

CSV_FILE = "audio_text_pairs.csv"

def load_csv_data(csv_file):
    data = []
    with open(csv_file, newline='', encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            data.append(row)
    return data

def save_dataset_to_db():
    data = load_csv_data(CSV_FILE)
    if not data:
        print("❌ No data found in CSV file.")
        return

    conn = connect_db()
    if not conn:
        print("❌ Database connection failed.")
        return

    cursor = conn.cursor()
    # Optionally, create a new table if needed (or update the existing one)
    create_table_query = """
    CREATE TABLE IF NOT EXISTS luhya_family_dataset (
        id SERIAL PRIMARY KEY,
        relationship TEXT NOT NULL,
        maragoli TEXT NOT NULL,
        notes TEXT,
        example_sentence TEXT,
        filename TEXT NOT NULL,
        transcription TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """
    cursor.execute(create_table_query)
    conn.commit()

    for row in data:
        cursor.execute("""
            INSERT INTO luhya_family_dataset (relationship, maragoli, notes, example_sentence, filename, transcription)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (row["Relationship"], row["Maragoli"], row["Notes"], row["Example Sentence (English)"], row["filename"], row["transcript"]))
    conn.commit()
    cursor.close()
    conn.close()
    print("✅ CSV dataset loaded into database.")

if __name__ == "__main__":
    save_dataset_to_db()
