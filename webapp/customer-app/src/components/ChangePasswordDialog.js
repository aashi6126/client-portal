import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Alert,
} from '@mui/material';
import PasswordRules from './PasswordRules';
import { isPasswordValid } from '../passwordPolicy';
import { useAuth } from '../AuthContext';

export default function ChangePasswordDialog({ open, onClose }) {
  const { user } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrent('');
      setNext('');
      setConfirm('');
      setError('');
      setSuccess('');
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
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
      setSuccess('Password updated.');
      setTimeout(() => onClose?.(), 800);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Change password</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit" disabled={submitting}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
