"""
Migration: Add status column to clients table.
Run once: python services/db/migrate_client_status.py
"""

import os
import sqlite3

DB_PATH = os.environ.get('DATABASE_PATH',
    os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'customer.db'))


def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if column already exists
    cursor.execute("PRAGMA table_info(clients)")
    columns = [col[1] for col in cursor.fetchall()]

    if 'status' not in columns:
        cursor.execute("ALTER TABLE clients ADD COLUMN status VARCHAR(50) DEFAULT 'Active'")
        # Set all existing clients to Active
        cursor.execute("UPDATE clients SET status = 'Active' WHERE status IS NULL")
        conn.commit()
        print("Added 'status' column to clients table (default: Active)")
    else:
        print("Column 'status' already exists in clients table — skipping")

    conn.close()


if __name__ == '__main__':
    migrate()
