from config import connect_db

def test_connection():
    conn = connect_db()
    if conn:
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        db_version = cursor.fetchone()
        print("PostgreSQL version:", db_version)
        cursor.close()
        conn.close()

if __name__ == "__main__":
    test_connection()
