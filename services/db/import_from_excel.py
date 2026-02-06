#!/usr/bin/env python3
"""
Excel Import Script for Client Portal Database
Reads Data Sheet.xlsx and populates the 3-table database structure
"""

import pandas as pd
import sqlite3
from datetime import datetime
from dateutil.parser import parse
import os
import sys

# Add parent directory to path to import from customer_api
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

DATABASE_PATH = os.path.join(os.path.dirname(__file__), '..', 'customer.db')
EXCEL_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'webapp', 'customer-app', 'Data Sheet.xlsx')
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), 'schema.sql')


def parse_date(date_value):
    """Parse date value to YYYY-MM-DD string format for SQLite."""
    if pd.isna(date_value) or date_value == '' or date_value is None:
        return None

    # If it's already a datetime object
    if isinstance(date_value, datetime):
        return date_value.strftime('%Y-%m-%d')

    # If it's a string, try to parse it
    if isinstance(date_value, str):
        try:
            return parse(date_value).strftime('%Y-%m-%d')
        except:
            return None

    return None


def clean_value(value):
    """Clean value for database insertion."""
    if pd.isna(value) or value == '':
        return None
    return str(value).strip()


def initialize_database():
    """Create database from schema file."""
    print("Initializing database from schema...")

    # Read schema file
    with open(SCHEMA_PATH, 'r') as f:
        schema_sql = f.read()

    # Delete existing database if it exists
    if os.path.exists(DATABASE_PATH):
        backup_path = DATABASE_PATH + '.old'
        if os.path.exists(backup_path):
            os.remove(backup_path)
        os.rename(DATABASE_PATH, backup_path)
        print(f"Existing database backed up to {backup_path}")

    # Create new database with schema
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.executescript(schema_sql)
    conn.commit()
    conn.close()

    print("Database initialized successfully")


def import_clients(conn):
    """Import Clients sheet."""
    print("\n=== Importing Clients ===")

    # Read Clients sheet - skip first row (title), use second row as headers
    df = pd.read_excel(EXCEL_PATH, sheet_name='Clients', header=1)
    print(f"Found {len(df)} client records")

    # Column mapping: Excel column name -> Database column name
    # Note: Some Excel columns have trailing spaces
    column_map = {
        'Tax ID': 'tax_id',
        'Client Name ': 'client_name',  # Note: trailing space in Excel
        'Contact Person': 'contact_person',
        'Email': 'email',
        ' Phone Number': 'phone_number',  # Note: leading space in Excel
        'Address Line 1': 'address_line_1',
        'Address Line 2': 'address_line_2',
        'City': 'city',
        'State': 'state',
        'Zip Code': 'zip_code'
    }

    cursor = conn.cursor()
    inserted = 0

    for idx, row in df.iterrows():
        try:
            # Build insert data
            data = {}
            for excel_col, db_col in column_map.items():
                if excel_col in row:
                    data[db_col] = clean_value(row[excel_col])

            # Insert client
            columns = ', '.join(data.keys())
            placeholders = ', '.join(['?' for _ in data])
            sql = f"INSERT INTO clients ({columns}) VALUES ({placeholders})"

            cursor.execute(sql, list(data.values()))
            inserted += 1
            print(f"  ✓ Inserted client: {data.get('client_name', 'Unknown')} (Tax ID: {data.get('tax_id', 'N/A')})")

        except Exception as e:
            print(f"  ✗ Error inserting row {idx}: {e}")

    conn.commit()
    print(f"Imported {inserted}/{len(df)} clients successfully")
    return inserted


def import_employee_benefits(conn):
    """Import Employee Benefits sheet."""
    print("\n=== Importing Employee Benefits ===")

    # Read Employee Benefits sheet - skip first row (title), use second row as headers
    df = pd.read_excel(EXCEL_PATH, sheet_name='Employee Benefits', header=1)
    print(f"Found {len(df)} employee benefit records")

    # Column mapping for core fields
    # Note: Some Excel columns have trailing/leading spaces
    column_map = {
        'Tax ID': 'tax_id',
        'Form Fire Code': 'form_fire_code',
        'Enrollment POC': 'enrollment_poc',
        'Renewal Date': 'renewal_date',
        'Funding': 'funding',
        'Current Carrier': 'current_carrier',
        '# of Employees at Renewal': 'num_employees_at_renewal',
        'Waiting Period': 'waiting_period',
        'Deductible Accumulation': 'deductible_accumulation',
        'Previous Carrier': 'previous_carrier',
        'Cobra Administrator': 'cobra_carrier',
        'Employer Contribution %': 'employer_contribution',
        'Employee Contribution %': 'employee_contribution'
    }

    # Benefit plan fields (renewal date + carrier for each)
    benefit_plans = [
        ('Dental', 'dental'),
        ('Vision', 'vision'),
        ('Life & AD&D', 'life_adnd'),
        ('LTD', 'ltd'),
        ('STD', 'std'),
        ('401K', 'k401'),
        ('Critical Illness', 'critical_illness'),
        ('Accident', 'accident'),
        ('Hospital', 'hospital'),
        ('Voluntary Life', 'voluntary_life')
    ]

    cursor = conn.cursor()
    inserted = 0

    for idx, row in df.iterrows():
        try:
            data = {}

            # Process core fields
            for excel_col, db_col in column_map.items():
                if excel_col in row:
                    if db_col == 'renewal_date':
                        data[db_col] = parse_date(row[excel_col])
                    elif db_col == 'num_employees_at_renewal':
                        val = row[excel_col]
                        data[db_col] = int(val) if not pd.isna(val) and val != '' else None
                    else:
                        data[db_col] = clean_value(row[excel_col])

            # Process benefit plans
            for plan_name, plan_prefix in benefit_plans:
                renewal_col = f"{plan_name} Renewal Date"
                carrier_col = f"{plan_name} Carrier"

                if renewal_col in row:
                    data[f"{plan_prefix}_renewal_date"] = parse_date(row[renewal_col])
                if carrier_col in row:
                    data[f"{plan_prefix}_carrier"] = clean_value(row[carrier_col])

            # Verify tax_id exists in clients
            tax_id = data.get('tax_id')
            if not tax_id:
                print(f"  ✗ Row {idx}: Missing Tax ID")
                continue

            cursor.execute("SELECT id FROM clients WHERE tax_id = ?", (tax_id,))
            if not cursor.fetchone():
                print(f"  ✗ Row {idx}: Tax ID {tax_id} not found in clients table")
                continue

            # Insert benefit record
            columns = ', '.join(data.keys())
            placeholders = ', '.join(['?' for _ in data])
            sql = f"INSERT INTO employee_benefits ({columns}) VALUES ({placeholders})"

            cursor.execute(sql, list(data.values()))
            inserted += 1
            print(f"  ✓ Inserted employee benefit for Tax ID: {tax_id}")

        except Exception as e:
            print(f"  ✗ Error inserting row {idx}: {e}")

    conn.commit()
    print(f"Imported {inserted}/{len(df)} employee benefit records successfully")
    return inserted


def import_commercial_insurance(conn):
    """Import Commercial Insurance sheet."""
    print("\n=== Importing Commercial Insurance ===")

    # Read Commercial sheet - skip first row (title), use second row as headers
    df = pd.read_excel(EXCEL_PATH, sheet_name='Commercial', header=1)
    print(f"Found {len(df)} commercial insurance records")

    # Core fields
    # Note: Some Excel columns have trailing/leading spaces
    core_fields = {
        'Tax ID': 'tax_id',
        ' Remarks ': 'remarks',  # Note: leading and trailing spaces in Excel
        ' Status ': 'status'  # Note: leading and trailing spaces in Excel
    }

    # 17 insurance product types with their column suffixes
    # The Excel has Carrier, Carrier.1, Carrier.2, etc.
    products = [
        ('', 'general_liability'),           # Carrier, Limit, Premium, Renewal Date
        ('.1', 'property'),                  # Carrier.1, Limit.1, Premium.1, Renewal Date.1
        ('.2', 'bop'),                       # Carrier.2, Limit.2, Premium.2, Renewal Date.2
        ('.3', 'umbrella'),                  # Carrier.3, Limit.3, Premium.3, Renewal Date.3
        ('.4', 'workers_comp'),              # Carrier.4, Limit.4, Premium.4, Renewal Date.4
        ('.5', 'professional_eo'),           # Carrier.5, Limit.5, Premium.5, Renewal Date.5
        ('.6', 'cyber'),                     # Carrier.6, Limit.6, Premium.6, Renewal Date.6
        ('.7', 'auto'),                      # Carrier.7, Limit.7, Premium.7, Renewal Date.7
        ('.8', 'epli'),                      # Carrier.8, Limit.8, Premium.8, Renewal Date.8
        ('.9', 'nydbl'),                     # Carrier.9, Limit.9, Premium.9, Renewal Date.9
        ('.10', 'surety'),                   # Carrier.10, Limit.10, Premium.10, Renewal Date.10
        ('.11', 'product_liability'),        # Carrier.11, Limit.11, Premium.11, Renewal Date.11
        ('.12', 'flood'),                    # Carrier.12, Limit.12, Premium.12, Renewal Date.12
        ('.13', 'crime'),                    # Carrier.13, Limit.13, Premium.13, Renewal Date.13
        ('.14', 'directors_officers'),       # Carrier.14, Limit.14, Premium.14, Renewal Date.14
        ('.15', 'fiduciary'),                # Carrier.15, Limit.15, Premium.15, Renewal Date.15
        ('.16', 'inland_marine')             # Carrier.16, Limit.16, Premium.16, Renewal Date.16
    ]

    cursor = conn.cursor()
    inserted = 0

    for idx, row in df.iterrows():
        try:
            data = {}

            # Process core fields
            for excel_col, db_col in core_fields.items():
                if excel_col in row:
                    data[db_col] = clean_value(row[excel_col])

            # Process insurance products
            # Excel structure: Carrier, Limit, Premium, Renewal Date (then .1, .2, .3, etc.)
            for col_suffix, product_prefix in products:
                carrier_col = f"Carrier{col_suffix}"
                limit_col = f"Limit{col_suffix}"
                premium_col = f"Premium{col_suffix}"
                renewal_col = f"Renewal Date{col_suffix}"

                if carrier_col in row:
                    data[f"{product_prefix}_carrier"] = clean_value(row[carrier_col])
                if limit_col in row:
                    data[f"{product_prefix}_limit"] = clean_value(row[limit_col])
                if premium_col in row:
                    val = row[premium_col]
                    if not pd.isna(val) and val != '':
                        # Remove $ and commas, convert to float
                        try:
                            val_str = str(val).replace('$', '').replace(',', '').strip()
                            data[f"{product_prefix}_premium"] = float(val_str) if val_str else None
                        except:
                            data[f"{product_prefix}_premium"] = None
                    else:
                        data[f"{product_prefix}_premium"] = None
                if renewal_col in row:
                    data[f"{product_prefix}_renewal_date"] = parse_date(row[renewal_col])

            # Verify tax_id exists in clients
            tax_id = data.get('tax_id')
            if not tax_id:
                print(f"  ✗ Row {idx}: Missing Tax ID")
                continue

            cursor.execute("SELECT id FROM clients WHERE tax_id = ?", (tax_id,))
            if not cursor.fetchone():
                print(f"  ✗ Row {idx}: Tax ID {tax_id} not found in clients table")
                continue

            # Insert commercial record
            columns = ', '.join(data.keys())
            placeholders = ', '.join(['?' for _ in data])
            sql = f"INSERT INTO commercial_insurance ({columns}) VALUES ({placeholders})"

            cursor.execute(sql, list(data.values()))
            inserted += 1
            print(f"  ✓ Inserted commercial insurance for Tax ID: {tax_id}")

        except Exception as e:
            print(f"  ✗ Error inserting row {idx}: {e}")

    conn.commit()
    print(f"Imported {inserted}/{len(df)} commercial insurance records successfully")
    return inserted


def print_summary(conn):
    """Print summary of imported data."""
    print("\n" + "="*50)
    print("IMPORT SUMMARY")
    print("="*50)

    cursor = conn.cursor()

    # Count clients
    cursor.execute("SELECT COUNT(*) FROM clients")
    client_count = cursor.fetchone()[0]
    print(f"Total Clients: {client_count}")

    # Count employee benefits
    cursor.execute("SELECT COUNT(*) FROM employee_benefits")
    benefits_count = cursor.fetchone()[0]
    print(f"Total Employee Benefits: {benefits_count}")

    # Count commercial insurance
    cursor.execute("SELECT COUNT(*) FROM commercial_insurance")
    commercial_count = cursor.fetchone()[0]
    print(f"Total Commercial Insurance: {commercial_count}")

    # Cross-sell opportunities
    cursor.execute("""
        SELECT COUNT(*) FROM clients c
        LEFT JOIN employee_benefits eb ON c.tax_id = eb.tax_id
        WHERE eb.id IS NULL
    """)
    no_benefits = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(*) FROM clients c
        LEFT JOIN commercial_insurance ci ON c.tax_id = ci.tax_id
        WHERE ci.id IS NULL
    """)
    no_commercial = cursor.fetchone()[0]

    print(f"\nCross-sell Opportunities:")
    print(f"  - Clients without Employee Benefits: {no_benefits}")
    print(f"  - Clients without Commercial Insurance: {no_commercial}")

    print("="*50)


def main():
    """Main import process."""
    print("="*50)
    print("CLIENT PORTAL DATABASE IMPORT")
    print("="*50)

    # Check if Excel file exists
    if not os.path.exists(EXCEL_PATH):
        print(f"Error: Excel file not found at {EXCEL_PATH}")
        return

    # Check if schema file exists
    if not os.path.exists(SCHEMA_PATH):
        print(f"Error: Schema file not found at {SCHEMA_PATH}")
        return

    print(f"Excel file: {EXCEL_PATH}")
    print(f"Database file: {DATABASE_PATH}")
    print(f"Schema file: {SCHEMA_PATH}")

    # Initialize database
    initialize_database()

    # Connect to database
    conn = sqlite3.connect(DATABASE_PATH)

    try:
        # Import data in order (clients first, then related tables)
        import_clients(conn)
        import_employee_benefits(conn)
        import_commercial_insurance(conn)

        # Print summary
        print_summary(conn)

        print("\n✓ Import completed successfully!")

    except Exception as e:
        print(f"\n✗ Import failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()


if __name__ == "__main__":
    main()
