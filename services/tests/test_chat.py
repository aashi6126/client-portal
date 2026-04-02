"""Tests for AI chat backend."""

import pytest
import json
import os
import sys
from unittest.mock import patch, MagicMock

os.environ['DATABASE_URI'] = 'sqlite:///:memory:'
os.environ['LAN_ONLY'] = 'false'

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from api.customer_api import app, db
from api import customer_api
from api.chat import execute_tool, chat_with_ollama, TOOLS


@pytest.fixture(scope='function')
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    with app.app_context():
        customer_api.Session = customer_api.sessionmaker(bind=db.engine)
        db.create_all()
        yield app.test_client()
        db.session.remove()
        db.drop_all()


@pytest.fixture
def setup_data(client):
    """Create sample data for chat queries."""
    client_data = {
        'tax_id': '12-3456789',
        'client_name': 'Acme Corp',
        'status': 'Active',
        'contacts': [{'contact_person': 'John', 'email': 'john@acme.com'}]
    }
    client.post('/api/clients', data=json.dumps(client_data), content_type='application/json')

    comm_data = {
        'tax_id': '12-3456789',
        'general_liability_carrier': 'Hartford',
        'general_liability_premium': 5000.0,
        'general_liability_renewal_date': '2026-06-01',
    }
    client.post('/api/commercial', data=json.dumps(comm_data), content_type='application/json')

    benefit_data = {
        'tax_id': '12-3456789',
        'funding': 'Fully Insured',
        'plans': {'medical': [{'carrier': 'BlueCross', 'renewal_date': '2026-07-01'}]},
    }
    client.post('/api/benefits', data=json.dumps(benefit_data), content_type='application/json')


class TestToolDefinitions:
    """Verify tool definitions are well-formed."""

    def test_all_tools_have_required_fields(self):
        for tool in TOOLS:
            assert tool['type'] == 'function'
            func = tool['function']
            assert 'name' in func
            assert 'description' in func
            assert 'parameters' in func

    def test_expected_tools_exist(self):
        tool_names = [t['function']['name'] for t in TOOLS]
        assert 'search_clients' in tool_names
        assert 'get_benefits' in tool_names
        assert 'get_commercial' in tool_names
        assert 'get_personal' in tool_names
        assert 'get_individuals' in tool_names
        assert 'get_renewals' in tool_names
        assert 'get_cross_sell' in tool_names


class TestExecuteTool:
    """Tests for direct tool execution."""

    def test_search_clients(self, client, setup_data):
        with app.app_context():
            session = customer_api.Session()
            from api.customer_api import Client, EmployeeBenefit, CommercialInsurance, PersonalInsurance, Individual
            models = {'Client': Client, 'EmployeeBenefit': EmployeeBenefit,
                      'CommercialInsurance': CommercialInsurance, 'PersonalInsurance': PersonalInsurance,
                      'Individual': Individual}
            result = execute_tool('search_clients', {'query': 'Acme'}, session, models)
            assert len(result) == 1
            assert result[0]['client_name'] == 'Acme Corp'
            session.close()

    def test_search_clients_no_query(self, client, setup_data):
        with app.app_context():
            session = customer_api.Session()
            from api.customer_api import Client, EmployeeBenefit, CommercialInsurance, PersonalInsurance, Individual
            models = {'Client': Client, 'EmployeeBenefit': EmployeeBenefit,
                      'CommercialInsurance': CommercialInsurance, 'PersonalInsurance': PersonalInsurance,
                      'Individual': Individual}
            result = execute_tool('search_clients', {}, session, models)
            assert len(result) >= 1
            session.close()

    def test_get_commercial(self, client, setup_data):
        with app.app_context():
            session = customer_api.Session()
            from api.customer_api import Client, EmployeeBenefit, CommercialInsurance, PersonalInsurance, Individual
            models = {'Client': Client, 'EmployeeBenefit': EmployeeBenefit,
                      'CommercialInsurance': CommercialInsurance, 'PersonalInsurance': PersonalInsurance,
                      'Individual': Individual}
            result = execute_tool('get_commercial', {'tax_id': '12-3456789'}, session, models)
            assert len(result) == 1
            assert result[0]['general_liability_carrier'] == 'Hartford'
            session.close()

    def test_get_cross_sell(self, client, setup_data):
        with app.app_context():
            session = customer_api.Session()
            from api.customer_api import Client, EmployeeBenefit, CommercialInsurance, PersonalInsurance, Individual
            models = {'Client': Client, 'EmployeeBenefit': EmployeeBenefit,
                      'CommercialInsurance': CommercialInsurance, 'PersonalInsurance': PersonalInsurance,
                      'Individual': Individual}
            result = execute_tool('get_cross_sell', {}, session, models)
            assert 'benefits_only' in result
            assert 'commercial_only' in result
            assert 'total_opportunities' in result
            session.close()

    def test_unknown_tool(self, client):
        with app.app_context():
            session = customer_api.Session()
            result = execute_tool('nonexistent', {}, session, {})
            assert 'error' in result
            session.close()


class TestChatEndpoint:
    """Tests for POST /api/chat endpoint."""

    def test_missing_message(self, client):
        resp = client.post('/api/chat', data=json.dumps({}), content_type='application/json')
        assert resp.status_code == 400

    @patch('api.chat.http_requests.post')
    def test_chat_returns_response(self, mock_post, client, setup_data):
        """Test that chat endpoint works when Ollama returns a direct response."""
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                'message': {
                    'role': 'assistant',
                    'content': 'Hello! How can I help you today?'
                }
            }
        )
        mock_post.return_value.raise_for_status = lambda: None

        resp = client.post('/api/chat',
                          data=json.dumps({'message': 'Hello'}),
                          content_type='application/json')
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert 'response' in data
        assert data['response'] == 'Hello! How can I help you today?'

    @patch('api.chat.http_requests.post')
    def test_chat_ollama_unreachable(self, mock_post, client):
        """Test graceful error when Ollama is not running."""
        import requests
        mock_post.side_effect = requests.ConnectionError('Connection refused')

        resp = client.post('/api/chat',
                          data=json.dumps({'message': 'Hello'}),
                          content_type='application/json')
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert 'not available' in data['response'].lower() or 'ollama' in data['response'].lower()
