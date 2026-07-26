import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Alert,
  FormControlLabel,
  Checkbox,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { useAuth } from '../AuthContext';

const STATUSES = ['Open', 'In Progress', 'Blocked', 'Done'];
const PRIORITIES = ['Low', 'Medium', 'High'];

const STATUS_COLOR = {
  'Open': 'default',
  'In Progress': 'info',
  'Blocked': 'warning',
  'Done': 'success',
};

const PRIORITY_COLOR = {
  Low: 'default',
  Medium: 'info',
  High: 'error',
};

const EMPTY_FORM = {
  title: '',
  description: '',
  status: 'Open',
  priority: 'Medium',
  assignee_id: '',
};

function formatWhen(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function Tasks() {
  const { user, isAdmin } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);       // for assignee dropdown / filter
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [hideDone, setHideDone] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');    // admin-only
  const [search, setSearch] = useState('');

  // Edit / create modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  // Detail drawer (comments / status update)
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTask, setDetailTask] = useState(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [statusDraft, setStatusDraft] = useState('');

  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState({ open: false, task: null });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (!hideDone) params.include_done = 'true';
      else params.include_done = 'false';
      if (statusFilter) params.status = statusFilter;
      if (isAdmin && assigneeFilter) params.assignee_id = assigneeFilter;
      const { data } = await axios.get('/api/tasks', { params });
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [hideDone, statusFilter, assigneeFilter, isAdmin]);

  const fetchAssignableUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data } = await axios.get('/api/tasks/assignable-users');
      setUsers(data.users || []);
    } catch {
      // Non-fatal — the dropdown just stays empty.
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    fetchAssignableUsers();
  }, [fetchAssignableUsers]);

  const filteredTasks = useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.trim().toLowerCase();
    return tasks.filter(t =>
      (t.title || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.assignee_full_name || '').toLowerCase().includes(q) ||
      (t.assignee_username || '').toLowerCase().includes(q)
    );
  }, [tasks, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, assignee_id: user?.id ? String(user.id) : '' });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setForm({
      title: t.title || '',
      description: t.description || '',
      status: t.status,
      priority: t.priority,
      assignee_id: t.assignee_id != null ? String(t.assignee_id) : '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const saveTask = async () => {
    setFormError('');
    if (!form.title.trim()) {
      setFormError('Title is required.');
      return;
    }
    const payload = {
      title: form.title.trim(),
      description: form.description,
      status: form.status,
      priority: form.priority,
      assignee_id: form.assignee_id === '' ? null : Number(form.assignee_id),
    };
    try {
      if (editing) {
        await axios.patch(`/api/tasks/${editing.id}`, payload);
      } else {
        await axios.post('/api/tasks', payload);
      }
      setModalOpen(false);
      fetchTasks();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Save failed');
    }
  };

  const openDetail = async (t) => {
    try {
      const { data } = await axios.get(`/api/tasks/${t.id}`);
      setDetailTask(data.task);
      setStatusDraft(data.task.status);
      setCommentDraft('');
      setDetailOpen(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to load task');
    }
  };

  const canEditTask = (t) => isAdmin;
  const canDeleteTask = (t) => isAdmin;
  const canUpdateStatus = (t) => isAdmin || t.assignee_id === user?.id;
  const canComment = (t) => isAdmin || t.assignee_id === user?.id;

  const changeStatusInline = async (t, newStatus) => {
    try {
      await axios.patch(`/api/tasks/${t.id}`, { status: newStatus });
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to change status');
    }
  };

  const submitComment = async () => {
    if (!commentDraft.trim() || !detailTask) return;
    setPostingComment(true);
    try {
      await axios.post(`/api/tasks/${detailTask.id}/comments`, {
        body: commentDraft.trim(),
      });
      // Also apply an inline status change if the user picked one
      if (statusDraft && statusDraft !== detailTask.status) {
        await axios.patch(`/api/tasks/${detailTask.id}`, { status: statusDraft });
      }
      // Refresh detail + list
      const { data } = await axios.get(`/api/tasks/${detailTask.id}`);
      setDetailTask(data.task);
      setStatusDraft(data.task.status);
      setCommentDraft('');
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to post update');
    } finally {
      setPostingComment(false);
    }
  };

  const applyDetailStatus = async () => {
    if (!detailTask || statusDraft === detailTask.status) return;
    try {
      await axios.patch(`/api/tasks/${detailTask.id}`, { status: statusDraft });
      const { data } = await axios.get(`/api/tasks/${detailTask.id}`);
      setDetailTask(data.task);
      setStatusDraft(data.task.status);
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to change status');
    }
  };

  const confirmDelete = async () => {
    if (!deleteDialog.task) return;
    try {
      await axios.delete(`/api/tasks/${deleteDialog.task.id}`);
      setDeleteDialog({ open: false, task: null });
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed');
      setDeleteDialog({ open: false, task: null });
    }
  };

  return (
    <Box mt={2}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Box>
            <span className="page-eyebrow">Admin · Work</span>
            <Typography variant="h6">
              Tasks{isAdmin ? '' : ' assigned to you'} ({filteredTasks.length}{filteredTasks.length !== tasks.length ? ` of ${tasks.length}` : ''})
            </Typography>
          </Box>
          {isAdmin && (
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openCreate}>
              New Task
            </Button>
          )}
        </Stack>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: 200 }}
          />
          <TextField
            label="Status"
            select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">All statuses</MenuItem>
            {STATUSES.map(s => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>
          {isAdmin && (
            <TextField
              label="Assignee"
              select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">All assignees</MenuItem>
              {users.map(u => (
                <MenuItem key={u.id} value={u.id}>
                  {u.full_name || u.username}
                </MenuItem>
              ))}
            </TextField>
          )}
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={hideDone}
                onChange={(e) => setHideDone(e.target.checked)}
              />
            }
            label="Hide done"
            sx={{ whiteSpace: 'nowrap', mr: 0 }}
          />
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 320px)' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 110 }}>Actions</TableCell>
              <TableCell sx={{ minWidth: 260 }}>Title</TableCell>
              <TableCell sx={{ minWidth: 130 }}>Status</TableCell>
              <TableCell sx={{ minWidth: 100 }}>Priority</TableCell>
              <TableCell sx={{ minWidth: 160 }}>Assignee</TableCell>
              <TableCell sx={{ minWidth: 90 }}>Updates</TableCell>
              <TableCell sx={{ minWidth: 150 }}>Updated</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  {isAdmin ? 'No tasks yet — click “New Task” to add one.' : 'No tasks assigned to you.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredTasks.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell>
                    <Tooltip title="Open / add update">
                      <IconButton size="small" onClick={() => openDetail(t)}>
                        <ChatBubbleOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {canEditTask(t) && (
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(t)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canDeleteTask(t) && (
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteDialog({ open: true, task: t })}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{ cursor: 'pointer' }}
                      onClick={() => openDetail(t)}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {t.title}
                      </Typography>
                      {t.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {t.description.length > 100 ? t.description.slice(0, 97) + '…' : t.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {canUpdateStatus(t) ? (
                      <TextField
                        select
                        value={t.status}
                        onChange={(e) => changeStatusInline(t, e.target.value)}
                        size="small"
                        sx={{ minWidth: 130 }}
                      >
                        {STATUSES.map(s => (
                          <MenuItem key={s} value={s}>{s}</MenuItem>
                        ))}
                      </TextField>
                    ) : (
                      <Chip
                        label={t.status}
                        size="small"
                        color={STATUS_COLOR[t.status] || 'default'}
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={t.priority}
                      size="small"
                      color={PRIORITY_COLOR[t.priority] || 'default'}
                      variant={t.priority === 'High' ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell>
                    {t.assignee_full_name ? (
                      <>
                        {t.assignee_full_name}
                        {t.assignee_id === user?.id && (
                          <Chip label="you" size="small" sx={{ ml: 1, fontSize: '0.6rem', height: 16 }} />
                        )}
                      </>
                    ) : (
                      <Typography variant="caption" color="text.secondary">unassigned</Typography>
                    )}
                  </TableCell>
                  <TableCell>{t.comment_count || 0}</TableCell>
                  <TableCell>{formatWhen(t.updated_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create / edit modal */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit task' : 'New task'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              label="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              size="small"
              fullWidth
              required
              autoFocus
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              size="small"
              fullWidth
              multiline
              rows={4}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Status"
                select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                size="small"
                sx={{ flex: 1 }}
              >
                {STATUSES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
              <TextField
                label="Priority"
                select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                size="small"
                sx={{ flex: 1 }}
              >
                {PRIORITIES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
            </Stack>
            <TextField
              label="Assignee"
              select
              value={form.assignee_id}
              onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}
              size="small"
              fullWidth
            >
              <MenuItem value="">Unassigned</MenuItem>
              {users.map(u => (
                <MenuItem key={u.id} value={String(u.id)}>
                  {u.full_name || u.username}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)} color="inherit">Cancel</Button>
          <Button
            onClick={saveTask}
            variant="contained"
            disabled={!form.title.trim()}
          >
            {editing ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail drawer (dialog): comments + status */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {detailTask?.title || 'Task'}
        </DialogTitle>
        <DialogContent dividers>
          {detailTask && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip
                  label={detailTask.status}
                  size="small"
                  color={STATUS_COLOR[detailTask.status] || 'default'}
                />
                <Chip
                  label={detailTask.priority}
                  size="small"
                  color={PRIORITY_COLOR[detailTask.priority] || 'default'}
                  variant={detailTask.priority === 'High' ? 'filled' : 'outlined'}
                />
                <Typography variant="caption" color="text.secondary">
                  Assigned to <strong>{detailTask.assignee_full_name || 'nobody'}</strong>
                  {detailTask.created_by_username && (
                    <> · created by {detailTask.created_by_username}</>
                  )}
                </Typography>
              </Stack>

              {detailTask.description && (
                <Paper variant="outlined" sx={{ p: 1.5, backgroundColor: '#fafbfc' }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {detailTask.description}
                  </Typography>
                </Paper>
              )}

              <Divider>Updates ({detailTask.comments?.length || 0})</Divider>

              {(!detailTask.comments || detailTask.comments.length === 0) ? (
                <Typography variant="caption" color="text.secondary">
                  No updates yet.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {detailTask.comments.map(c => (
                    <Box key={c.id} sx={{ pl: 1, borderLeft: '2px solid #e2e8f0' }}>
                      <Typography variant="caption" color="text.secondary">
                        <strong>{c.author_full_name || c.author_username || 'unknown'}</strong> · {formatWhen(c.created_at)}
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {c.body}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}

              {canComment(detailTask) && (
                <>
                  <Divider>Post an update</Divider>
                  {canUpdateStatus(detailTask) && (
                    <Stack direction="row" spacing={2} alignItems="center">
                      <TextField
                        label="Status"
                        select
                        value={statusDraft}
                        onChange={(e) => setStatusDraft(e.target.value)}
                        size="small"
                        sx={{ minWidth: 160 }}
                      >
                        {STATUSES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                      </TextField>
                      {statusDraft !== detailTask.status && (
                        <Button size="small" onClick={applyDetailStatus} variant="outlined">
                          Change status only
                        </Button>
                      )}
                    </Stack>
                  )}
                  <TextField
                    label="Add an update / comment"
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    size="small"
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Progress note, blocker, question…"
                  />
                </>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)} color="inherit">Close</Button>
          {detailTask && canComment(detailTask) && (
            <Button
              onClick={submitComment}
              variant="contained"
              disabled={postingComment || !commentDraft.trim()}
            >
              {postingComment
                ? 'Posting…'
                : statusDraft !== detailTask.status
                  ? 'Post update & change status'
                  : 'Post update'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, task: null })}>
        <DialogTitle>Delete task</DialogTitle>
        <DialogContent>
          <Typography>
            Delete task <strong>{deleteDialog.task?.title}</strong>? This also removes all its updates and cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, task: null })} color="inherit">Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
