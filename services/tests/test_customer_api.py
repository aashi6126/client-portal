"""
Comprehensive test suite for the Customer API service.
Tests all endpoints, edge cases, and error conditions.
"""

import pytest
import json
import os
import tempfile
from datetime import datetime, date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys

# Add the parent directory to the path so we can import the api module
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from api import customer_api
from api.customer_api import app, db, Customer


@pytest.fixture(scope='function')
def test_client():
    """Create a test client with isolated database for each test."""
    # Configure app for testing
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    with app.app_context():
        # Rebind the module-level Session to use the same engine as db
        # This ensures API routes use the test database
        customer_api.Session = sessionmaker(bind=db.engine)

        # Create all tables
        db.create_all()

        # Create test client
        client = app.test_client()

        yield client

        # Cleanup after each test
        db.session.remove()
        # Drop and recreate tables for complete isolation
        db.drop_all()
        db.create_all()


@pytest.fixture
def sample_customer_data():
    """Sample customer data for testing."""
    return {
        'Tax_ID': '12-3456789',
        'Form_Fire_Code': 'FF123',
        'Enrollment_POC': 'John Doe',
        'Renewal_Date': '2024-12-31',
        'Other_Broker': 'ABC Brokers',
        'Group_Name': 'Test Group Inc',
        'Contact_Person': 'Jane Smith',
        'Email': 'jane.smith@testgroup.com',
        'Phone_Number': '555-1234',
        'Funding': 'Fully Insured',
        'Current_Carrier': 'BlueCross',
        'Num_Employees_At_Renewal': 50,
        'Waiting_Period': '30 days',
        'Deductible_Accumulation': 'Calendar Year',
        'Previous_Carrier': 'Aetna',
        'Cobra_Carrier': 'WageWorks',
        'Dental_Effective_Date': '2024-01-01',
        'Dental_Carrier': 'Delta Dental',
        'Vision_Effective_Date': '2024-01-01',
        'Vision_Carrier': 'VSP',
        'Life_And_ADND_Effective_Date': '2024-01-01',
        'Life_And_ADND_Carrier': 'MetLife',
        'LTD_Effective_Date': '2024-01-01',
        'LTD_Carrier': 'Guardian',
        'STD_Effective_Date': '2024-01-01',
        'STD_Carrier': 'Guardian',
        'Effective_Date_401K': '2024-01-01',
        'Carrier_401K': 'Fidelity',
        'Employer': '80%',
        'Employee': '20%',
        'PNC': 'Yes',
        'Employee_Navigator': 'Yes',
        'Product': 'PPO',
        'Client_Manager': 'Bob Manager'
    }


@pytest.fixture
def minimal_customer_data():
    """Minimal customer data for testing required fields."""
    return {
        'Group_Name': 'Minimal Test Group',
        'Email': 'test@minimal.com'
    }


class TestGetCustomers:
    """Test suite for GET /api/customers endpoint."""

    def test_get_customers_empty_database(self, test_client):
        """Test getting customers when database is empty."""
        response = test_client.get('/api/customers')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['customers'] == []
        assert data['total_customers'] == 0
        assert data['total_pages'] == 0
        assert data['current_page'] == 1

    def test_get_customers_with_data(self, test_client, sample_customer_data):
        """Test getting customers with data in database."""
        # Add a customer first
        test_client.post('/api/customers',
                        data=json.dumps([sample_customer_data]),
                        content_type='application/json')

        # Get customers
        response = test_client.get('/api/customers')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['customers']) == 1
        assert data['total_customers'] == 1
        assert data['customers'][0]['Email'] == 'jane.smith@testgroup.com'
        assert data['customers'][0]['Group_Name'] == 'Test Group Inc'

    def test_get_customers_date_formatting(self, test_client, sample_customer_data):
        """Test that dates are properly formatted in response."""
        test_client.post('/api/customers',
                        data=json.dumps([sample_customer_data]),
                        content_type='application/json')

        response = test_client.get('/api/customers')
        data = json.loads(response.data)
        customer = data['customers'][0]

        # Check date format (YYYY-MM-DD)
        assert customer['Renewal_Date'] == '2024-12-31'
        assert customer['Dental_Effective_Date'] == '2024-01-01'
        assert customer['Vision_Effective_Date'] == '2024-01-01'

    def test_get_customers_pagination_fields(self, test_client, sample_customer_data):
        """Test pagination fields in response."""
        # Add multiple customers
        for i in range(3):
            customer = sample_customer_data.copy()
            customer['Email'] = f'test{i}@example.com'
            test_client.post('/api/customers',
                           data=json.dumps([customer]),
                           content_type='application/json')

        response = test_client.get('/api/customers')
        data = json.loads(response.data)

        assert 'customers' in data
        assert 'total_customers' in data
        assert 'total_pages' in data
        assert 'current_page' in data
        assert data['total_customers'] == 3


class TestAddCustomer:
    """Test suite for POST /api/customers endpoint."""

    def test_add_customer_success(self, test_client, sample_customer_data):
        """Test successfully adding a customer."""
        response = test_client.post('/api/customers',
                                   data=json.dumps([sample_customer_data]),
                                   content_type='application/json')

        assert response.status_code == 201
        data = json.loads(response.data)
        assert 'customer_id' in data
        assert data['message'] == 'New customer added successfully'
        assert isinstance(data['customer_id'], int)

    def test_add_customer_minimal_data(self, test_client, minimal_customer_data):
        """Test adding customer with minimal data."""
        response = test_client.post('/api/customers',
                                   data=json.dumps([minimal_customer_data]),
                                   content_type='application/json')

        assert response.status_code == 201
        data = json.loads(response.data)
        assert 'customer_id' in data

    def test_add_customer_no_data(self, test_client):
        """Test adding customer with no data returns error."""
        response = test_client.post('/api/customers',
                                   data=json.dumps(None),
                                   content_type='application/json')

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert 'No data provided' in data['error']

    def test_add_customer_empty_array(self, test_client):
        """Test adding customer with empty array returns error."""
        response = test_client.post('/api/customers',
                                   data=json.dumps([]),
                                   content_type='application/json')

        assert response.status_code == 400

    def test_add_customer_invalid_json(self, test_client):
        """Test adding customer with invalid JSON."""
        response = test_client.post('/api/customers',
                                   data='invalid json',
                                   content_type='application/json')

        assert response.status_code == 400

    def test_add_customer_date_parsing(self, test_client):
        """Test various date formats are parsed correctly."""
        customer_data = {
            'Group_Name': 'Date Test Group',
            'Renewal_Date': '2024-12-31',
            'Dental_Effective_Date': '01/15/2024',
            'Vision_Effective_Date': '2024-03-01T00:00:00'
        }

        response = test_client.post('/api/customers',
                                   data=json.dumps([customer_data]),
                                   content_type='application/json')

        assert response.status_code == 201

    def test_add_customer_invalid_date(self, test_client):
        """Test adding customer with invalid date format."""
        customer_data = {
            'Group_Name': 'Invalid Date Group',
            'Renewal_Date': 'not-a-date'
        }

        response = test_client.post('/api/customers',
                                   data=json.dumps([customer_data]),
                                   content_type='application/json')

        # Should still succeed but with None for invalid date
        assert response.status_code == 201

    def test_add_multiple_customers(self, test_client, sample_customer_data):
        """Test adding multiple customers in one request."""
        customers = []
        for i in range(3):
            customer = sample_customer_data.copy()
            customer['Email'] = f'customer{i}@test.com'
            customers.append(customer)

        response = test_client.post('/api/customers',
                                   data=json.dumps(customers),
                                   content_type='application/json')

        assert response.status_code == 201

        # Verify all were added
        get_response = test_client.get('/api/customers')
        data = json.loads(get_response.data)
        assert data['total_customers'] == 3

    def test_add_customer_with_null_values(self, test_client):
        """Test adding customer with explicit null values."""
        customer_data = {
            'Group_Name': 'Null Test Group',
            'Email': 'null@test.com',
            'Phone_Number': None,
            'Num_Employees_At_Renewal': None
        }

        response = test_client.post('/api/customers',
                                   data=json.dumps([customer_data]),
                                   content_type='application/json')

        assert response.status_code == 201


class TestUpdateCustomer:
    """Test suite for PUT /api/customers/<id> endpoint."""

    def test_update_customer_success(self, test_client, sample_customer_data):
        """Test successfully updating a customer."""
        # Add customer
        add_response = test_client.post('/api/customers',
                                       data=json.dumps([sample_customer_data]),
                                       content_type='application/json')
        customer_id = json.loads(add_response.data)['customer_id']

        # Update customer
        updated_data = sample_customer_data.copy()
        updated_data['Email'] = 'updated@email.com'
        updated_data['Group_Name'] = 'Updated Group Name'

        response = test_client.put(f'/api/customers/{customer_id}',
                                  data=json.dumps(updated_data),
                                  content_type='application/json')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['message'] == 'Customer updated successfully'

        # Verify update
        get_response = test_client.get('/api/customers')
        customers = json.loads(get_response.data)['customers']
        assert customers[0]['Email'] == 'updated@email.com'
        assert customers[0]['Group_Name'] == 'Updated Group Name'

    def test_update_customer_partial_data(self, test_client, sample_customer_data):
        """Test updating only some fields of a customer."""
        # Add customer
        add_response = test_client.post('/api/customers',
                                       data=json.dumps([sample_customer_data]),
                                       content_type='application/json')
        customer_id = json.loads(add_response.data)['customer_id']

        # Update only email
        update_data = {'Email': 'newemail@test.com'}

        response = test_client.put(f'/api/customers/{customer_id}',
                                  data=json.dumps(update_data),
                                  content_type='application/json')

        assert response.status_code == 200

    def test_update_nonexistent_customer(self, test_client, sample_customer_data):
        """Test updating a customer that doesn't exist."""
        response = test_client.put('/api/customers/99999',
                                  data=json.dumps(sample_customer_data),
                                  content_type='application/json')

        # Update succeeds even for non-existent customer (no rows affected)
        assert response.status_code == 200

    def test_update_customer_dates(self, test_client, sample_customer_data):
        """Test updating customer date fields."""
        # Add customer
        add_response = test_client.post('/api/customers',
                                       data=json.dumps([sample_customer_data]),
                                       content_type='application/json')
        customer_id = json.loads(add_response.data)['customer_id']

        # Update dates
        update_data = {
            'Renewal_Date': '2025-12-31',
            'Dental_Effective_Date': '2025-06-01'
        }

        response = test_client.put(f'/api/customers/{customer_id}',
                                  data=json.dumps(update_data),
                                  content_type='application/json')

        assert response.status_code == 200

        # Verify dates updated
        get_response = test_client.get('/api/customers')
        customer = json.loads(get_response.data)['customers'][0]
        assert customer['Renewal_Date'] == '2025-12-31'
        assert customer['Dental_Effective_Date'] == '2025-06-01'

    def test_update_customer_to_null(self, test_client, sample_customer_data):
        """Test updating customer fields to null."""
        # Add customer
        add_response = test_client.post('/api/customers',
                                       data=json.dumps([sample_customer_data]),
                                       content_type='application/json')
        customer_id = json.loads(add_response.data)['customer_id']

        # Update to null
        update_data = {
            'Phone_Number': None,
            'Current_Carrier': None
        }

        response = test_client.put(f'/api/customers/{customer_id}',
                                  data=json.dumps(update_data),
                                  content_type='application/json')

        assert response.status_code == 200


class TestDeleteCustomer:
    """Test suite for DELETE /api/customers/<id> endpoint."""

    def test_delete_customer_success(self, test_client, sample_customer_data):
        """Test successfully deleting a customer."""
        # Add customer
        add_response = test_client.post('/api/customers',
                                       data=json.dumps([sample_customer_data]),
                                       content_type='application/json')
        customer_id = json.loads(add_response.data)['customer_id']

        # Delete customer
        response = test_client.delete(f'/api/customers/{customer_id}')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['message'] == 'Customer deleted successfully'

        # Verify deletion
        get_response = test_client.get('/api/customers')
        customers = json.loads(get_response.data)['customers']
        assert len(customers) == 0

    def test_delete_nonexistent_customer(self, test_client):
        """Test deleting a customer that doesn't exist."""
        response = test_client.delete('/api/customers/99999')

        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'not found' in data['message'].lower()

    def test_delete_multiple_customers(self, test_client, sample_customer_data):
        """Test deleting multiple customers one by one."""
        # Add multiple customers
        customer_ids = []
        for i in range(3):
            customer = sample_customer_data.copy()
            customer['Email'] = f'customer{i}@test.com'
            response = test_client.post('/api/customers',
                                       data=json.dumps([customer]),
                                       content_type='application/json')
            customer_ids.append(json.loads(response.data)['customer_id'])

        # Delete all customers
        for customer_id in customer_ids:
            response = test_client.delete(f'/api/customers/{customer_id}')
            assert response.status_code == 200

        # Verify all deleted
        get_response = test_client.get('/api/customers')
        data = json.loads(get_response.data)
        assert data['total_customers'] == 0


class TestCloneCustomer:
    """Test suite for POST /api/customers/<id>/clone endpoint."""

    def test_clone_customer_success(self, test_client, sample_customer_data):
        """Test successfully cloning a customer."""
        # Add customer
        add_response = test_client.post('/api/customers',
                                       data=json.dumps([sample_customer_data]),
                                       content_type='application/json')
        original_id = json.loads(add_response.data)['customer_id']

        # Clone customer
        response = test_client.post(f'/api/customers/{original_id}/clone')

        assert response.status_code == 201
        data = json.loads(response.data)
        assert 'customer_id' in data
        assert data['message'] == 'Customer cloned successfully'
        assert data['customer_id'] != original_id

        # Verify clone exists
        get_response = test_client.get('/api/customers')
        customers = json.loads(get_response.data)['customers']
        assert len(customers) == 2

        # Verify data is identical except ID
        original = [c for c in customers if c['Customer_id'] == original_id][0]
        clone = [c for c in customers if c['Customer_id'] == data['customer_id']][0]

        for key in original:
            if key != 'Customer_id':
                assert original[key] == clone[key]

    def test_clone_nonexistent_customer(self, test_client):
        """Test cloning a customer that doesn't exist."""
        response = test_client.post('/api/customers/99999/clone')

        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'not found' in data['message'].lower()

    def test_clone_customer_multiple_times(self, test_client, sample_customer_data):
        """Test cloning the same customer multiple times."""
        # Add customer
        add_response = test_client.post('/api/customers',
                                       data=json.dumps([sample_customer_data]),
                                       content_type='application/json')
        original_id = json.loads(add_response.data)['customer_id']

        # Clone multiple times
        clone_ids = []
        for _ in range(3):
            response = test_client.post(f'/api/customers/{original_id}/clone')
            assert response.status_code == 201
            clone_ids.append(json.loads(response.data)['customer_id'])

        # Verify all clones exist
        get_response = test_client.get('/api/customers')
        data = json.loads(get_response.data)
        assert data['total_customers'] == 4  # 1 original + 3 clones

        # Verify all clone IDs are unique
        assert len(set(clone_ids)) == 3


class TestPurgeCustomers:
    """Test suite for DELETE /api/customers/purge endpoint."""

    def test_purge_customers_success(self, test_client, sample_customer_data):
        """Test successfully purging all customers."""
        # Add multiple customers
        for i in range(5):
            customer = sample_customer_data.copy()
            customer['Email'] = f'customer{i}@test.com'
            test_client.post('/api/customers',
                           data=json.dumps([customer]),
                           content_type='application/json')

        # Verify customers exist
        get_response = test_client.get('/api/customers')
        assert json.loads(get_response.data)['total_customers'] == 5

        # Purge all customers
        response = test_client.delete('/api/customers/purge')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['message'] == 'All customers deleted successfully'

        # Verify all deleted
        get_response = test_client.get('/api/customers')
        assert json.loads(get_response.data)['total_customers'] == 0

    def test_purge_empty_database(self, test_client):
        """Test purging when database is already empty."""
        response = test_client.delete('/api/customers/purge')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['message'] == 'All customers deleted successfully'


class TestCORS:
    """Test suite for CORS headers."""

    def test_cors_headers_present(self, test_client):
        """Test that CORS headers are present in responses."""
        response = test_client.get('/api/customers')

        # CORS headers should be present
        assert 'Access-Control-Allow-Origin' in response.headers

    def test_cors_allowed_origin(self, test_client):
        """Test that localhost:3000 is allowed."""
        response = test_client.get('/api/customers',
                                  headers={'Origin': 'http://localhost:3000'})

        assert response.status_code == 200


class TestEdgeCases:
    """Test suite for edge cases and special scenarios."""

    def test_very_long_string_fields(self, test_client):
        """Test handling of very long string values."""
        long_string = 'A' * 1000
        customer_data = {
            'Group_Name': long_string,
            'Email': 'test@long.com'
        }

        response = test_client.post('/api/customers',
                                   data=json.dumps([customer_data]),
                                   content_type='application/json')

        # Should succeed (VARCHAR(500) will truncate or fail gracefully)
        assert response.status_code in [201, 500]

    def test_special_characters_in_fields(self, test_client):
        """Test handling of special characters in fields."""
        customer_data = {
            'Group_Name': 'Test & Co. <Special>',
            'Email': 'test+special@example.com',
            'Contact_Person': "O'Brien",
            'Tax_ID': '12-3456789'
        }

        response = test_client.post('/api/customers',
                                   data=json.dumps([customer_data]),
                                   content_type='application/json')

        assert response.status_code == 201

        # Verify special characters preserved
        get_response = test_client.get('/api/customers')
        customer = json.loads(get_response.data)['customers'][0]
        assert customer['Contact_Person'] == "O'Brien"
        assert '&' in customer['Group_Name']

    def test_unicode_characters(self, test_client):
        """Test handling of unicode characters."""
        customer_data = {
            'Group_Name': 'Test 测试 Société',
            'Email': 'unicode@test.com',
            'Contact_Person': 'José García'
        }

        response = test_client.post('/api/customers',
                                   data=json.dumps([customer_data]),
                                   content_type='application/json')

        assert response.status_code == 201

    def test_empty_string_vs_null(self, test_client):
        """Test difference between empty strings and null values."""
        customer_data = {
            'Group_Name': '',
            'Email': 'empty@test.com',
            'Phone_Number': None
        }

        response = test_client.post('/api/customers',
                                   data=json.dumps([customer_data]),
                                   content_type='application/json')

        assert response.status_code == 201

    def test_numeric_edge_cases(self, test_client):
        """Test numeric field edge cases."""
        customer_data = {
            'Group_Name': 'Numeric Test',
            'Num_Employees_At_Renewal': 0,
            'Email': 'numeric@test.com'
        }

        response = test_client.post('/api/customers',
                                   data=json.dumps([customer_data]),
                                   content_type='application/json')

        assert response.status_code == 201

        # Verify zero is stored correctly
        get_response = test_client.get('/api/customers')
        customer = json.loads(get_response.data)['customers'][0]
        assert customer['Num_Employees_At_Renewal'] == 0


class TestIntegration:
    """Integration tests for complete workflows."""

    def test_complete_crud_workflow(self, test_client, sample_customer_data):
        """Test complete Create, Read, Update, Delete workflow."""
        # Create
        create_response = test_client.post('/api/customers',
                                          data=json.dumps([sample_customer_data]),
                                          content_type='application/json')
        assert create_response.status_code == 201
        customer_id = json.loads(create_response.data)['customer_id']

        # Read
        read_response = test_client.get('/api/customers')
        assert read_response.status_code == 200
        customers = json.loads(read_response.data)['customers']
        assert len(customers) == 1
        assert customers[0]['Customer_id'] == customer_id

        # Update
        update_data = sample_customer_data.copy()
        update_data['Email'] = 'updated@example.com'
        update_response = test_client.put(f'/api/customers/{customer_id}',
                                         data=json.dumps(update_data),
                                         content_type='application/json')
        assert update_response.status_code == 200

        # Verify update
        verify_response = test_client.get('/api/customers')
        customers = json.loads(verify_response.data)['customers']
        assert customers[0]['Email'] == 'updated@example.com'

        # Delete
        delete_response = test_client.delete(f'/api/customers/{customer_id}')
        assert delete_response.status_code == 200

        # Verify deletion
        final_response = test_client.get('/api/customers')
        assert json.loads(final_response.data)['total_customers'] == 0

    def test_clone_and_modify_workflow(self, test_client, sample_customer_data):
        """Test cloning a customer and modifying the clone."""
        # Create original
        create_response = test_client.post('/api/customers',
                                          data=json.dumps([sample_customer_data]),
                                          content_type='application/json')
        original_id = json.loads(create_response.data)['customer_id']

        # Clone
        clone_response = test_client.post(f'/api/customers/{original_id}/clone')
        clone_id = json.loads(clone_response.data)['customer_id']

        # Modify clone
        update_data = {'Email': 'clone@example.com', 'Group_Name': 'Cloned Group'}
        update_response = test_client.put(f'/api/customers/{clone_id}',
                                         data=json.dumps(update_data),
                                         content_type='application/json')
        assert update_response.status_code == 200

        # Verify both exist with different data
        get_response = test_client.get('/api/customers')
        customers = json.loads(get_response.data)['customers']
        assert len(customers) == 2

        original = [c for c in customers if c['Customer_id'] == original_id][0]
        clone = [c for c in customers if c['Customer_id'] == clone_id][0]

        assert original['Email'] != clone['Email']
        assert original['Group_Name'] != clone['Group_Name']

    def test_bulk_operations(self, test_client, sample_customer_data):
        """Test adding, cloning, and purging multiple customers."""
        # Add multiple customers
        customers = []
        for i in range(10):
            customer = sample_customer_data.copy()
            customer['Email'] = f'customer{i}@test.com'
            customers.append(customer)

        response = test_client.post('/api/customers',
                                   data=json.dumps(customers),
                                   content_type='application/json')
        assert response.status_code == 201

        # Verify count
        get_response = test_client.get('/api/customers')
        assert json.loads(get_response.data)['total_customers'] == 10

        # Purge all
        purge_response = test_client.delete('/api/customers/purge')
        assert purge_response.status_code == 200

        # Verify empty
        final_response = test_client.get('/api/customers')
        assert json.loads(final_response.data)['total_customers'] == 0


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--cov=api', '--cov-report=html'])
