"""
Shared pytest fixtures and configuration for Customer API tests.
"""

import pytest
import os
import sys
from datetime import datetime, timedelta
from faker import Faker

# Set test database URI BEFORE importing the app
# This ensures tests use an in-memory database instead of production
os.environ['DATABASE_URI'] = 'sqlite:///:memory:'

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


@pytest.fixture
def faker_instance():
    """Provide a Faker instance for generating test data."""
    return Faker()


@pytest.fixture
def generate_customer_data(faker_instance):
    """Factory fixture to generate random customer data."""
    def _generate(count=1, **overrides):
        """
        Generate customer data with realistic values.

        Args:
            count: Number of customer records to generate
            **overrides: Override specific fields

        Returns:
            List of customer dictionaries or single dictionary if count=1
        """
        fake = faker_instance
        customers = []

        for i in range(count):
            customer = {
                'Tax_ID': f'{fake.random_number(digits=2)}-{fake.random_number(digits=7)}',
                'Form_Fire_Code': fake.bothify(text='FF###'),
                'Enrollment_POC': fake.name(),
                'Renewal_Date': (datetime.now() + timedelta(days=fake.random_int(1, 365))).strftime('%Y-%m-%d'),
                'Other_Broker': fake.company(),
                'Group_Name': fake.company(),
                'Contact_Person': fake.name(),
                'Email': fake.email(),
                'Phone_Number': fake.phone_number(),
                'Funding': fake.random_element(elements=('Fully Insured', 'Self-Funded', 'Level-Funded')),
                'Current_Carrier': fake.random_element(elements=('BlueCross', 'Aetna', 'UnitedHealthcare', 'Cigna')),
                'Num_Employees_At_Renewal': fake.random_int(min=5, max=500),
                'Waiting_Period': fake.random_element(elements=('30 days', '60 days', '90 days', 'First of month')),
                'Deductible_Accumulation': fake.random_element(elements=('Calendar Year', 'Plan Year')),
                'Previous_Carrier': fake.random_element(elements=('BlueCross', 'Aetna', 'UnitedHealthcare', 'Cigna', None)),
                'Cobra_Carrier': fake.random_element(elements=('WageWorks', 'COBRA Solutions', 'PayFlex', None)),
                'Dental_Effective_Date': fake.date_between(start_date='-1y', end_date='today').strftime('%Y-%m-%d'),
                'Dental_Carrier': fake.random_element(elements=('Delta Dental', 'MetLife', 'Guardian', None)),
                'Vision_Effective_Date': fake.date_between(start_date='-1y', end_date='today').strftime('%Y-%m-%d'),
                'Vision_Carrier': fake.random_element(elements=('VSP', 'EyeMed', 'Superior Vision', None)),
                'Life_And_ADND_Effective_Date': fake.date_between(start_date='-1y', end_date='today').strftime('%Y-%m-%d'),
                'Life_And_ADND_Carrier': fake.random_element(elements=('MetLife', 'Prudential', 'The Hartford', None)),
                'LTD_Effective_Date': fake.date_between(start_date='-1y', end_date='today').strftime('%Y-%m-%d'),
                'LTD_Carrier': fake.random_element(elements=('Guardian', 'The Hartford', 'MetLife', None)),
                'STD_Effective_Date': fake.date_between(start_date='-1y', end_date='today').strftime('%Y-%m-%d'),
                'STD_Carrier': fake.random_element(elements=('Guardian', 'The Hartford', 'MetLife', None)),
                'Effective_Date_401K': fake.date_between(start_date='-2y', end_date='today').strftime('%Y-%m-%d'),
                'Carrier_401K': fake.random_element(elements=('Fidelity', 'Vanguard', 'Charles Schwab', None)),
                'Employer': f'{fake.random_int(min=50, max=100)}%',
                'Employee': f'{fake.random_int(min=0, max=50)}%',
                'PNC': fake.random_element(elements=('Yes', 'No', None)),
                'Employee_Navigator': fake.random_element(elements=('Yes', 'No', None)),
                'Product': fake.random_element(elements=('PPO', 'HMO', 'EPO', 'POS')),
                'Client_Manager': fake.name()
            }

            # Apply overrides
            customer.update(overrides)
            customers.append(customer)

        return customers[0] if count == 1 else customers

    return _generate


@pytest.fixture
def api_headers():
    """Standard headers for API requests."""
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }


@pytest.fixture
def date_formats():
    """Common date formats for testing."""
    return [
        '%Y-%m-%d',           # 2024-01-15
        '%m/%d/%Y',           # 01/15/2024
        '%d-%m-%Y',           # 15-01-2024
        '%Y-%m-%dT%H:%M:%S',  # 2024-01-15T00:00:00
    ]


@pytest.fixture(autouse=True)
def reset_environment():
    """Reset environment variables before each test."""
    # Store original environment
    original_env = os.environ.copy()

    yield

    # Restore original environment
    os.environ.clear()
    os.environ.update(original_env)


def pytest_configure(config):
    """Configure pytest with custom settings."""
    config.addinivalue_line(
        "markers", "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
    config.addinivalue_line(
        "markers", "database: mark test as requiring database"
    )


def pytest_collection_modifyitems(config, items):
    """Modify test collection to add markers automatically."""
    for item in items:
        # Auto-mark database tests
        if "test_client" in item.fixturenames:
            item.add_marker(pytest.mark.database)

        # Auto-mark integration tests
        if "TestIntegration" in str(item.cls):
            item.add_marker(pytest.mark.integration)
        else:
            item.add_marker(pytest.mark.unit)
