import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Stack,
  CircularProgress,
  Chip,
} from '@mui/material';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import PasswordRules from './PasswordRules';
import { isPasswordValid } from '../passwordPolicy';

function clearInviteFromUrl() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('invite');
    window.history.replaceState({}, '', url.pathname + (url.search || '') + url.hash);
  } catch {
    // ignore
  }
}

export default function AcceptInvitePage({ token }) {
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(null);
  const [lookupError, setLookupError] = useState('');

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLookupError('');
    axios
      .get('/api/invitations/lookup', { params: { token } })
      .then((res) => {
        if (!cancelled) setInvite(res.data);
      })
      .catch((err) => {
        if (!cancelled) setLookupError(err.response?.data?.error || 'Could not load invitation');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!username.trim()) {
      setSubmitError('Choose a username.');
      return;
    }
    if (!isPasswordValid(password, username.trim())) {
      setSubmitError('Password does not meet the policy below.');
      return;
    }
    if (password !== confirm) {
      setSubmitError('Password and confirmation do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post('/api/invitations/accept', {
        token,
        username: username.trim(),
        password,
        full_name: fullName,
      });
      setSuccess('Account created. Redirecting to sign in...');
      clearInviteFromUrl();
      setTimeout(() => {
        window.location.href = window.location.pathname;
      }, 1200);
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Could not create account');
    } finally {
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
              backgroundColor: 'primary.main',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HowToRegIcon />
          </Box>
          <Typography variant="h5" fontWeight={700} textAlign="center">
            Accept your invitation
          </Typography>
          {invite && (
            <Typography variant="body2" color="text.secondary" textAlign="center">
              You were invited as <strong>{invite.email}</strong>{' '}
              <Chip
                label={invite.role}
                size="small"
                color={invite.role === 'admin' ? 'primary' : 'default'}
                variant={invite.role === 'admin' ? 'filled' : 'outlined'}
                sx={{ ml: 0.5 }}
              />
            </Typography>
          )}
        </Stack>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!loading && lookupError && (
          <Stack spacing={2}>
            <Alert severity="error">{lookupError}</Alert>
            <Button
              variant="outlined"
              onClick={() => {
                clearInviteFromUrl();
                window.location.href = window.location.pathname;
              }}
            >
              Go to sign in
            </Button>
          </Stack>
        )}

        {!loading && !lookupError && invite && (
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {submitError && <Alert severity="error">{submitError}</Alert>}
              {success && <Alert severity="success">{success}</Alert>}
              <TextField
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                size="small"
                fullWidth
                autoFocus
                autoComplete="username"
              />
              <TextField
                label="Full name (optional)"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                size="small"
                fullWidth
                autoComplete="new-password"
              />
              <PasswordRules password={password} username={username} />
              <TextField
                label="Confirm password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                size="small"
                fullWidth
                autoComplete="new-password"
                error={!!confirm && confirm !== password}
                helperText={!!confirm && confirm !== password ? 'Does not match the password' : ' '}
              />
              <Button type="submit" variant="contained" size="large" disabled={submitting}>
                {submitting ? 'Creating account...' : 'Create account'}
              </Button>
            </Stack>
          </form>
        )}
      </Paper>
    </Box>
  );
}
