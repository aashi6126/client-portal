import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Switch,
  FormControlLabel,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EmailIcon from '@mui/icons-material/Email';
import RefreshIcon from '@mui/icons-material/Refresh';
import CancelIcon from '@mui/icons-material/Cancel';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useAuth } from '../AuthContext';
import PasswordRules from './PasswordRules';
import { isPasswordValid } from '../passwordPolicy';

const EMPTY_FORM = { username: '', password: '', role: 'user', full_name: '', email: '', is_active: true };

export default function UserManagement() {
  const { user: currentUser, loginEnabled, setLoginEnabled, authDisabled } = useAuth();
  const [toggling, setToggling] = useState(false);

  const handleToggleLogin = async (e) => {
    const enabled = e.target.checked;
    if (!enabled && !window.confirm(
      'Disable login for all non-admin users? They will be signed out on their next request and unable to log back in until you re-enable this.'
    )) {
      return;
    }
    setToggling(true);
    try {
      const { data } = await axios.put('/api/settings/login', { enabled });
      setLoginEnabled(!!data.login_enabled);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update login setting');
    } finally {
      setToggling(false);
    }
  };
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = create
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });

  // Invitations
  const [invitations, setInvitations] = useState([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'user' });
  const [inviteError, setInviteError] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteResultUrl, setInviteResultUrl] = useState(''); // dev-mode accept URL
  const [copied, setCopied] = useState(false);

  const fetchInvitations = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/invitations');
      setInvitations(data.invitations || []);
    } catch (err) {
      // ignore — surfaced via main error path if needed
    }
  }, []);

  const openInvite = () => {
    setInviteForm({ email: '', role: 'user' });
    setInviteError('');
    setInviteResultUrl('');
    setCopied(false);
    setInviteDialogOpen(true);
  };

  const handleInviteSubmit = async () => {
    setInviteError('');
    setInviteResultUrl('');
    if (!inviteForm.email.trim()) {
      setInviteError('Email is required.');
      return;
    }
    setInviteSending(true);
    try {
      const { data } = await axios.post('/api/invitations', {
        email: inviteForm.email.trim(),
        role: inviteForm.role,
      });
      if (data.accept_url) {
        // SMTP not configured — show the URL so the admin can share it directly.
        setInviteResultUrl(data.accept_url);
      } else {
        setInviteDialogOpen(false);
      }
      fetchInvitations();
    } catch (err) {
      setInviteError(err.response?.data?.error || 'Failed to send invitation');
    } finally {
      setInviteSending(false);
    }
  };

  const handleResendInvite = async (inv) => {
    try {
      const { data } = await axios.post(`/api/invitations/${inv.id}/resend`);
      if (data.accept_url) {
        setInviteForm({ email: inv.email, role: inv.role });
        setInviteResultUrl(data.accept_url);
        setInviteDialogOpen(true);
      }
      fetchInvitations();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend invitation');
    }
  };

  const handleRevokeInvite = async (inv) => {
    if (!window.confirm(`Revoke invitation for ${inv.email}?`)) return;
    try {
      await axios.delete(`/api/invitations/${inv.id}`);
      fetchInvitations();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to revoke invitation');
    }
  };

  const copyInviteUrl = async () => {
    try {
      await navigator.clipboard.writeText(inviteResultUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get('/api/users');
      setUsers(data.users || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchInvitations();
  }, [fetchUsers, fetchInvitations]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      username: u.username,
      password: '',
      role: u.role,
      full_name: u.full_name || '',
      email: u.email || '',
      is_active: u.is_active,
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setFormError('');
    try {
      if (editing) {
        const payload = {
          role: form.role,
          full_name: form.full_name,
          email: form.email,
          is_active: form.is_active,
        };
        if (form.password) payload.password = form.password;
        await axios.put(`/api/users/${editing.id}`, payload);
      } else {
        if (!form.username.trim() || !form.password) {
          setFormError('Username and password are required.');
          return;
        }
        await axios.post('/api/users', {
          username: form.username.trim(),
          password: form.password,
          role: form.role,
          full_name: form.full_name,
          email: form.email,
        });
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Save failed');
    }
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`/api/users/${deleteDialog.user.id}`);
      setDeleteDialog({ open: false, user: null });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
      setDeleteDialog({ open: false, user: null });
    }
  };

  return (
    <Box mt={2}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="subtitle1" fontWeight={600}>Login access</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={loginEnabled}
                  onChange={handleToggleLogin}
                  disabled={toggling || authDisabled}
                  color={loginEnabled ? 'success' : 'warning'}
                />
              }
              label={loginEnabled ? 'Enabled' : 'Disabled (non-admins blocked)'}
            />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Admins can always sign in so this switch can be reversed.
          </Typography>
        </Stack>
      </Paper>

      {authDisabled && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Authentication is disabled server-side (AUTH_DISABLED=true).</strong> Every request is
          treated as an admin user named <code>system</code>. User and invitation management still works
          but has no effect on access control until you unset AUTH_DISABLED and restart the API.
        </Alert>
      )}
      {!authDisabled && !loginEnabled && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Login is currently disabled. Non-admin users cannot sign in and active non-admin sessions
          will be ended on their next request.
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Users ({users.length})</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" color="primary" startIcon={<EmailIcon />} onClick={openInvite}>
              Invite by email
            </Button>
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openCreate}>
              Add User
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 80 }}>Actions</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Full Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Login</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Loading...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No users
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEdit(u)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={currentUser?.id === u.id ? "You can't delete your own account" : 'Delete'}>
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={currentUser?.id === u.id}
                          onClick={() => setDeleteDialog({ open: true, user: u })}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <strong>{u.username}</strong>
                    {currentUser?.id === u.id && (
                      <Chip label="you" size="small" sx={{ ml: 1, fontSize: '0.65rem', height: 18 }} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={u.role}
                      size="small"
                      color={u.role === 'admin' ? 'primary' : 'default'}
                      variant={u.role === 'admin' ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell>{u.full_name || '—'}</TableCell>
                  <TableCell>{u.email || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={u.is_active ? 'Active' : 'Disabled'}
                      size="small"
                      color={u.is_active ? 'success' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {invitations.length > 0 && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 4, mb: 1, fontWeight: 600 }}>
            Invitations ({invitations.length})
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 100 }}>Actions</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Invited by</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invitations.map((inv) => {
                  const isPending = inv.status === 'pending';
                  const isExpired = inv.status === 'expired';
                  return (
                    <TableRow key={inv.id} hover>
                      <TableCell>
                        {(isPending || isExpired) && (
                          <>
                            <Tooltip title="Resend (generates a fresh link)">
                              <IconButton size="small" onClick={() => handleResendInvite(inv)}>
                                <RefreshIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Revoke">
                              <IconButton size="small" color="error" onClick={() => handleRevokeInvite(inv)}>
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </TableCell>
                      <TableCell>{inv.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={inv.role}
                          size="small"
                          color={inv.role === 'admin' ? 'primary' : 'default'}
                          variant={inv.role === 'admin' ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={inv.status}
                          size="small"
                          color={
                            inv.status === 'accepted'
                              ? 'success'
                              : inv.status === 'expired'
                              ? 'warning'
                              : 'default'
                          }
                          variant="outlined"
                        />
                        {inv.accepted_username && (
                          <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                            → {inv.accepted_username}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{inv.invited_by || '—'}</TableCell>
                      <TableCell>{inv.expires_at ? new Date(inv.expires_at).toLocaleString() : '—'}</TableCell>
                      <TableCell>{inv.created_at ? new Date(inv.created_at).toLocaleString() : '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Invite a new user</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {inviteError && <Alert severity="error">{inviteError}</Alert>}
            {inviteResultUrl && (
              <Alert severity="info" action={
                <Button size="small" startIcon={<ContentCopyIcon />} onClick={copyInviteUrl}>
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              }>
                SMTP is not configured — share this link manually:
                <Box sx={{ mt: 0.5, fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.75rem' }}>
                  {inviteResultUrl}
                </Box>
              </Alert>
            )}
            <TextField
              label="Email"
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              size="small"
              fullWidth
              required
              autoFocus
              disabled={!!inviteResultUrl}
            />
            <TextField
              label="Role"
              select
              value={inviteForm.role}
              onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
              size="small"
              fullWidth
              disabled={!!inviteResultUrl}
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)} color="inherit">
            {inviteResultUrl ? 'Done' : 'Cancel'}
          </Button>
          {!inviteResultUrl && (
            <Button onClick={handleInviteSubmit} variant="contained" disabled={inviteSending}>
              {inviteSending ? 'Sending...' : 'Send invite'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing ? `Edit ${editing.username}` : 'Add User'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              label="Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              disabled={!!editing}
              size="small"
              fullWidth
              required
            />
            <TextField
              label={editing ? 'New password (leave blank to keep current)' : 'Password'}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              size="small"
              fullWidth
              required={!editing}
              autoComplete="new-password"
            />
            {(form.password || !editing) && (
              <PasswordRules
                password={form.password}
                username={editing ? editing.username : form.username}
              />
            )}
            <TextField
              label="Role"
              select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              size="small"
              fullWidth
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </TextField>
            <TextField
              label="Full name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              size="small"
              fullWidth
            />
            <TextField
              label="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              size="small"
              fullWidth
            />
            {editing && (
              <FormControlLabel
                control={
                  <Switch
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                }
                label="Active"
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)} color="inherit">Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={
              // For create: must have valid username + password meeting policy.
              // For edit: only validate password if user typed one.
              editing
                ? !!form.password && !isPasswordValid(form.password, editing.username)
                : !form.username.trim() || !isPasswordValid(form.password, form.username)
            }
          >
            {editing ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, user: null })}>
        <DialogTitle>Delete user</DialogTitle>
        <DialogContent>
          <Typography>
            Delete user <strong>{deleteDialog.user?.username}</strong>? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, user: null })} color="inherit">Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
