# Makefile for Customer API Service

.PHONY: help install test test-verbose test-coverage test-unit test-integration clean lint format

# Default target
help:
	@echo "Customer API - Available Commands"
	@echo "=================================="
	@echo "make install          - Install all dependencies"
	@echo "make install-test     - Install test dependencies only"
	@echo "make test             - Run all tests"
	@echo "make test-verbose     - Run tests with verbose output"
	@echo "make test-coverage    - Run tests with coverage report"
	@echo "make test-unit        - Run unit tests only"
	@echo "make test-integration - Run integration tests only"
	@echo "make test-watch       - Run tests in watch mode"
	@echo "make coverage-html    - Generate HTML coverage report"
	@echo "make clean            - Clean up generated files"
	@echo "make lint             - Run code linting"
	@echo "make format           - Format code with black"
	@echo "make run              - Start the API service"
	@echo "make run-dev          - Start API in development mode"

# Installation
install:
	pip install -r requirements.txt
	pip install -r test_requirements.txt

install-test:
	pip install -r test_requirements.txt

# Testing
test:
	pytest

test-verbose:
	pytest -v

test-coverage:
	pytest --cov=api --cov-report=term-missing

test-unit:
	pytest -m unit -v

test-integration:
	pytest -m integration -v

test-watch:
	pytest-watch

coverage-html:
	pytest --cov=api --cov-report=html
	@echo "Coverage report generated at htmlcov/index.html"
	@open htmlcov/index.html || xdg-open htmlcov/index.html || echo "Open htmlcov/index.html in your browser"

# Code quality
lint:
	@command -v flake8 >/dev/null 2>&1 || { echo "Installing flake8..."; pip install flake8; }
	flake8 api/ tests/ --max-line-length=120

format:
	@command -v black >/dev/null 2>&1 || { echo "Installing black..."; pip install black; }
	black api/ tests/

# Running the service
run:
	python3 api/customer_api.py

run-dev:
	FLASK_ENV=development python3 api/customer_api.py

# Cleanup
clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name htmlcov -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name ".coverage" -delete
	find . -type f -name "coverage.xml" -delete
	@echo "Cleaned up generated files"

# Database
db-shell:
	sqlite3 customer.db

db-backup:
	cp customer.db customer.db.backup.$(shell date +%Y%m%d_%H%M%S)
	@echo "Database backed up"

# Quick test and run
test-and-run: test
	python3 api/customer_api.py
