"""
Migration script to add the feedback table.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'customer.db')

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if feedback table already exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='feedback'")
    if cursor.fetchone():
        print("feedback table already exists, skipping.")
        conn.close()
        return

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type VARCHAR(50) NOT NULL DEFAULT 'Bug',
            subject VARCHAR(200) NOT NULL,
            description TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'New',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status)")

    conn.commit()
    print("Created feedback table successfully.")
    conn.close()


if __name__ == '__main__':
    migrate()
