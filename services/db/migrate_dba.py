"""
Migration: Add DBA column to clients table.

Adds:
- clients.dba VARCHAR(200)

Run: python migrate_dba.py
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'customer.db')


def table_exists(cursor, table):
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
    return cursor.fetchone() is not None


def column_exists(cursor, table, column):
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    if table_exists(cursor, 'clients'):
        if not column_exists(cursor, 'clients', 'dba'):
            cursor.execute("ALTER TABLE clients ADD COLUMN dba VARCHAR(200)")
            print("Added dba to clients")
        else:
            print("clients.dba already exists")
    else:
        print("Skipping clients (table does not exist yet — will be created by API)")

    conn.commit()
    conn.close()
    print("\nMigration complete.")


if __name__ == '__main__':
    migrate()
