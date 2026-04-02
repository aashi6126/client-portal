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
    valid_tools = {'search_clients', 'get_benefits', 'get_commercial', 'get_personal',
                   'get_individuals', 'get_renewals', 'get_cross_sell'}
    if tool_name not in valid_tools:
        return {'error': f'Unknown tool: {tool_name}'}

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
