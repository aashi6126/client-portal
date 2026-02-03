"""
Utility functions and helpers for testing the Customer API.
"""

import json
from datetime import datetime, date


def assert_customer_fields_match(expected, actual, exclude_fields=None):
    """
    Assert that customer fields match between expected and actual.

    Args:
        expected: Expected customer dictionary
        actual: Actual customer dictionary
        exclude_fields: List of fields to exclude from comparison
    """
    if exclude_fields is None:
        exclude_fields = ['Customer_id']

    for key in expected:
        if key not in exclude_fields:
            assert key in actual, f"Field '{key}' missing from actual customer"
            assert expected[key] == actual[key], f"Field '{key}' does not match. Expected: {expected[key]}, Got: {actual[key]}"


def parse_response_data(response):
    """
    Parse JSON response data safely.

    Args:
        response: Flask test response object

    Returns:
        Parsed JSON data or None if parsing fails
    """
    try:
        return json.loads(response.data)
    except (json.JSONDecodeError, ValueError):
        return None


def create_test_customer(client, customer_data):
    """
    Helper to create a customer and return the customer ID.

    Args:
        client: Flask test client
        customer_data: Customer data dictionary

    Returns:
        Customer ID if successful, None otherwise
    """
    response = client.post('/api/customers',
                          data=json.dumps([customer_data]),
                          content_type='application/json')

    if response.status_code == 201:
        data = json.loads(response.data)
        return data.get('customer_id')
    return None


def get_customer_by_id(client, customer_id):
    """
    Helper to get a customer by ID.

    Args:
        client: Flask test client
        customer_id: ID of the customer to retrieve

    Returns:
        Customer dictionary if found, None otherwise
    """
    response = client.get('/api/customers')

    if response.status_code == 200:
        data = json.loads(response.data)
        customers = data.get('customers', [])
        for customer in customers:
            if customer.get('Customer_id') == customer_id:
                return customer
    return None


def assert_response_has_keys(data, required_keys):
    """
    Assert that response data contains all required keys.

    Args:
        data: Response data dictionary
        required_keys: List of required key names
    """
    for key in required_keys:
        assert key in data, f"Required key '{key}' missing from response"


def format_date_string(date_obj, format_str='%Y-%m-%d'):
    """
    Format a date object as a string.

    Args:
        date_obj: Date or datetime object
        format_str: Format string (default: YYYY-MM-DD)

    Returns:
        Formatted date string
    """
    if isinstance(date_obj, str):
        return date_obj
    if isinstance(date_obj, (date, datetime)):
        return date_obj.strftime(format_str)
    return None


def generate_unique_email(base='test'):
    """
    Generate a unique email address for testing.

    Args:
        base: Base name for the email

    Returns:
        Unique email address string
    """
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S%f')
    return f'{base}_{timestamp}@test.com'


def assert_error_response(response, expected_status_code):
    """
    Assert that a response is an error with the expected status code.

    Args:
        response: Flask test response object
        expected_status_code: Expected HTTP status code
    """
    assert response.status_code == expected_status_code
    data = parse_response_data(response)
    assert data is not None
    assert 'error' in data or 'message' in data


def assert_success_response(response, expected_status_code=200, message_key='message'):
    """
    Assert that a response is successful with the expected status code.

    Args:
        response: Flask test response object
        expected_status_code: Expected HTTP status code (default: 200)
        message_key: Key for success message (default: 'message')
    """
    assert response.status_code == expected_status_code
    data = parse_response_data(response)
    assert data is not None
    if message_key:
        assert message_key in data


def count_customers(client):
    """
    Get the total count of customers in the database.

    Args:
        client: Flask test client

    Returns:
        Number of customers or 0 if error
    """
    response = client.get('/api/customers')
    if response.status_code == 200:
        data = json.loads(response.data)
        return data.get('total_customers', 0)
    return 0


def bulk_create_customers(client, customer_data_list):
    """
    Create multiple customers at once.

    Args:
        client: Flask test client
        customer_data_list: List of customer data dictionaries

    Returns:
        List of created customer IDs
    """
    customer_ids = []
    for customer_data in customer_data_list:
        customer_id = create_test_customer(client, customer_data)
        if customer_id:
            customer_ids.append(customer_id)
    return customer_ids


def cleanup_all_customers(client):
    """
    Delete all customers from the database.

    Args:
        client: Flask test client

    Returns:
        True if successful, False otherwise
    """
    response = client.delete('/api/customers/purge')
    return response.status_code == 200
