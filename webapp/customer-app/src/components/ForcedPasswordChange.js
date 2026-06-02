import React, { useState } from 'react';
import axios from 'axios';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Stack,
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import PasswordRules from './PasswordRules';
import { isPasswordValid } from '../passwordPolicy';
import { useAuth } from '../AuthContext';

export default function ForcedPasswordChange() {
  const { user, logout, refresh } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!current) {
      setError('Enter your current password.');
      return;
    }
    if (!isPasswordValid(next, user?.username || '')) {
      setError('New password does not meet the policy below.');
      return;
    }
    if (next !== confirm) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (next === current) {
      setError('New password must be different from your current password.');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post('/api/me/password', { current_password: current, new_password: next });
      // Re-fetch /api/me so the cleared flag propagates and the app unlocks.
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update password');
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f1629 0%, #1a1f3a 100%)',
        p: 2,
      }}
    >
      <Paper elevation={6} sx={{ p: 4, width: '100%', maxWidth: 420, borderRadius: 3 }}>
        <Stack alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: 'warning.main',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LockResetIcon />
          </Box>
          <Typography variant="h5" fontWeight={700} textAlign="center">
            Set a new password
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            {user?.username ? <>Signed in as <strong>{user.username}</strong>. </> : ''}
            You must change your password before continuing.
          </Typography>
        </Stack>

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Current password"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              size="small"
              fullWidth
              autoComplete="current-password"
              autoFocus
            />
            <TextField
              label="New password"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              size="small"
              fullWidth
              autoComplete="new-password"
            />
            <PasswordRules password={next} username={user?.username || ''} />
            <TextField
              label="Confirm new password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              size="small"
              fullWidth
              autoComplete="new-password"
              error={!!confirm && confirm !== next}
              helperText={!!confirm && confirm !== next ? 'Does not match the new password' : ' '}
            />
            <Stack direction="row" spacing={1} justifyContent="space-between">
              <Button onClick={logout} color="inherit" disabled={submitting}>
                Sign out
              </Button>
              <Button type="submit" variant="contained" disabled={submitting}>
                {submitting ? 'Saving...' : 'Update password'}
              </Button>
            </Stack>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
