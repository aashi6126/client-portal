"""
Migration script to add missing flag, remarks, and outstanding_item columns 
to the employee_benefits table.
"""

import sqlite3
import os

def migrate_database(db_path):
    print(f"Migrating database: {db_path}")
    
    if not os.path.exists(db_path):
        print(f"Database file not found: {db_path}")
        return False
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # List of columns to add
    columns_to_add = [
        # Flag columns
        ("ltd_flag", "BOOLEAN DEFAULT 0"),
        ("std_flag", "BOOLEAN DEFAULT 0"),
        ("k401_flag", "BOOLEAN DEFAULT 0"),
        ("critical_illness_flag", "BOOLEAN DEFAULT 0"),
        ("accident_flag", "BOOLEAN DEFAULT 0"),
        ("hospital_flag", "BOOLEAN DEFAULT 0"),
        ("voluntary_life_flag", "BOOLEAN DEFAULT 0"),
        
        # Remarks columns
        ("ltd_remarks", "TEXT"),
        ("std_remarks", "TEXT"),
        ("k401_remarks", "TEXT"),
        ("critical_illness_remarks", "TEXT"),
        ("accident_remarks", "TEXT"),
        ("hospital_remarks", "TEXT"),
        ("voluntary_life_remarks", "TEXT"),
        
        # Outstanding item columns
        ("ltd_outstanding_item", "VARCHAR(50)"),
        ("std_outstanding_item", "VARCHAR(50)"),
        ("k401_outstanding_item", "VARCHAR(50)"),
        ("critical_illness_outstanding_item", "VARCHAR(50)"),
        ("accident_outstanding_item", "VARCHAR(50)"),
        ("hospital_outstanding_item", "VARCHAR(50)"),
        ("voluntary_life_outstanding_item", "VARCHAR(50)"),
    ]
    
    # Check which columns already exist
    cursor.execute("PRAGMA table_info(employee_benefits)")
    existing_columns = {row[1] for row in cursor.fetchall()}
    
    # Add missing columns
    added_count = 0
    for column_name, column_type in columns_to_add:
        if column_name not in existing_columns:
            try:
                sql = f"ALTER TABLE employee_benefits ADD COLUMN {column_name} {column_type}"
                print(f"Adding column: {column_name}")
                cursor.execute(sql)
                added_count += 1
            except sqlite3.OperationalError as e:
                print(f"Error adding column {column_name}: {e}")
        else:
            print(f"Column {column_name} already exists, skipping")
    
    conn.commit()
    conn.close()
    
    print(f"\nMigration complete! Added {added_count} columns.")
    return True

if __name__ == "__main__":
    # Find and migrate all database files
    base_dir = os.path.dirname(os.path.abspath(__file__))
    services_dir = os.path.dirname(base_dir)
    
    # List of potential database files
    db_files = [
        os.path.join(services_dir, "customer.db"),
        os.path.join(base_dir, "clients.db"),
    ]
    
    print("=" * 60)
    print("Employee Benefits Table Migration")
    print("=" * 60)
    print()
    
    migrated = False
    for db_file in db_files:
        if os.path.exists(db_file):
            migrate_database(db_file)
            migrated = True
            print()
    
    if not migrated:
        print("No database files found!")
        print("Expected locations:")
        for db_file in db_files:
            print(f"  - {db_file}")
