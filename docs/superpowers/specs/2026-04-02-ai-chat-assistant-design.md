# AI Chat Assistant for Client Portal

## Overview

Add a floating AI chat assistant powered by Qwen (via Ollama) that lets the internal team query client data, find renewals, summarize coverage, and draft emails using natural language.

## Architecture

Browser → Flask backend (`POST /api/chat`) → Ollama (Qwen) with tool-calling loop → response streamed back to chat UI.

The backend acts as a proxy between the chat UI and Ollama. It:
1. Receives the user's message + conversation history
2. Sends it to Qwen with a system prompt describing available tools (API endpoints)
3. When Qwen requests a tool call, the backend executes the corresponding internal API query
4. Feeds results back to Qwen for final answer generation
5. Returns the response to the frontend

## Frontend

### ChatBubble Component
- Floating button in the bottom-right corner, visible on all tabs
- Clicking expands into a chat window (~400px wide, ~500px tall)
- Message history displayed with user/assistant message bubbles
- Text input at the bottom with send button
- Close/minimize button to collapse back to bubble
- Conversation history kept in React state (resets on page refresh)
- Shows typing indicator while waiting for response

### Placement
- Rendered in App.js, outside the tab content — always visible
- z-index above other content
- Does not interfere with existing modals

## Backend

### POST /api/chat

**Request:**
```json
{
  "message": "Which clients have GL renewals next month?",
  "history": [
    {"role": "user", "content": "previous question"},
    {"role": "assistant", "content": "previous answer"}
  ]
}
```

**Response:**
```json
{
  "response": "Here are the clients with GL renewals next month:\n\n1. Acme Corp - renewal date 5/1/2026..."
}
```

### Tool-Calling Flow

The backend defines these tools for Qwen:

| Tool | Maps to | Purpose |
|------|---------|---------|
| `search_clients` | `GET /api/clients` | Search/list clients by name, status |
| `get_benefits` | `GET /api/benefits` | Get employee benefits records |
| `get_commercial` | `GET /api/commercial` | Get commercial insurance records |
| `get_personal` | `GET /api/personal` | Get personal insurance records |
| `get_renewals` | `GET /api/dashboard/renewals` | Get upcoming renewals |
| `get_cross_sell` | `GET /api/dashboard/cross-sell` | Get cross-sell opportunities |
| `get_individuals` | `GET /api/individuals` | Search individuals |

When Qwen's response includes a tool call:
1. Backend parses the tool name and arguments
2. Calls the corresponding internal function (direct DB query via Session, not HTTP)
3. Feeds the result back to Qwen as a tool response
4. Qwen generates the final natural language answer
5. Supports multiple sequential tool calls per question

### System Prompt

The system prompt tells Qwen:
- It is an assistant for Edison General Insurance Service
- It helps internal staff look up client data, policies, renewals, and draft communications
- It has access to tools for querying the database
- It should NOT make up data — only use what the tools return
- It can draft emails and summaries but cannot modify any records
- It should be concise and professional

## Capabilities

**Can do:**
- Answer questions about clients, policies, coverage, renewals
- Search clients by name, tax ID, status
- Find upcoming renewals by date range
- Summarize a client's full coverage portfolio
- Draft professional emails (renewal reminders, policy summaries)
- Identify cross-sell opportunities
- Compare coverage across clients

**Cannot do:**
- Create, update, or delete any records
- Send emails or invoices
- Access external data or the internet
- Make decisions — only presents data

## Configuration

Environment variables:
- `OLLAMA_URL` — Ollama server URL (default: `http://localhost:11434`)
- `OLLAMA_MODEL` — Model to use (default: `qwen3:30b-a3b`)

## Error Handling

- Ollama not running: return friendly error "AI assistant is not available. Please ensure Ollama is running."
- Model not found: return error with model name
- Timeout: 120 second timeout for Ollama responses
- Tool call errors: catch and feed error back to Qwen so it can explain to user

## Files to Create/Modify

### New Files
- `services/api/chat.py` — chat endpoint logic, tool definitions, Ollama integration
- `webapp/customer-app/src/components/ChatBubble.js` — floating chat UI component

### Modified Files
- `services/api/customer_api.py` — register chat blueprint/routes
- `webapp/customer-app/src/App.js` — render ChatBubble component
