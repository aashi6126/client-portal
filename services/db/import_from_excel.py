#!/usr/bin/env python3
"""
Excel Import Script for Client Portal Database
Reads Data Sheet.xlsx and populates the 3-table database structure.
Uses SQLAlchemy to support both SQLite and PostgreSQL.
"""

import pandas as pd
from datetime import datetime
from dateutil.parser import parse
import os
import sys

from sqlalchemy import create_engine, text

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

DATABASE_URI = os.environ.get('DATABASE_URI', 'postgresql://localhost/client_portal')
EXCEL_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'webapp', 'customer-app', 'Data Sheet.xlsx')
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), 'schema.sql')


def parse_date(date_value):
    """Parse date value to YYYY-MM-DD string format for database insertion."""
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


def initialize_database(engine):
    """Create database tables from schema file."""
    print("Initializing database from schema...")

    with open(SCHEMA_PATH, 'r') as f:
        schema_sql = f.read()

    with engine.connect() as conn:
        for statement in schema_sql.split(';'):
            statement = statement.strip()
            if statement:
                conn.execute(text(statement))
        conn.commit()

    print("Database initialized successfully")


def import_clients(engine):
    """Import Clients sheet."""
    print("\n=== Importing Clients ===")

    df = pd.read_excel(EXCEL_PATH, sheet_name='Clients', header=1)
    print(f"Found {len(df)} client records")

    column_map = {
        'Tax ID': 'tax_id',
        'Client Name ': 'client_name',
        'Contact Person': 'contact_person',
        'Email': 'email',
        ' Phone Number': 'phone_number',
        'Address Line 1': 'address_line_1',
        'Address Line 2': 'address_line_2',
        'City': 'city',
        'State': 'state',
        'Zip Code': 'zip_code'
    }

    inserted = 0

    with engine.connect() as conn:
        for idx, row in df.iterrows():
            try:
                data = {}
                for excel_col, db_col in column_map.items():
                    if excel_col in row:
                        data[db_col] = clean_value(row[excel_col])

                columns = ', '.join(data.keys())
                placeholders = ', '.join([f':{k}' for k in data.keys()])
                sql = f"INSERT INTO clients ({columns}) VALUES ({placeholders})"

                conn.execute(text(sql), data)
                inserted += 1
                print(f"  Inserted client: {data.get('client_name', 'Unknown')} (Tax ID: {data.get('tax_id', 'N/A')})")

            except Exception as e:
                print(f"  Error inserting row {idx}: {e}")

        conn.commit()

    print(f"Imported {inserted}/{len(df)} clients successfully")
    return inserted


def import_employee_benefits(engine):
    """Import Employee Benefits sheet."""
    print("\n=== Importing Employee Benefits ===")

    df = pd.read_excel(EXCEL_PATH, sheet_name='Employee Benefits', header=1)
    print(f"Found {len(df)} employee benefit records")

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
        'Employee Contribution': 'employee_contribution'
    }

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

    inserted = 0

    with engine.connect() as conn:
        for idx, row in df.iterrows():
            try:
                data = {}

                for excel_col, db_col in column_map.items():
                    if excel_col in row:
                        if db_col == 'renewal_date':
                            data[db_col] = parse_date(row[excel_col])
                        elif db_col == 'num_employees_at_renewal':
                            val = row[excel_col]
                            data[db_col] = int(val) if not pd.isna(val) and val != '' else None
                        else:
                            data[db_col] = clean_value(row[excel_col])

                for plan_name, plan_prefix in benefit_plans:
                    renewal_col = f"{plan_name} Renewal Date"
                    carrier_col = f"{plan_name} Carrier"

                    if renewal_col in row:
                        data[f"{plan_prefix}_renewal_date"] = parse_date(row[renewal_col])
                    if carrier_col in row:
                        data[f"{plan_prefix}_carrier"] = clean_value(row[carrier_col])

                tax_id = data.get('tax_id')
                if not tax_id:
                    print(f"  Row {idx}: Missing Tax ID")
                    continue

                result = conn.execute(text("SELECT id FROM clients WHERE tax_id = :tax_id"), {"tax_id": tax_id})
                if not result.fetchone():
                    print(f"  Row {idx}: Tax ID {tax_id} not found in clients table")
                    continue

                columns = ', '.join(data.keys())
                placeholders = ', '.join([f':{k}' for k in data.keys()])
                sql = f"INSERT INTO employee_benefits ({columns}) VALUES ({placeholders})"

                conn.execute(text(sql), data)
                inserted += 1
                print(f"  Inserted employee benefit for Tax ID: {tax_id}")

            except Exception as e:
                print(f"  Error inserting row {idx}: {e}")

        conn.commit()

    print(f"Imported {inserted}/{len(df)} employee benefit records successfully")
    return inserted


def import_commercial_insurance(engine):
    """Import Commercial Insurance sheet."""
    print("\n=== Importing Commercial Insurance ===")

    df = pd.read_excel(EXCEL_PATH, sheet_name='Commercial', header=1)
    print(f"Found {len(df)} commercial insurance records")

    core_fields = {
        'Tax ID': 'tax_id',
        ' Remarks ': 'remarks',
        ' Status ': 'status'
    }

    products = [
        ('', 'general_liability'),
        ('.1', 'property'),
        ('.2', 'bop'),
        ('.3', 'umbrella'),
        ('.4', 'workers_comp'),
        ('.5', 'professional_eo'),
        ('.6', 'cyber'),
        ('.7', 'auto'),
        ('.8', 'epli'),
        ('.9', 'nydbl'),
        ('.10', 'surety'),
        ('.11', 'product_liability'),
        ('.12', 'flood'),
        ('.13', 'crime'),
        ('.14', 'directors_officers'),
        ('.15', 'fiduciary'),
        ('.16', 'inland_marine')
    ]

    inserted = 0

    with engine.connect() as conn:
        for idx, row in df.iterrows():
            try:
                data = {}

                for excel_col, db_col in core_fields.items():
                    if excel_col in row:
                        data[db_col] = clean_value(row[excel_col])

                for col_suffix, product_prefix in products:
                    carrier_col = f"Carrier{col_suffix}"
                    agency_col = f"Agency{col_suffix}"
                    limit_col = f"Limit{col_suffix}"
                    premium_col = f"Premium{col_suffix}"
                    renewal_col = f"Renewal Date{col_suffix}"

                    if carrier_col in row:
                        data[f"{product_prefix}_carrier"] = clean_value(row[carrier_col])
                    if agency_col in row:
                        data[f"{product_prefix}_agency"] = clean_value(row[agency_col])
                    if limit_col in row:
                        data[f"{product_prefix}_limit"] = clean_value(row[limit_col])
                    if premium_col in row:
                        val = row[premium_col]
                        if not pd.isna(val) and val != '':
                            try:
                                val_str = str(val).replace('$', '').replace(',', '').strip()
                                data[f"{product_prefix}_premium"] = float(val_str) if val_str else None
                            except:
                                data[f"{product_prefix}_premium"] = None
                        else:
                            data[f"{product_prefix}_premium"] = None
                    if renewal_col in row:
                        data[f"{product_prefix}_renewal_date"] = parse_date(row[renewal_col])

                tax_id = data.get('tax_id')
                if not tax_id:
                    print(f"  Row {idx}: Missing Tax ID")
                    continue

                result = conn.execute(text("SELECT id FROM clients WHERE tax_id = :tax_id"), {"tax_id": tax_id})
                if not result.fetchone():
                    print(f"  Row {idx}: Tax ID {tax_id} not found in clients table")
                    continue

                columns = ', '.join(data.keys())
                placeholders = ', '.join([f':{k}' for k in data.keys()])
                sql = f"INSERT INTO commercial_insurance ({columns}) VALUES ({placeholders})"

                conn.execute(text(sql), data)
                inserted += 1
                print(f"  Inserted commercial insurance for Tax ID: {tax_id}")

            except Exception as e:
                print(f"  Error inserting row {idx}: {e}")

        conn.commit()

    print(f"Imported {inserted}/{len(df)} commercial insurance records successfully")
    return inserted


def print_summary(engine):
    """Print summary of imported data."""
    print("\n" + "="*50)
    print("IMPORT SUMMARY")
    print("="*50)

    with engine.connect() as conn:
        client_count = conn.execute(text("SELECT COUNT(*) FROM clients")).scalar()
        print(f"Total Clients: {client_count}")

        benefits_count = conn.execute(text("SELECT COUNT(*) FROM employee_benefits")).scalar()
        print(f"Total Employee Benefits: {benefits_count}")

        commercial_count = conn.execute(text("SELECT COUNT(*) FROM commercial_insurance")).scalar()
        print(f"Total Commercial Insurance: {commercial_count}")

        no_benefits = conn.execute(text("""
            SELECT COUNT(*) FROM clients c
            LEFT JOIN employee_benefits eb ON c.tax_id = eb.tax_id
            WHERE eb.id IS NULL
        """)).scalar()

        no_commercial = conn.execute(text("""
            SELECT COUNT(*) FROM clients c
            LEFT JOIN commercial_insurance ci ON c.tax_id = ci.tax_id
            WHERE ci.id IS NULL
        """)).scalar()

        print(f"\nCross-sell Opportunities:")
        print(f"  - Clients without Employee Benefits: {no_benefits}")
        print(f"  - Clients without Commercial Insurance: {no_commercial}")

    print("="*50)


def main():
    """Main import process."""
    print("="*50)
    print("CLIENT PORTAL DATABASE IMPORT")
    print("="*50)

    if not os.path.exists(EXCEL_PATH):
        print(f"Error: Excel file not found at {EXCEL_PATH}")
        return

    if not os.path.exists(SCHEMA_PATH):
        print(f"Error: Schema file not found at {SCHEMA_PATH}")
        return

    print(f"Excel file: {EXCEL_PATH}")
    print(f"Database URI: {DATABASE_URI}")
    print(f"Schema file: {SCHEMA_PATH}")

    engine = create_engine(DATABASE_URI)

    try:
        # Initialize database
        initialize_database(engine)
        import_clients(engine)
        import_employee_benefits(engine)
        import_commercial_insurance(engine)
        print_summary(engine)
        print("\n Import completed successfully!")

    except Exception as e:
        print(f"\n Import failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
