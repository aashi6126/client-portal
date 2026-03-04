"""
Seed script to generate 2000 mock clients, 2000 employee benefits,
and 2000 commercial policies for load testing.
"""
import sqlite3
import random
import string
from datetime import date, timedelta

DB_PATH = 'customer.db'

# --- Data pools ---
FIRST_NAMES = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda',
               'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
               'Thomas', 'Sarah', 'Christopher', 'Karen', 'Daniel', 'Lisa', 'Matthew', 'Nancy',
               'Anthony', 'Betty', 'Mark', 'Margaret', 'Donald', 'Sandra']

LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
              'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
              'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
              'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson']

COMPANY_SUFFIXES = ['Inc', 'LLC', 'Corp', 'Group', 'Associates', 'Partners', 'Holdings',
                    'Solutions', 'Services', 'Enterprises', 'Technologies', 'Industries',
                    'International', 'Consulting', 'Management']

COMPANY_WORDS = ['Acme', 'Global', 'Pacific', 'Atlantic', 'Summit', 'Pinnacle', 'Prime',
                 'Apex', 'Vertex', 'Horizon', 'Meridian', 'Catalyst', 'Synergy', 'Nexus',
                 'Vanguard', 'Sterling', 'Cardinal', 'Eagle', 'Falcon', 'Phoenix',
                 'Liberty', 'Patriot', 'Guardian', 'Titan', 'Atlas', 'Orion', 'Nova',
                 'Metro', 'Capital', 'Alliance', 'Frontier', 'Heritage', 'Legacy',
                 'Precision', 'Elite', 'Premier', 'Dynamic', 'Infinite', 'United', 'National']

INDUSTRIES = ['Tech', 'Finance', 'Healthcare', 'Construction', 'Retail', 'Manufacturing',
              'Logistics', 'Real Estate', 'Energy', 'Media', 'Legal', 'Education',
              'Food', 'Automotive', 'Aerospace', 'Telecom', 'Insurance', 'Agriculture']

CITIES = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
          'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
          'Fort Worth', 'Columbus', 'Charlotte', 'Indianapolis', 'San Francisco',
          'Seattle', 'Denver', 'Nashville', 'Portland', 'Boston', 'Miami', 'Atlanta',
          'Newark', 'Jersey City', 'Hoboken', 'Edison', 'Trenton', 'Paterson']

STATES = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID',
          'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS',
          'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK',
          'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV',
          'WI', 'WY']

STREETS = ['Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Pine Rd', 'Elm St',
           'Washington Blvd', 'Park Ave', 'Broadway', 'Market St', 'Commerce Dr',
           'Industrial Pkwy', 'Technology Way', 'Corporate Blvd', 'Business Center Dr']

CARRIERS = ['Aetna', 'Cigna', 'UnitedHealthcare', 'Blue Cross Blue Shield', 'Humana',
            'Kaiser Permanente', 'Anthem', 'MetLife', 'Prudential', 'Lincoln Financial',
            'Guardian', 'Hartford', 'Principal', 'Unum', 'Aflac', 'Sun Life',
            'Mutual of Omaha', 'Zurich', 'Travelers', 'Liberty Mutual', 'CNA',
            'Chubb', 'AIG', 'Nationwide', 'State Farm', 'Progressive', 'Allstate',
            'Berkshire Hathaway', 'Hanover', 'Markel']

FUNDING_TYPES = ['Fully Insured', 'Self Funded', 'Level Funded', 'ASO']
WAITING_PERIODS = ['30 days', '60 days', '90 days', 'First of month after hire',
                   'First of month after 30 days', 'First of month after 60 days']


def rand_tax_id():
    return f"{random.randint(10, 99)}-{random.randint(1000000, 9999999)}"


def rand_zip():
    return str(random.randint(0, 99999)).zfill(5)


def rand_phone():
    return f"({random.randint(200, 999)}) {random.randint(200, 999)}-{random.randint(1000, 9999)}"


def rand_email(name):
    domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'company.com', 'business.net']
    clean = name.lower().replace(' ', '.').replace("'", '')
    return f"{clean}@{random.choice(domains)}"


def rand_date(start_year=2025, end_year=2027):
    start = date(start_year, 1, 1)
    end = date(end_year, 12, 31)
    delta = (end - start).days
    return (start + timedelta(days=random.randint(0, delta))).isoformat()


def rand_limit():
    limits = ['$100,000', '$250,000', '$500,000', '$1,000,000', '$2,000,000',
              '$3,000,000', '$5,000,000', '$10,000,000']
    return random.choice(limits)


def rand_premium():
    return round(random.uniform(500, 50000), 2)


def rand_company():
    w1 = random.choice(COMPANY_WORDS)
    w2 = random.choice(INDUSTRIES)
    suffix = random.choice(COMPANY_SUFFIXES)
    return f"{w1} {w2} {suffix}"


def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Generate unique tax IDs
    tax_ids = set()
    while len(tax_ids) < 2000:
        tax_ids.add(rand_tax_id())
    tax_ids = list(tax_ids)

    print("Inserting 2000 mock clients...")
    client_rows = []
    for i, tax_id in enumerate(tax_ids):
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        contact = f"{first} {last}"
        company = rand_company()
        status = random.choice(['Active', 'Prospect'])
        gross_revenue = round(random.uniform(50000, 50000000), 2)
        total_ees = random.randint(5, 5000)
        email = rand_email(contact)
        phone = rand_phone()
        addr1 = f"{random.randint(1, 9999)} {random.choice(STREETS)}"
        addr2 = random.choice(['', '', '', f'Suite {random.randint(100, 999)}', f'Floor {random.randint(1, 30)}'])
        city = random.choice(CITIES)
        state = random.choice(STATES)
        zip_code = rand_zip()

        client_rows.append((
            tax_id, company, contact, email, phone,
            addr1, addr2, city, state, zip_code,
            status, gross_revenue, total_ees
        ))

    cursor.executemany("""
        INSERT INTO clients (tax_id, client_name, contact_person, email, phone_number,
                            address_line_1, address_line_2, city, state, zip_code,
                            status, gross_revenue, total_ees)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, client_rows)
    print(f"  Inserted {len(client_rows)} clients.")

    print("Inserting 2000 mock employee benefits...")
    benefit_rows = []
    for i, tax_id in enumerate(tax_ids):
        parent = random.choice([None, None, None, rand_company()])
        funding = random.choice(FUNDING_TYPES)
        waiting = random.choice(WAITING_PERIODS)
        num_ees = random.randint(5, 2000)
        enrolled = random.randint(3, num_ees)

        benefit_rows.append((
            tax_id, parent, funding,
            random.choice(CARRIERS),  # current_carrier
            num_ees, enrolled, waiting,
            random.choice(['Yes', 'No', None]),  # deductible_accumulation
            random.choice([None] + CARRIERS),  # previous_carrier
            random.choice([None] + CARRIERS),  # cobra_carrier
            random.choice([None, '50%', '75%', '80%', '100%']),  # employee_contribution
            # Single plan types - renewal dates
            rand_date() if random.random() > 0.4 else None,  # ltd
            random.choice(CARRIERS) if random.random() > 0.4 else None,
            rand_date() if random.random() > 0.4 else None,  # std
            random.choice(CARRIERS) if random.random() > 0.4 else None,
            rand_date() if random.random() > 0.5 else None,  # 401k
            random.choice(CARRIERS) if random.random() > 0.5 else None,
            rand_date() if random.random() > 0.6 else None,  # critical illness
            random.choice(CARRIERS) if random.random() > 0.6 else None,
            rand_date() if random.random() > 0.6 else None,  # accident
            random.choice(CARRIERS) if random.random() > 0.6 else None,
            rand_date() if random.random() > 0.6 else None,  # hospital
            random.choice(CARRIERS) if random.random() > 0.6 else None,
            rand_date() if random.random() > 0.6 else None,  # voluntary life
            random.choice(CARRIERS) if random.random() > 0.6 else None,
        ))

    cursor.executemany("""
        INSERT INTO employee_benefits (
            tax_id, parent_client, funding,
            current_carrier, num_employees_at_renewal, enrolled_ees, waiting_period,
            deductible_accumulation, previous_carrier, cobra_carrier, employee_contribution,
            ltd_renewal_date, ltd_carrier,
            std_renewal_date, std_carrier,
            k401_renewal_date, k401_carrier,
            critical_illness_renewal_date, critical_illness_carrier,
            accident_renewal_date, accident_carrier,
            hospital_renewal_date, hospital_carrier,
            voluntary_life_renewal_date, voluntary_life_carrier
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, benefit_rows)
    print(f"  Inserted {len(benefit_rows)} employee benefits.")

    # Get benefit IDs for plan insertion
    cursor.execute("SELECT id, tax_id FROM employee_benefits WHERE tax_id IN ({})".format(
        ','.join('?' * len(tax_ids))), tax_ids)
    benefit_map = {row[1]: row[0] for row in cursor.fetchall()}

    print("Inserting benefit plans (medical, dental, vision, life)...")
    plan_rows = []
    plan_types = ['medical', 'dental', 'vision', 'life_adnd']
    for tax_id in tax_ids:
        ben_id = benefit_map.get(tax_id)
        if not ben_id:
            continue
        for pt in plan_types:
            num_plans = random.choices([1, 2, 3], weights=[60, 30, 10])[0]
            for pn in range(1, num_plans + 1):
                plan_rows.append((
                    ben_id, pt, pn,
                    random.choice(CARRIERS),
                    rand_date(),
                    random.choice(WAITING_PERIODS),
                ))

    cursor.executemany("""
        INSERT INTO benefit_plans (employee_benefit_id, plan_type, plan_number,
                                   carrier, renewal_date, waiting_period)
        VALUES (?, ?, ?, ?, ?, ?)
    """, plan_rows)
    print(f"  Inserted {len(plan_rows)} benefit plans.")

    print("Inserting 2000 mock commercial policies...")
    commercial_single_types = [
        'general_liability', 'property', 'bop', 'workers_comp', 'auto',
        'epli', 'nydbl', 'surety', 'product_liability', 'flood',
        'directors_officers', 'fiduciary', 'inland_marine'
    ]

    for i, tax_id in enumerate(tax_ids):
        parent = random.choice([None, None, None, rand_company()])
        cols = ['tax_id', 'parent_client']
        vals = [tax_id, parent]

        # Randomly populate single-plan commercial types
        for ct in commercial_single_types:
            if random.random() > 0.4:  # 60% chance each type is populated
                cols.extend([
                    f'{ct}_carrier', f'{ct}_occ_limit', f'{ct}_agg_limit',
                    f'{ct}_premium', f'{ct}_renewal_date'
                ])
                vals.extend([
                    random.choice(CARRIERS), rand_limit(), rand_limit(),
                    rand_premium(), rand_date()
                ])

        placeholders = ','.join(['?'] * len(vals))
        col_str = ','.join(cols)
        cursor.execute(f"INSERT INTO commercial_insurance ({col_str}) VALUES ({placeholders})", vals)

    print(f"  Inserted 2000 commercial policies.")

    # Get commercial IDs for multi-plan insertion
    cursor.execute("SELECT id, tax_id FROM commercial_insurance WHERE tax_id IN ({})".format(
        ','.join('?' * len(tax_ids))), tax_ids)
    commercial_map = {row[1]: row[0] for row in cursor.fetchall()}

    print("Inserting commercial plans (umbrella, professional E&O, cyber, crime)...")
    comm_plan_rows = []
    comm_plan_types = ['umbrella', 'professional_eo', 'cyber', 'crime']
    for tax_id in tax_ids:
        comm_id = commercial_map.get(tax_id)
        if not comm_id:
            continue
        for pt in comm_plan_types:
            if random.random() > 0.4:
                num_plans = random.choices([1, 2], weights=[70, 30])[0]
                for pn in range(1, num_plans + 1):
                    comm_plan_rows.append((
                        comm_id, pt, pn,
                        random.choice(CARRIERS),
                        rand_limit(), rand_limit(),
                        rand_premium(), rand_date(),
                    ))

    cursor.executemany("""
        INSERT INTO commercial_plans (commercial_insurance_id, plan_type, plan_number,
                                      carrier, coverage_occ_limit, coverage_agg_limit,
                                      premium, renewal_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, comm_plan_rows)
    print(f"  Inserted {len(comm_plan_rows)} commercial plans.")

    conn.commit()
    conn.close()
    print("\nDone! All mock data inserted successfully.")


if __name__ == '__main__':
    main()
