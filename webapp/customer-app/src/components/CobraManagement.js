import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CancelIcon from '@mui/icons-material/Cancel';
import UndoIcon from '@mui/icons-material/Undo';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

const CobraManagement = ({ clients = [], isAdmin = false }) => {
  const [coverages, setCoverages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [states, setStates] = useState([]);
  const [addDialog, setAddDialog] = useState(false);
  const [terminateDialog, setTerminateDialog] = useState({ open: false, id: null, name: '' });
  const [undoDialog, setUndoDialog] = useState({ open: false, id: null, name: '' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, name: '' });
  const [form, setForm] = useState({ first_name: '', last_name: '', tax_id: '', state: '', start_date: '', end_date: '', administration_type: '' });
  const [termForm, setTermForm] = useState({ termination_date: '', termination_reason: '' });
  const [search, setSearch] = useState('');

  const fetchCoverages = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/cobra');
      setCoverages(res.data);
    } catch (err) {
      console.error('Error fetching COBRA coverages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoverages();
    axios.get('/api/states').then(res => setStates(res.data)).catch(() => {});
  }, []);

  const filteredCoverages = useMemo(() => {
    let list = coverages;
    if (tab === 1) list = list.filter(c => c.status === 'active');
    if (tab === 2) list = list.filter(c => c.status === 'terminated');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        (c.first_name || '').toLowerCase().includes(q) ||
        (c.last_name || '').toLowerCase().includes(q) ||
        (c.client_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [coverages, tab, search]);

  const activeCount = coverages.filter(c => c.status === 'active').length;
  const terminatedCount = coverages.filter(c => c.status === 'terminated').length;

  const [error, setError] = useState(null);

  const handleAdd = async () => {
    try {
      setError(null);
      await axios.post('/api/cobra', form);
      setAddDialog(false);
      setForm({ first_name: '', last_name: '', tax_id: '', state: '', start_date: '', end_date: '', administration_type: '' });
      fetchCoverages();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add coverage');
    }
  };

  const handleTerminate = async () => {
    try {
      await axios.put(`/api/cobra/${terminateDialog.id}/terminate`, termForm);
      setTerminateDialog({ open: false, id: null, name: '' });
      setTermForm({ termination_date: '', termination_reason: '' });
      fetchCoverages();
    } catch (err) {
      console.error('Error terminating coverage:', err);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/cobra/${deleteDialog.id}`);
      setDeleteDialog({ open: false, id: null, name: '' });
      fetchCoverages();
    } catch (err) {
      console.error('Error deleting coverage:', err);
    }
  };

  const handleUndoTerminate = async () => {
    try {
      await axios.put(`/api/cobra/${undoDialog.id}/undo-terminate`);
      setUndoDialog({ open: false, id: null, name: '' });
      fetchCoverages();
    } catch (err) {
      console.error('Error undoing termination:', err);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    } catch { return d; }
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="h6">COBRA Coverages ({filteredCoverages.length})</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddDialog(true)}>
            Add Coverage
          </Button>
        </Box>
        <TextField
          label="Search by name or client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          variant="outlined"
          size="small"
          fullWidth
        />
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`All (${coverages.length})`} />
          <Tab label={`Active (${activeCount})`} />
          <Tab label={`Terminated (${terminatedCount})`} />
        </Tabs>

        {loading ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>Loading...</Typography>
        ) : filteredCoverages.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No COBRA coverages found
          </Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>First Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Last Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Client</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>State</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Start Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>End Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Administered By</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Termination Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Reason</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: 140 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCoverages.map((cov) => (
                  <TableRow key={cov.id} hover>
                    <TableCell>{cov.first_name}</TableCell>
                    <TableCell>{cov.last_name}</TableCell>
                    <TableCell>{cov.client_name || '—'}</TableCell>
                    <TableCell>{cov.state || '—'}</TableCell>
                    <TableCell>{formatDate(cov.start_date)}</TableCell>
                    <TableCell>{formatDate(cov.end_date)}</TableCell>
                    <TableCell>
                      {cov.administration_type === 'employer' ? (
                        <Chip label="Employer" size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                      ) : cov.administration_type === 'carrier' ? (
                        <Chip label="Carrier" size="small" color="info" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={cov.status === 'active' ? 'Active' : 'Terminated'}
                        size="small"
                        color={cov.status === 'active' ? 'success' : 'error'}
                        sx={{ fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell>{formatDate(cov.termination_date)}</TableCell>
                    <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cov.termination_reason || '—'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {cov.status === 'active' ? (
                          <Button
                            size="small"
                            startIcon={<CancelIcon />}
                            color="error"
                            onClick={() => {
                              setTerminateDialog({ open: true, id: cov.id, name: `${cov.first_name} ${cov.last_name}` });
                              setTermForm({ termination_date: new Date().toISOString().split('T')[0], termination_reason: '' });
                            }}
                            sx={{ fontSize: '0.7rem' }}
                          >
                            Terminate
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            startIcon={<UndoIcon />}
                            color="warning"
                            onClick={() => setUndoDialog({ open: true, id: cov.id, name: `${cov.first_name} ${cov.last_name}` })}
                            sx={{ fontSize: '0.7rem' }}
                          >
                            Undo
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            size="small"
                            startIcon={<DeleteIcon />}
                            color="error"
                            onClick={() => setDeleteDialog({ open: true, id: cov.id, name: `${cov.first_name} ${cov.last_name}` })}
                            sx={{ fontSize: '0.7rem' }}
                          >
                            Delete
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Add Coverage Dialog */}
      <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add COBRA Coverage</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2, mt: 1 }} onClose={() => setError(null)}>{error}</Alert>}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, mt: error ? 0 : 1 }}>
            <TextField label="First Name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} size="small" fullWidth required />
            <TextField label="Last Name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} size="small" fullWidth required />
          </Box>
          <TextField
            label="Client"
            select
            value={form.tax_id}
            onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
            size="small"
            fullWidth
            sx={{ mb: 2 }}
          >
            <MenuItem value="">— None —</MenuItem>
            {clients.map((c) => (
              <MenuItem key={c.tax_id} value={c.tax_id}>{c.client_name} ({c.tax_id})</MenuItem>
            ))}
          </TextField>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="State"
              select
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              size="small"
              fullWidth
            >
              <MenuItem value="">— None —</MenuItem>
              {states.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Administered By"
              select
              value={form.administration_type}
              onChange={(e) => setForm({ ...form, administration_type: e.target.value })}
              size="small"
              fullWidth
            >
              <MenuItem value="">— Unspecified —</MenuItem>
              <MenuItem value="employer">Employer Administered</MenuItem>
              <MenuItem value="carrier">Carrier Administered</MenuItem>
            </TextField>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Start Date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} size="small" fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="End Date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} size="small" fullWidth InputLabelProps={{ shrink: true }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialog(false)}>Cancel</Button>
          <Button onClick={handleAdd} variant="contained" disabled={!form.first_name.trim() || !form.last_name.trim()}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* Terminate Dialog */}
      <Dialog open={terminateDialog.open} onClose={() => setTerminateDialog({ open: false, id: null, name: '' })}>
        <DialogTitle>Terminate Coverage</DialogTitle>
        <DialogContent sx={{ pt: 2, minWidth: 350 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Terminate COBRA coverage for <strong>{terminateDialog.name}</strong>?
          </Typography>
          <TextField
            label="Termination Date"
            type="date"
            value={termForm.termination_date}
            onChange={(e) => setTermForm({ ...termForm, termination_date: e.target.value })}
            fullWidth size="small" InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Reason"
            value={termForm.termination_reason}
            onChange={(e) => setTermForm({ ...termForm, termination_reason: e.target.value })}
            fullWidth size="small" multiline minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTerminateDialog({ open: false, id: null, name: '' })}>Cancel</Button>
          <Button onClick={handleTerminate} variant="contained" color="error">Terminate</Button>
        </DialogActions>
      </Dialog>

      {/* Undo Termination Dialog */}
      <Dialog open={undoDialog.open} onClose={() => setUndoDialog({ open: false, id: null, name: '' })}>
        <DialogTitle>Undo Termination</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to undo the termination for <strong>{undoDialog.name}</strong>? This will reactivate the coverage.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUndoDialog({ open: false, id: null, name: '' })}>Cancel</Button>
          <Button onClick={handleUndoTerminate} variant="contained" color="warning">Undo Termination</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null, name: '' })}>
        <DialogTitle>Delete COBRA Coverage</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Permanently delete COBRA coverage for <strong>{deleteDialog.name}</strong>? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null, name: '' })}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CobraManagement;
