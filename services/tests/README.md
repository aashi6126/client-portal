# Customer API Test Suite

Comprehensive test suite for the Customer API service with full coverage of all endpoints, edge cases, and integration scenarios.

## Table of Contents

- [Overview](#overview)
- [Test Coverage](#test-coverage)
- [Installation](#installation)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing New Tests](#writing-new-tests)
- [Continuous Integration](#continuous-integration)

## Overview

This test suite provides comprehensive coverage for the Customer API, including:

- **Unit tests** for individual endpoints
- **Integration tests** for complete workflows
- **Edge case testing** for special characters, dates, and data validation
- **Error handling** tests for various failure scenarios
- **CORS** and security testing

### Test Statistics

- **Total Test Classes**: 9
- **Total Test Methods**: 50+
- **API Endpoints Covered**: 6/6 (100%)
- **Code Coverage Target**: >90%

## Test Coverage

### Endpoints Tested

| Endpoint | Method | Test Count | Coverage |
|----------|--------|------------|----------|
| `/api/customers` | GET | 4 | ✅ 100% |
| `/api/customers` | POST | 9 | ✅ 100% |
| `/api/customers/<id>` | PUT | 5 | ✅ 100% |
| `/api/customers/<id>` | DELETE | 3 | ✅ 100% |
| `/api/customers/<id>/clone` | POST | 3 | ✅ 100% |
| `/api/customers/purge` | DELETE | 2 | ✅ 100% |

### Test Categories

1. **TestGetCustomers**: Tests for retrieving customer data
2. **TestAddCustomer**: Tests for creating new customers
3. **TestUpdateCustomer**: Tests for updating existing customers
4. **TestDeleteCustomer**: Tests for deleting customers
5. **TestCloneCustomer**: Tests for cloning customer records
6. **TestPurgeCustomers**: Tests for bulk deletion
7. **TestCORS**: Tests for CORS headers and security
8. **TestEdgeCases**: Tests for special scenarios and data validation
9. **TestIntegration**: End-to-end workflow tests

## Installation

### Prerequisites

- Python 3.8 or higher
- pip package manager

### Install Test Dependencies

```bash
cd /Users/aman/workspaces/client-portal/services
pip install -r test_requirements.txt
```

### Required Packages

- `pytest` - Test framework
- `pytest-cov` - Code coverage reporting
- `pytest-mock` - Mocking utilities
- `flask-testing` - Flask test utilities
- `faker` - Realistic test data generation

## Running Tests

### Run All Tests

```bash
# From the services directory
cd /Users/aman/workspaces/client-portal/services
pytest
```

### Run with Verbose Output

```bash
pytest -v
```

### Run Specific Test File

```bash
pytest tests/test_customer_api.py
```

### Run Specific Test Class

```bash
pytest tests/test_customer_api.py::TestGetCustomers
```

### Run Specific Test Method

```bash
pytest tests/test_customer_api.py::TestGetCustomers::test_get_customers_empty_database
```

### Run Tests with Coverage Report

```bash
# Terminal coverage report
pytest --cov=api --cov-report=term-missing

# HTML coverage report (opens in browser)
pytest --cov=api --cov-report=html
open htmlcov/index.html
```

### Run Tests by Marker

```bash
# Run only unit tests
pytest -m unit

# Run only integration tests
pytest -m integration

# Run only database tests
pytest -m database

# Skip slow tests
pytest -m "not slow"
```

### Run Tests in Parallel (Faster)

```bash
# Install pytest-xdist first
pip install pytest-xdist

# Run tests in parallel
pytest -n auto
```

## Test Structure

### Directory Layout

```
services/
├── api/
│   └── customer_api.py          # API implementation
├── tests/
│   ├── __init__.py              # Package init
│   ├── conftest.py              # Shared fixtures
│   ├── test_customer_api.py     # Main test suite
│   ├── test_utils.py            # Test utility functions
│   └── README.md                # This file
├── pytest.ini                   # Pytest configuration
└── test_requirements.txt        # Test dependencies
```

### Fixture Overview

Located in `tests/conftest.py`:

- **test_client**: Creates isolated test client with temporary database
- **sample_customer_data**: Complete customer data for testing
- **minimal_customer_data**: Minimal valid customer data
- **generate_customer_data**: Factory for generating realistic test data
- **faker_instance**: Faker instance for random data generation
- **api_headers**: Standard API request headers

### Utility Functions

Located in `tests/test_utils.py`:

- `assert_customer_fields_match()`: Compare customer data
- `create_test_customer()`: Helper to create customers
- `get_customer_by_id()`: Retrieve customer by ID
- `count_customers()`: Get total customer count
- `cleanup_all_customers()`: Remove all test data
- `generate_unique_email()`: Create unique email addresses

## Writing New Tests

### Basic Test Template

```python
def test_my_new_feature(test_client, sample_customer_data):
    """Test description."""
    # Arrange
    customer_id = create_test_customer(test_client, sample_customer_data)

    # Act
    response = test_client.get(f'/api/customers/{customer_id}')

    # Assert
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['Email'] == sample_customer_data['Email']
```

### Using Fixtures

```python
def test_with_generated_data(test_client, generate_customer_data):
    """Test with randomly generated data."""
    # Generate 5 customers with realistic data
    customers = generate_customer_data(count=5)

    # Override specific fields
    custom_customer = generate_customer_data(
        Email='specific@example.com',
        Group_Name='Specific Group'
    )

    # Use in tests...
```

### Test Markers

```python
@pytest.mark.slow
def test_performance_intensive():
    """This test takes longer to run."""
    pass

@pytest.mark.integration
def test_complete_workflow():
    """Integration test for full workflow."""
    pass
```

## Test Data Management

### Using Faker for Realistic Data

The test suite uses Faker to generate realistic test data:

```python
from faker import Faker

fake = Faker()
customer = {
    'Group_Name': fake.company(),
    'Email': fake.email(),
    'Contact_Person': fake.name(),
    'Phone_Number': fake.phone_number()
}
```

### Date Testing

Tests cover various date formats:

- ISO format: `2024-01-15`
- US format: `01/15/2024`
- European format: `15-01-2024`
- ISO with time: `2024-01-15T00:00:00`

## Coverage Reports

### Generate Coverage Report

```bash
pytest --cov=api --cov-report=html --cov-report=term
```

### View HTML Coverage Report

```bash
open htmlcov/index.html
```

### Coverage Goals

- **Overall Coverage**: >90%
- **API Routes**: 100%
- **Error Handling**: 100%
- **Database Operations**: >95%

## Continuous Integration

### GitHub Actions Example

```yaml
name: Run Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2

    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: '3.9'

    - name: Install dependencies
      run: |
        cd services
        pip install -r test_requirements.txt

    - name: Run tests
      run: |
        cd services
        pytest --cov=api --cov-report=xml

    - name: Upload coverage
      uses: codecov/codecov-action@v2
```

## Common Issues and Solutions

### Issue: Database Lock Errors

**Solution**: Tests use isolated temporary databases. If you see lock errors, ensure no other processes are accessing the test database.

### Issue: Import Errors

**Solution**: Ensure you're running tests from the `services` directory:
```bash
cd /Users/aman/workspaces/client-portal/services
pytest
```

### Issue: Fixture Not Found

**Solution**: Check that `conftest.py` is in the `tests` directory and properly configured.

### Issue: Tests Pass Locally but Fail in CI

**Solution**: Check for hardcoded paths. Use relative paths and `os.path.join()` for cross-platform compatibility.

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Use fixtures with proper teardown to clean up test data
3. **Descriptive Names**: Test names should clearly describe what they test
4. **AAA Pattern**: Arrange, Act, Assert - structure your tests clearly
5. **Edge Cases**: Always test boundary conditions and error paths
6. **Realistic Data**: Use Faker for generating realistic test data
7. **Coverage**: Aim for >90% code coverage, but focus on meaningful tests

## Running Tests Before Commits

### Pre-commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
cd services
pytest --exitfirst --quiet
if [ $? -ne 0 ]; then
    echo "Tests failed. Commit aborted."
    exit 1
fi
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

## Debugging Tests

### Run with Debugging Output

```bash
pytest -v -s  # -s shows print statements
```

### Run with Python Debugger

```bash
pytest --pdb  # Drop into debugger on failure
```

### Run with Full Traceback

```bash
pytest --tb=long
```

## Performance Testing

### Benchmark Tests

```python
import time

def test_bulk_operation_performance(test_client, generate_customer_data):
    """Test that bulk operations complete in reasonable time."""
    customers = generate_customer_data(count=100)

    start = time.time()
    response = test_client.post('/api/customers',
                               data=json.dumps(customers),
                               content_type='application/json')
    duration = time.time() - start

    assert response.status_code == 201
    assert duration < 5.0  # Should complete within 5 seconds
```

## Contributing

When adding new features to the API:

1. Write tests first (TDD approach)
2. Ensure all existing tests pass
3. Add tests for new functionality
4. Update this README if needed
5. Maintain >90% code coverage

## Support

For issues or questions about the test suite:

1. Check this README
2. Review existing tests for examples
3. Check pytest documentation: https://docs.pytest.org/
4. Review the API implementation for expected behavior

## License

Same as the main project.
