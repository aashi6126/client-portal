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
      <Box sx={{ position: 'fixed', bottom: 64, right: 24, zIndex: 1300 }}>
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
        bottom: 64,
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
