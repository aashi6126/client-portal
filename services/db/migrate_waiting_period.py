"""
Migration script: Add waiting_period column to benefit_plans table.

Run this ONCE after adding the waiting period feature.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'customer.db')


def column_exists(cursor, table, column):
    cursor.execute(f"PRAGMA table_info({table})")
    columns = [row[1] for row in cursor.fetchall()]
    return column in columns


def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    changes = 0

    if not column_exists(cursor, 'benefit_plans', 'waiting_period'):
        cursor.execute('ALTER TABLE benefit_plans ADD COLUMN waiting_period VARCHAR(100)')
        print("  Added waiting_period to benefit_plans")
        changes += 1

    conn.commit()
    print(f"\nWaiting period migration complete: {changes} columns added")
    conn.close()


if __name__ == '__main__':
    migrate()
