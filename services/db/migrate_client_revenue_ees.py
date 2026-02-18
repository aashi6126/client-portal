"""
Migration: Add gross_revenue and total_ees columns to clients table.
Run once: python services/db/migrate_client_revenue_ees.py
"""

import os
import sqlite3

DB_PATH = os.environ.get('DATABASE_PATH',
    os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'customer.db'))


def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if the clients table exists at all
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='clients'")
    if not cursor.fetchone():
        print("Table 'clients' does not exist — run the API server first to create tables.")
        print("  python services/api/customer_api.py")
        conn.close()
        return

    # Check existing columns
    cursor.execute("PRAGMA table_info(clients)")
    columns = [col[1] for col in cursor.fetchall()]

    if 'gross_revenue' not in columns:
        cursor.execute("ALTER TABLE clients ADD COLUMN gross_revenue DECIMAL(15, 2)")
        print("Added 'gross_revenue' column to clients table")
    else:
        print("Column 'gross_revenue' already exists — skipping")

    if 'total_ees' not in columns:
        cursor.execute("ALTER TABLE clients ADD COLUMN total_ees INTEGER")
        print("Added 'total_ees' column to clients table")
    else:
        print("Column 'total_ees' already exists — skipping")

    conn.commit()
    conn.close()


if __name__ == '__main__':
    migrate()
