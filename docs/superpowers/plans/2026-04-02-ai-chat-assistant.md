# AI Chat Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a floating AI chat assistant powered by Qwen (via Ollama) that lets internal staff query client data, find renewals, and draft communications using natural language.

**Architecture:** Frontend ChatBubble component sends messages to `POST /api/chat`. Backend orchestrates a tool-calling loop with Ollama — Qwen decides which internal DB queries to run, backend executes them, feeds results back, and returns the final answer.

**Tech Stack:** Python requests (Ollama API), React/MUI (chat UI), Ollama (local LLM)

---

### Task 1: Create the chat backend module

**Files:**
- Create: `services/api/chat.py`

- [ ] **Step 1: Create the chat module with tool definitions and Ollama integration**

Create `services/api/chat.py`:

```python
"""
AI Chat assistant backend.
Connects to Ollama (Qwen) with tool-calling to query the client portal database.
"""

import os
import json
import logging
import requests as http_requests
from datetime import datetime

OLLAMA_URL = os.environ.get('OLLAMA_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.environ.get('OLLAMA_MODEL', 'qwen3:30b-a3b')

SYSTEM_PROMPT = """You are an AI assistant for Edison General Insurance Service, an insurance brokerage located at 22 Meridian Road, Suite 16, Edison, NJ 08820.

You help internal staff (agents and brokers) look up client data, find policy information, check upcoming renewals, identify cross-sell opportunities, and draft professional communications.

RULES:
- Only use data returned by your tools. NEVER make up client names, policy details, or numbers.
- If a tool returns no results, say so clearly.
- You can draft emails, summaries, and reports based on the data.
- You CANNOT create, update, or delete any records.
- Be concise and professional.
- When listing data, use formatted tables or bullet points for readability.
- Today's date is {today}.
"""

# Tool definitions for Ollama API
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_clients",
            "description": "Search for clients by name, tax ID, or status. Returns client details including contact info, revenue, and employee count. Use when the user asks about a specific client or wants to find clients.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Optional search term to filter clients by name or tax ID. Leave empty to get all clients."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_benefits",
            "description": "Get employee benefits records. Returns benefits data including carriers, renewal dates, plan details for medical/dental/vision/life, and contribution percentages. Use when the user asks about employee benefits, health insurance, or benefits renewals.",
            "parameters": {
                "type": "object",
                "properties": {
                    "tax_id": {
                        "type": "string",
                        "description": "Optional tax ID to filter benefits for a specific client."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_commercial",
            "description": "Get commercial insurance records. Returns data for all commercial policy types: GL, property, BOP, workers comp, auto, umbrella, professional E&O, cyber, EPLI, and more. Includes carriers, premiums, renewal dates, and limits. Use when the user asks about commercial insurance, liability, property coverage, or commercial renewals.",
            "parameters": {
                "type": "object",
                "properties": {
                    "tax_id": {
                        "type": "string",
                        "description": "Optional tax ID to filter commercial records for a specific client."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_personal",
            "description": "Get personal insurance records. Returns personal auto, homeowners, personal umbrella, event, and visitors medical insurance data. Use when the user asks about personal insurance or individual coverage.",
            "parameters": {
                "type": "object",
                "properties": {
                    "individual_id": {
                        "type": "string",
                        "description": "Optional individual ID to filter personal records."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_individuals",
            "description": "Get individual (non-business) records. Returns individual details like name, contact info, and status. Use when the user asks about individuals or personal lines clients.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Optional search term to filter by name."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_renewals",
            "description": "Get all upcoming policy renewals across benefits, commercial, and personal insurance for the next 12 months. Returns renewal dates, client names, policy types, and carriers. Use when the user asks about upcoming renewals, what's expiring, or renewal schedules.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_cross_sell",
            "description": "Get cross-sell opportunities — clients who have only employee benefits OR only commercial insurance, but not both. Use when the user asks about cross-sell opportunities, missing coverage, or sales leads.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    }
]


def execute_tool(tool_name, arguments, session, models):
    """
    Execute a tool call by querying the database directly.

    Args:
        tool_name: Name of the tool to execute
        arguments: Dict of arguments from the LLM
        session: SQLAlchemy session
        models: Dict of model classes {Client, EmployeeBenefit, CommercialInsurance, etc.}

    Returns:
        JSON-serializable result
    """
    Client = models['Client']
    EmployeeBenefit = models['EmployeeBenefit']
    CommercialInsurance = models['CommercialInsurance']
    PersonalInsurance = models['PersonalInsurance']
    Individual = models['Individual']

    try:
        if tool_name == 'search_clients':
            query = arguments.get('query', '')
            q = session.query(Client)
            if query:
                q = q.filter(
                    Client.client_name.ilike(f'%{query}%') |
                    Client.tax_id.ilike(f'%{query}%')
                )
            clients = q.limit(50).all()
            return [c.to_dict() for c in clients]

        elif tool_name == 'get_benefits':
            tax_id = arguments.get('tax_id', '')
            q = session.query(EmployeeBenefit)
            if tax_id:
                q = q.filter(EmployeeBenefit.tax_id == tax_id)
            benefits = q.limit(50).all()
            return [b.to_dict() for b in benefits]

        elif tool_name == 'get_commercial':
            tax_id = arguments.get('tax_id', '')
            q = session.query(CommercialInsurance)
            if tax_id:
                q = q.filter(CommercialInsurance.tax_id == tax_id)
            records = q.limit(50).all()
            return [r.to_dict() for r in records]

        elif tool_name == 'get_personal':
            individual_id = arguments.get('individual_id', '')
            q = session.query(PersonalInsurance)
            if individual_id:
                q = q.filter(PersonalInsurance.individual_id == individual_id)
            records = q.limit(50).all()
            return [r.to_dict() for r in records]

        elif tool_name == 'get_individuals':
            query = arguments.get('query', '')
            q = session.query(Individual)
            if query:
                q = q.filter(
                    Individual.first_name.ilike(f'%{query}%') |
                    Individual.last_name.ilike(f'%{query}%') |
                    Individual.individual_id.ilike(f'%{query}%')
                )
            individuals = q.limit(50).all()
            return [i.to_dict() for i in individuals]

        elif tool_name == 'get_renewals':
            # Import here to avoid circular — call the dashboard logic
            from datetime import timedelta
            today = datetime.now().date()
            end_date = today + timedelta(days=365)
            renewals = []

            # Benefits renewals
            for b in session.query(EmployeeBenefit).all():
                client_name = b.client.client_name if b.client else 'Unknown'
                for field, label in [
                    ('renewal_date', 'Medical'), ('dental_renewal_date', 'Dental'),
                    ('vision_renewal_date', 'Vision'), ('life_adnd_renewal_date', 'Life & AD&D'),
                    ('ltd_renewal_date', 'LTD'), ('std_renewal_date', 'STD'),
                    ('k401_renewal_date', '401K'),
                ]:
                    rd = getattr(b, field)
                    if rd and today <= rd <= end_date:
                        renewals.append({
                            'type': 'benefits', 'policy_type': label,
                            'renewal_date': rd.isoformat(), 'client_name': client_name,
                            'tax_id': b.tax_id, 'carrier': getattr(b, field.replace('_renewal_date', '_carrier') if 'renewal_date' in field else 'current_carrier', None) or ''
                        })

            # Commercial renewals
            comm_types = [
                ('general_liability', 'General Liability'), ('property', 'Property'),
                ('bop', 'BOP'), ('workers_comp', 'Workers Comp'), ('auto', 'Auto'),
                ('epli', 'EPLI'), ('nydbl', 'NYDBL'), ('surety', 'Surety'),
                ('product_liability', 'Product Liability'), ('flood', 'Flood'),
                ('directors_officers', 'D&O'), ('fiduciary', 'Fiduciary'),
                ('inland_marine', 'Inland Marine'),
            ]
            for c in session.query(CommercialInsurance).all():
                client_name = c.client.client_name if c.client else 'Unknown'
                for prefix, label in comm_types:
                    rd = getattr(c, f'{prefix}_renewal_date')
                    if rd and today <= rd <= end_date:
                        renewals.append({
                            'type': 'commercial', 'policy_type': label,
                            'renewal_date': rd.isoformat(), 'client_name': client_name,
                            'tax_id': c.tax_id, 'carrier': getattr(c, f'{prefix}_carrier') or ''
                        })

            renewals.sort(key=lambda x: x['renewal_date'])
            return renewals[:100]

        elif tool_name == 'get_cross_sell':
            benefit_tax_ids = set(b.tax_id for b in session.query(EmployeeBenefit).all())
            commercial_tax_ids = set(c.tax_id for c in session.query(CommercialInsurance).all())

            benefits_only_ids = benefit_tax_ids - commercial_tax_ids
            commercial_only_ids = commercial_tax_ids - benefit_tax_ids

            benefits_only = []
            for client in session.query(Client).filter(Client.tax_id.in_(benefits_only_ids)).all():
                benefits_only.append({'tax_id': client.tax_id, 'client_name': client.client_name})

            commercial_only = []
            for client in session.query(Client).filter(Client.tax_id.in_(commercial_only_ids)).all():
                commercial_only.append({'tax_id': client.tax_id, 'client_name': client.client_name})

            return {
                'benefits_only': benefits_only,
                'commercial_only': commercial_only,
                'total_opportunities': len(benefits_only) + len(commercial_only)
            }

        else:
            return {'error': f'Unknown tool: {tool_name}'}

    except Exception as e:
        logging.error(f"Tool execution error ({tool_name}): {e}")
        return {'error': str(e)}


def chat_with_ollama(message, history, session, models):
    """
    Send a message to Ollama with tool support, execute tool calls, return final response.

    Args:
        message: User's message string
        history: List of previous messages [{"role": "user/assistant", "content": "..."}]
        session: SQLAlchemy session
        models: Dict of model classes

    Returns:
        dict with 'response' key containing the assistant's reply
    """
    today = datetime.now().strftime('%B %-d, %Y')
    system_msg = SYSTEM_PROMPT.format(today=today)

    messages = [{"role": "system", "content": system_msg}]
    messages.extend(history or [])
    messages.append({"role": "user", "content": message})

    max_tool_rounds = 5

    for _ in range(max_tool_rounds):
        try:
            resp = http_requests.post(
                f'{OLLAMA_URL}/api/chat',
                json={
                    'model': OLLAMA_MODEL,
                    'messages': messages,
                    'tools': TOOLS,
                    'stream': False,
                },
                timeout=120
            )
            resp.raise_for_status()
            result = resp.json()
        except http_requests.ConnectionError:
            return {'response': 'AI assistant is not available. Please ensure Ollama is running.'}
        except http_requests.Timeout:
            return {'response': 'The AI assistant took too long to respond. Please try a simpler question.'}
        except Exception as e:
            logging.error(f"Ollama API error: {e}")
            return {'response': f'Error communicating with AI: {str(e)}'}

        assistant_msg = result.get('message', {})
        tool_calls = assistant_msg.get('tool_calls', [])

        if not tool_calls:
            # No tool calls — return the final response
            content = assistant_msg.get('content', '')
            return {'response': content}

        # Process tool calls
        messages.append(assistant_msg)

        for tc in tool_calls:
            func = tc.get('function', {})
            tool_name = func.get('name', '')
            arguments = func.get('arguments', {})

            logging.info(f"AI tool call: {tool_name}({arguments})")
            tool_result = execute_tool(tool_name, arguments, session, models)

            # Truncate large results to avoid token overflow
            result_str = json.dumps(tool_result, default=str)
            if len(result_str) > 15000:
                # Keep first 15000 chars and note truncation
                result_str = result_str[:15000] + '\n... (results truncated, showing first 50 records)'

            messages.append({
                "role": "tool",
                "content": result_str
            })

    return {'response': 'I made too many queries trying to answer your question. Please try a more specific question.'}
```

- [ ] **Step 2: Verify the module imports correctly**

Run from `services/` directory:
```bash
cd /Users/aman/projects/client-portal/services && /usr/bin/python3 -c "from api.chat import chat_with_ollama, TOOLS; print(f'OK - {len(TOOLS)} tools defined')"
```

Expected: `OK - 7 tools defined`

- [ ] **Step 3: Commit**

```bash
git add services/api/chat.py
git commit -m "feat: add chat backend module with Ollama tool-calling integration"
```

---

### Task 2: Add chat API endpoint to customer_api.py

**Files:**
- Modify: `services/api/customer_api.py`

- [ ] **Step 1: Add import for chat module**

Add after the invoice import (around line 20-23) in `customer_api.py`:

```python
try:
    from api.chat import chat_with_ollama
except ImportError:
    from chat import chat_with_ollama
```

- [ ] **Step 2: Add the chat endpoint**

Add before the React catch-all routes (search for `@app.route('/', defaults=` to find the right spot, add before it):

```python
# ===========================================================================
# CHAT ENDPOINT
# ===========================================================================

@app.route('/api/chat', methods=['POST'])
def chat_endpoint():
    """Handle AI chat messages with tool-calling support."""
    session = Session()
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({'error': 'message is required'}), 400

        message = data['message']
        history = data.get('history', [])

        models = {
            'Client': Client,
            'EmployeeBenefit': EmployeeBenefit,
            'CommercialInsurance': CommercialInsurance,
            'PersonalInsurance': PersonalInsurance,
            'Individual': Individual,
        }

        result = chat_with_ollama(message, history, session, models)
        return jsonify(result), 200

    except Exception as e:
        logging.error(f"Chat endpoint error: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()
```

- [ ] **Step 3: Verify API starts**

```bash
pkill -f customer_api.py 2>/dev/null; sleep 1; /usr/bin/python3 /Users/aman/projects/client-portal/services/api/customer_api.py > /dev/null 2>&1 &
sleep 3; curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5001/api/health
```

Expected: `200`

- [ ] **Step 4: Commit**

```bash
git add services/api/customer_api.py
git commit -m "feat: add /api/chat endpoint for AI assistant"
```

---

### Task 3: Create ChatBubble React component

**Files:**
- Create: `webapp/customer-app/src/components/ChatBubble.js`

- [ ] **Step 1: Create the ChatBubble component**

Create `webapp/customer-app/src/components/ChatBubble.js`:

```jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  IconButton,
  TextField,
  Typography,
  Paper,
  CircularProgress,
  Fab,
  Badge
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import axios from 'axios';

export default function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      // Build history (exclude the message we're sending now)
      const history = messages.map(m => ({ role: m.role, content: m.content }));

      const response = await axios.post('/api/chat', {
        message: text,
        history: history,
      }, { timeout: 120000 });

      const assistantMsg = { role: 'assistant', content: response.data.response };
      setMessages([...updatedMessages, assistantMsg]);
    } catch (err) {
      const errorText = err.response?.data?.error || err.response?.data?.response || 'Failed to get response. Is the AI assistant running?';
      setMessages([...updatedMessages, { role: 'assistant', content: `Error: ${errorText}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open) {
    return (
      <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1300 }}>
        <Fab
          color="primary"
          onClick={() => setOpen(true)}
          sx={{
            width: 56, height: 56,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          }}
        >
          <ChatIcon />
        </Fab>
      </Box>
    );
  }

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 420,
        height: 550,
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box sx={{
        background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
        color: 'white',
        px: 2, py: 1.5,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartToyIcon fontSize="small" />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            AI Assistant
          </Typography>
        </Box>
        <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'white' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Messages */}
      <Box sx={{
        flex: 1,
        overflow: 'auto',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        bgcolor: '#f5f5f5',
      }}>
        {messages.length === 0 && (
          <Box sx={{ textAlign: 'center', mt: 4, color: '#999' }}>
            <SmartToyIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
            <Typography variant="body2" sx={{ color: '#888' }}>
              Ask me about clients, policies, renewals, or coverage.
            </Typography>
            <Typography variant="caption" sx={{ color: '#aaa', display: 'block', mt: 1 }}>
              Try: "Which clients have GL renewals next month?"
            </Typography>
          </Box>
        )}
        {messages.map((msg, idx) => (
          <Box
            key={idx}
            sx={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <Box sx={{
              maxWidth: '85%',
              px: 1.5, py: 1,
              borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              bgcolor: msg.role === 'user' ? '#1976d2' : 'white',
              color: msg.role === 'user' ? 'white' : '#333',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              fontSize: '0.875rem',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {msg.content}
            </Box>
          </Box>
        ))}
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" sx={{ color: '#888' }}>Thinking...</Typography>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Box sx={{
        p: 1.5,
        borderTop: '1px solid #e0e0e0',
        bgcolor: 'white',
        display: 'flex',
        gap: 1,
        alignItems: 'flex-end',
      }}>
        <TextField
          inputRef={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about clients, policies, renewals..."
          size="small"
          fullWidth
          multiline
          maxRows={3}
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '20px',
              fontSize: '0.875rem',
            }
          }}
        />
        <IconButton
          onClick={handleSend}
          disabled={!input.trim() || loading}
          color="primary"
          size="small"
          sx={{ mb: 0.5 }}
        >
          <SendIcon fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
  );
}
```

- [ ] **Step 2: Verify the component compiles**

Check the React dev server terminal for compilation errors (it auto-reloads).

- [ ] **Step 3: Commit**

```bash
git add webapp/customer-app/src/components/ChatBubble.js
git commit -m "feat: add ChatBubble floating chat component"
```

---

### Task 4: Integrate ChatBubble into App.js

**Files:**
- Modify: `webapp/customer-app/src/App.js`

- [ ] **Step 1: Add ChatBubble import**

Add after the existing component imports at the top of `App.js` (search for the last component import like `import PersonalTable` or `import Dashboard`):

```javascript
import ChatBubble from './components/ChatBubble';
```

- [ ] **Step 2: Add ChatBubble to the render**

Add `<ChatBubble />` just before the closing `</Box>` at the very end of the return statement (search for the last `</Box>` before the `);` that closes the return):

```jsx
      <ChatBubble />
    </Box>
  );
```

- [ ] **Step 3: Verify it renders**

Open http://localhost:3000 — a blue chat bubble should appear in the bottom-right corner on all tabs. Clicking it should expand the chat window.

- [ ] **Step 4: Commit**

```bash
git add webapp/customer-app/src/App.js
git commit -m "feat: add ChatBubble to main app layout"
```

---

### Task 5: Write tests for chat backend

**Files:**
- Create: `services/tests/test_chat.py`

- [ ] **Step 1: Create test file**

Create `services/tests/test_chat.py`:

```python
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
```

- [ ] **Step 2: Run the tests**

```bash
cd /Users/aman/projects/client-portal/services && /usr/bin/python3 -m pytest tests/test_chat.py -v
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add services/tests/test_chat.py
git commit -m "test: add tests for chat backend and tool execution"
```

---

### Task 6: Final integration test and push

**Files:** None (manual verification)

- [ ] **Step 1: Restart the API**

```bash
pkill -f customer_api.py 2>/dev/null; sleep 1; /usr/bin/python3 /Users/aman/projects/client-portal/services/api/customer_api.py > /dev/null 2>&1 &
```

- [ ] **Step 2: Run the full test suite**

```bash
cd /Users/aman/projects/client-portal/services && /usr/bin/python3 -m pytest tests/test_core_functionality.py tests/test_schema_export_import_sync.py tests/test_invoice.py tests/test_chat.py -v
```

Expected: All tests pass.

- [ ] **Step 3: Verify end-to-end**

Open http://localhost:3000. Click the chat bubble in the bottom-right. Type "Hello" and send. If Ollama is running with Qwen, you should get a response. If Ollama is not running, you should see a friendly error message.

- [ ] **Step 4: Commit and push**

```bash
git add -A
git commit -m "feat: AI chat assistant with Ollama/Qwen integration"
git push
```
