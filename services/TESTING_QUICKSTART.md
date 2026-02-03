# Testing Quick Start Guide

Get started with testing the Customer API in 5 minutes.

## Quick Setup

```bash
# 1. Navigate to services directory
cd /Users/aman/workspaces/client-portal/services

# 2. Install test dependencies
pip install -r test_requirements.txt

# 3. Run tests
pytest
```

That's it! 🎉

## Common Commands

```bash
# Run all tests
pytest

# Run with detailed output
pytest -v

# Run specific test file
pytest tests/test_customer_api.py

# Run specific test
pytest tests/test_customer_api.py::TestGetCustomers::test_get_customers_empty_database

# Run with coverage
pytest --cov=api

# Generate HTML coverage report
pytest --cov=api --cov-report=html
open htmlcov/index.html
```

## Using Make (Easier)

```bash
# Run tests
make test

# Run with coverage
make test-coverage

# Generate HTML coverage report
make coverage-html

# Run only unit tests
make test-unit

# Run only integration tests
make test-integration

# Clean up generated files
make clean
```

## Expected Output

When tests run successfully, you'll see:

```
================================ test session starts =================================
platform darwin -- Python 3.x.x, pytest-7.4.3
plugins: cov-4.1.0, mock-3.12.0
collected 50 items

tests/test_customer_api.py::TestGetCustomers::test_get_customers_empty_database PASSED [  2%]
tests/test_customer_api.py::TestGetCustomers::test_get_customers_with_data PASSED     [  4%]
...
tests/test_customer_api.py::TestIntegration::test_bulk_operations PASSED            [100%]

================================ 50 passed in 2.34s ==================================
```

## Test Categories

| Category | Command | Description |
|----------|---------|-------------|
| All Tests | `pytest` | Run entire test suite |
| Unit Tests | `pytest -m unit` | Fast tests for individual functions |
| Integration | `pytest -m integration` | End-to-end workflow tests |
| Database | `pytest -m database` | Tests requiring database |

## First Time Setup Checklist

- [ ] Python 3.8+ installed
- [ ] In the services directory
- [ ] Installed test dependencies: `pip install -r test_requirements.txt`
- [ ] Tests run successfully: `pytest`
- [ ] Coverage report generated: `pytest --cov=api`

## Troubleshooting

### "No module named pytest"
```bash
pip install -r test_requirements.txt
```

### "No module named api.customer_api"
```bash
# Make sure you're in the services directory
cd /Users/aman/workspaces/client-portal/services
pytest
```

### Tests are slow
```bash
# Run in parallel
pip install pytest-xdist
pytest -n auto
```

## Writing Your First Test

Create a new test in `tests/test_customer_api.py`:

```python
def test_my_feature(test_client, sample_customer_data):
    """Test my new feature."""
    # Create a customer
    response = test_client.post('/api/customers',
                               data=json.dumps([sample_customer_data]),
                               content_type='application/json')

    # Verify it worked
    assert response.status_code == 201
    data = json.loads(response.data)
    assert 'customer_id' in data
```

Run your new test:
```bash
pytest tests/test_customer_api.py::test_my_feature -v
```

## Coverage Goals

- **Target**: >90% code coverage
- **Check coverage**: `pytest --cov=api --cov-report=term-missing`
- **View details**: `pytest --cov=api --cov-report=html && open htmlcov/index.html`

## CI/CD Integration

Tests run automatically on:
- Every commit (if pre-commit hook enabled)
- Every push to GitHub (if CI configured)
- Every pull request

## Next Steps

1. ✅ Run tests successfully
2. 📖 Read [tests/README.md](tests/README.md) for detailed documentation
3. 🔍 Explore existing tests in [tests/test_customer_api.py](tests/test_customer_api.py)
4. ✏️ Write tests for new features
5. 📊 Monitor coverage reports

## Need Help?

- Check [tests/README.md](tests/README.md) for detailed documentation
- Review [tests/test_customer_api.py](tests/test_customer_api.py) for examples
- Visit pytest docs: https://docs.pytest.org/

## Pro Tips

💡 **Run tests before committing**: `make test && git commit`

💡 **Use watch mode during development**: `pytest-watch`

💡 **Check coverage regularly**: `make coverage-html`

💡 **Run fast tests first**: `pytest -m "not slow"`

💡 **Debug failing tests**: `pytest --pdb` (drops into debugger on failure)
