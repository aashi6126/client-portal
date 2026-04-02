"""
Comprehensive tests for invoice PDF generation and invoice API endpoints.
"""

import pytest
import json
import os
import sys

# Ensure test DB is set before importing app
os.environ['DATABASE_URI'] = 'sqlite:///:memory:'
os.environ['LAN_ONLY'] = 'false'

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'api')))

from api.customer_api import app, db, InvoiceSequence
from api import customer_api
from api.invoice import generate_invoice_pdf, _collect_line_items


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture(scope='function')
def client():
    """Create a test client with isolated in-memory database."""
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'

    with app.app_context():
        customer_api.Session = customer_api.sessionmaker(bind=db.engine)
        db.create_all()
        yield app.test_client()
        db.session.remove()
        db.drop_all()


@pytest.fixture
def setup_commercial(client):
    """Create a client + commercial record for testing."""
    client_data = {
        'tax_id': '12-3456789',
        'client_name': 'Test Corp',
        'status': 'Active',
        'contacts': [{
            'contact_person': 'John',
            'email': 'john@testcorp.com',
            'address_line_1': '100 Main St',
            'city': 'Edison',
            'state': 'NJ',
            'zip_code': '08820',
        }]
    }
    client.post('/api/clients', data=json.dumps(client_data), content_type='application/json')
    comm_data = {
        'tax_id': '12-3456789',
        'general_liability_carrier': 'Hartford',
        'general_liability_premium': 5000.0,
        'general_liability_renewal_date': '2026-06-01',
        'general_liability_policy_number': 'GL-001',
        'property_carrier': 'Zurich',
        'property_premium': 3000.0,
        'auto_carrier': 'Travelers',
        'auto_premium': 2500.0,
    }
    resp = client.post('/api/commercial', data=json.dumps(comm_data), content_type='application/json')
    return json.loads(resp.data)['commercial']


# ============================================================================
# TEST PDF GENERATION
# ============================================================================

class TestPDFGeneration:
    """Tests for the generate_invoice_pdf function."""

    def test_generate_pdf_returns_bytes(self):
        """Generate PDF with one item, verify starts with PDF magic bytes."""
        line_items = [{
            'label': 'Commercial General Liability',
            'carrier': 'Hartford',
            'policy_number': 'GL-001',
            'premium': 5000.0,
            'renewal_date': '2026-06-01',
        }]
        buf = generate_invoice_pdf(
            invoice_number=100001,
            invoice_date='2026-04-01',
            client_name='Test Corp',
            client_address='100 Main St\nEdison, NJ 08820',
            client_tax_id='12-3456789',
            line_items=line_items,
        )
        pdf_bytes = buf.read()
        assert pdf_bytes[:5] == b'%PDF-'

    def test_generate_pdf_multiple_items(self):
        """Generate PDF with 2 items, verify valid PDF."""
        line_items = [
            {
                'label': 'Commercial General Liability',
                'carrier': 'Hartford',
                'policy_number': 'GL-001',
                'premium': 5000.0,
                'renewal_date': '2026-06-01',
            },
            {
                'label': 'Commercial Property',
                'carrier': 'Zurich',
                'policy_number': 'PR-002',
                'premium': 3000.0,
                'renewal_date': '2026-07-01',
            },
        ]
        buf = generate_invoice_pdf(
            invoice_number=100002,
            invoice_date='2026-04-01',
            client_name='Test Corp',
            client_address='100 Main St\nEdison, NJ 08820',
            client_tax_id='12-3456789',
            line_items=line_items,
        )
        pdf_bytes = buf.read()
        assert pdf_bytes[:5] == b'%PDF-'


# ============================================================================
# TEST COLLECT LINE ITEMS
# ============================================================================

class TestCollectLineItems:
    """Tests for the _collect_line_items helper."""

    def test_single_plan_types(self):
        """Commercial data with GL + property yields 2 items with correct labels/premiums."""
        data = {
            'general_liability_carrier': 'Hartford',
            'general_liability_premium': 5000.0,
            'general_liability_policy_number': 'GL-001',
            'general_liability_renewal_date': '2026-06-01',
            'property_carrier': 'Zurich',
            'property_premium': 3000.0,
            'property_policy_number': 'PR-002',
            'property_renewal_date': '2026-07-01',
        }
        items = _collect_line_items(data, ['general_liability', 'property'])
        assert len(items) == 2
        assert items[0]['label'] == 'Commercial General Liability'
        assert items[0]['premium'] == 5000.0
        assert items[1]['label'] == 'Commercial Property'
        assert items[1]['premium'] == 3000.0

    def test_multi_plan_types(self):
        """Commercial data with umbrella plan in plans dict yields 1 item."""
        data = {
            'plans': {
                'umbrella': [{
                    'carrier': 'CNA',
                    'premium': 7500.0,
                    'policy_number': 'UMB-001',
                    'renewal_date': '2026-08-01',
                }]
            }
        }
        items = _collect_line_items(data, ['umbrella'])
        assert len(items) == 1
        assert items[0]['label'] == 'Umbrella Liability'
        assert items[0]['premium'] == 7500.0

    def test_empty_policies_excluded(self):
        """Data with empty carrier and zero/no premium yields 0 items."""
        data = {
            'flood_carrier': '',
            'flood_premium': 0,
        }
        items = _collect_line_items(data, ['flood'])
        assert len(items) == 0

    def test_unselected_types_excluded(self):
        """Data with GL + property but only select GL yields 1 item."""
        data = {
            'general_liability_carrier': 'Hartford',
            'general_liability_premium': 5000.0,
            'property_carrier': 'Zurich',
            'property_premium': 3000.0,
        }
        items = _collect_line_items(data, ['general_liability'])
        assert len(items) == 1
        assert items[0]['label'] == 'Commercial General Liability'


# ============================================================================
# TEST INVOICE SEQUENCE
# ============================================================================

class TestInvoiceSequence:
    """Tests for the InvoiceSequence model."""

    def test_sequence_auto_increments(self, client):
        """Calling next_number twice yields n2 == n1 + 1."""
        with app.app_context():
            session = customer_api.Session()
            try:
                n1 = InvoiceSequence.next_number(session)
                n2 = InvoiceSequence.next_number(session)
                assert n2 == n1 + 1
                session.commit()
            finally:
                session.close()

    def test_sequence_starts_from_default(self, client):
        """First call returns 536659 (default 536658 + 1)."""
        with app.app_context():
            session = customer_api.Session()
            try:
                n = InvoiceSequence.next_number(session)
                assert n == 536659
                session.commit()
            finally:
                session.close()


# ============================================================================
# TEST INVOICE PREVIEW ENDPOINT
# ============================================================================

class TestInvoicePreviewEndpoint:
    """Tests for POST /api/invoice/preview."""

    def test_preview_returns_pdf(self, client, setup_commercial):
        """POST with valid commercial_id + policy_types returns 200 + PDF content."""
        commercial = setup_commercial
        resp = client.post('/api/invoice/preview', data=json.dumps({
            'commercial_id': commercial['id'],
            'policy_types': ['general_liability'],
        }), content_type='application/json')
        assert resp.status_code == 200
        assert resp.data[:5] == b'%PDF-'

    def test_preview_multiple_policies(self, client, setup_commercial):
        """POST with 3 policy types returns 200."""
        commercial = setup_commercial
        resp = client.post('/api/invoice/preview', data=json.dumps({
            'commercial_id': commercial['id'],
            'policy_types': ['general_liability', 'property', 'auto'],
        }), content_type='application/json')
        assert resp.status_code == 200

    def test_preview_missing_commercial_id(self, client):
        """POST without commercial_id returns 400."""
        resp = client.post('/api/invoice/preview', data=json.dumps({
            'policy_types': ['general_liability'],
        }), content_type='application/json')
        assert resp.status_code == 400

    def test_preview_nonexistent_commercial(self, client):
        """POST with id=99999 returns 404."""
        resp = client.post('/api/invoice/preview', data=json.dumps({
            'commercial_id': 99999,
            'policy_types': ['general_liability'],
        }), content_type='application/json')
        assert resp.status_code == 404

    def test_preview_no_active_policies(self, client, setup_commercial):
        """POST with policy type not populated (flood) returns 400."""
        commercial = setup_commercial
        resp = client.post('/api/invoice/preview', data=json.dumps({
            'commercial_id': commercial['id'],
            'policy_types': ['flood'],
        }), content_type='application/json')
        assert resp.status_code == 400


# ============================================================================
# TEST INVOICE SEND ENDPOINT
# ============================================================================

class TestInvoiceSendEndpoint:
    """Tests for POST /api/invoice/send."""

    def test_send_missing_email(self, client, setup_commercial):
        """POST without to_email returns 400 with 'to_email' in error."""
        commercial = setup_commercial
        resp = client.post('/api/invoice/send', data=json.dumps({
            'commercial_id': commercial['id'],
            'policy_types': ['general_liability'],
        }), content_type='application/json')
        assert resp.status_code == 400
        data = json.loads(resp.data)
        assert 'to_email' in data['error']

    def test_send_no_smtp_credentials(self, client, setup_commercial):
        """POST with valid data but no SMTP env vars returns 500 with 'SMTP' in error."""
        commercial = setup_commercial
        # Ensure SMTP credentials are empty
        old_user = os.environ.get('SMTP_USERNAME', '')
        old_pass = os.environ.get('SMTP_PASSWORD', '')
        os.environ['SMTP_USERNAME'] = ''
        os.environ['SMTP_PASSWORD'] = ''
        # Reload the SMTP config in customer_api
        customer_api.SMTP_USERNAME = ''
        customer_api.SMTP_PASSWORD = ''
        try:
            resp = client.post('/api/invoice/send', data=json.dumps({
                'commercial_id': commercial['id'],
                'policy_types': ['general_liability'],
                'to_email': 'test@example.com',
            }), content_type='application/json')
            assert resp.status_code == 500
            data = json.loads(resp.data)
            assert 'SMTP' in data['error']
        finally:
            os.environ['SMTP_USERNAME'] = old_user
            os.environ['SMTP_PASSWORD'] = old_pass
            customer_api.SMTP_USERNAME = old_user
            customer_api.SMTP_PASSWORD = old_pass
