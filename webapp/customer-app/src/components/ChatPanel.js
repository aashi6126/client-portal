import React, { useState, useRef, useEffect } from 'react';
import { Box, IconButton, TextField, Typography, Paper, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import axios from 'axios';

export default function ChatPanel() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await axios.post('/api/chat', {
        message: text,
        history: history,
      }, { timeout: 120000 });

      setMessages([...updatedMessages, { role: 'assistant', content: response.data.response }]);
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

  return (
    <Paper sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 76px)', overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: 1 }}>
        <SmartToyIcon fontSize="small" color="primary" />
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>AI Assistant</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          Ask about clients, policies, renewals, or coverage
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: '#fafafa' }}>
        {messages.length === 0 && (
          <Box sx={{ textAlign: 'center', mt: 8, color: '#999' }}>
            <SmartToyIcon sx={{ fontSize: 56, mb: 1, opacity: 0.15 }} />
            <Typography variant="body2" color="text.secondary">
              Ask me about clients, policies, renewals, or coverage.
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
              Try: "Which clients have GL renewals next month?"
            </Typography>
          </Box>
        )}
        {messages.map((msg, idx) => (
          <Box key={idx} sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <Box sx={{
              maxWidth: '75%',
              px: 1.5, py: 1,
              borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              backgroundColor: msg.role === 'user' ? '#1976d2' : '#fff',
              color: msg.role === 'user' ? '#fff' : '#333',
              border: msg.role === 'user' ? 'none' : '1px solid #e0e0e0',
              fontSize: '0.85rem',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {msg.content}
            </Box>
          </Box>
        ))}
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#999' }}>
            <CircularProgress size={16} />
            <Typography variant="caption">Thinking...</Typography>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Box sx={{ p: 1.5, borderTop: '1px solid #e0e0e0', display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          inputRef={inputRef}
          disabled={loading}
          multiline
          maxRows={3}
        />
        <IconButton color="primary" onClick={handleSend} disabled={!input.trim() || loading}>
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
}
