import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, TextField,
  Autocomplete, Chip, Alert, Snackbar, Dialog,
  DialogTitle, DialogContent, DialogContentText, DialogActions,
  Checkbox
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import axios from 'axios';

const PocManagement = ({ dataVersion }) => {
  const [pocList, setPocList] = useState([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [targetPoc, setTargetPoc] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  // Records for partial reassignment
  const [pocRecords, setPocRecords] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loadingRecords, setLoadingRecords] = useState(false);

  const fetchPocSummary = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/benefits/poc-summary');
      setPocList(res.data.pocs || []);
      setUnassignedCount(res.data.unassigned_count || 0);
    } catch (err) {
      console.error('Error fetching PoC summary:', err);
      setSnackbar({ open: true, message: 'Failed to load PoC summary', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPocSummary();
  }, [dataVersion]);

  const openReassignDialog = async (item) => {
    setSelectedItem(item);
    setTargetPoc('');
    setSelectedIds(new Set());
    // Fetch the actual records for this PoC
    setLoadingRecords(true);
    try {
      const res = await axios.get('/api/benefits');
      const records = (res.data.benefits || []).filter(
        b => b.enrollment_poc === item.poc
      );
      setPocRecords(records);
      // Default: all selected
      setSelectedIds(new Set(records.map(r => r.id)));
    } catch (err) {
      console.error('Error fetching records:', err);
      setPocRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  const closeReassignDialog = () => {
    setSelectedItem(null);
    setTargetPoc('');
    setPocRecords([]);
    setSelectedIds(new Set());
  };

  const toggleRecord = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === pocRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pocRecords.map(r => r.id)));
    }
  };

  const handleReassign = async () => {
    if (!selectedItem || !targetPoc.trim() || selectedIds.size === 0) return;

    setReassigning(true);
    try {
      const isAllSelected = selectedIds.size === pocRecords.length;
      const payload = isAllSelected
        ? { from_poc: selectedItem.poc, to_poc: targetPoc.trim() }
        : { record_ids: Array.from(selectedIds), to_poc: targetPoc.trim() };

      const res = await axios.put('/api/benefits/poc-reassign', payload);
      setSnackbar({ open: true, message: res.data.message, severity: 'success' });
      closeReassignDialog();
      fetchPocSummary();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to reassign PoC';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setReassigning(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    } catch { return d; }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          PoC Management
          <Chip label={`${pocList.length} unique`} size="small" sx={{ ml: 1, verticalAlign: 'middle' }} />
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View and bulk-reassign Enrollment PoCs across Employee Benefits records
        </Typography>
      </Paper>

      {unassignedCount > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {unassignedCount} benefit record{unassignedCount !== 1 ? 's have' : ' has'} no Enrollment PoC assigned.
        </Alert>
      )}

      {loading ? (
        <Typography sx={{ textAlign: 'center', py: 4 }}>Loading...</Typography>
      ) : pocList.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No Enrollment PoCs found in benefits records.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 300px)' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Enrollment PoC</TableCell>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', width: 100 }}>Records</TableCell>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', width: 140 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pocList.map((item) => (
                <TableRow key={item.poc} hover>
                  <TableCell>{item.poc}</TableCell>
                  <TableCell>
                    <Chip label={item.count} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<SwapHorizIcon />}
                      onClick={() => openReassignDialog(item)}
                    >
                      Reassign
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Reassign Dialog */}
      <Dialog open={!!selectedItem} onClose={closeReassignDialog} maxWidth="md" fullWidth>
        <DialogTitle>Reassign Enrollment PoC</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Select records to reassign from <strong>"{selectedItem?.poc}"</strong>:
          </DialogContentText>

          {/* Records table with checkboxes */}
          {loadingRecords ? (
            <Typography sx={{ textAlign: 'center', py: 2 }}>Loading records...</Typography>
          ) : (
            <TableContainer sx={{ maxHeight: 300, mb: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ backgroundColor: '#f5f5f5' }}>
                      <Checkbox
                        checked={selectedIds.size === pocRecords.length && pocRecords.length > 0}
                        indeterminate={selectedIds.size > 0 && selectedIds.size < pocRecords.length}
                        onChange={toggleAll}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Client Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Renewal Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pocRecords.map((record) => (
                    <TableRow
                      key={record.id}
                      hover
                      onClick={() => toggleRecord(record.id)}
                      sx={{ cursor: 'pointer' }}
                      selected={selectedIds.has(record.id)}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox checked={selectedIds.has(record.id)} size="small" />
                      </TableCell>
                      <TableCell>{record.client_name || record.tax_id}</TableCell>
                      <TableCell>
                        {record.status ? (
                          <Chip label={record.status} size="small" color={record.status === 'Active' ? 'success' : 'warning'} />
                        ) : '—'}
                      </TableCell>
                      <TableCell>{formatDate(record.renewal_date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>{selectedIds.size}</strong> of {pocRecords.length} record{pocRecords.length !== 1 ? 's' : ''} selected
          </Typography>

          <Autocomplete
            freeSolo
            options={pocList.map(p => p.poc).filter(p => p !== selectedItem?.poc)}
            inputValue={targetPoc}
            onInputChange={(e, newValue) => setTargetPoc(newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Target PoC" size="small" fullWidth />
            )}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeReassignDialog} color="inherit">Cancel</Button>
          <Button
            onClick={handleReassign}
            variant="contained"
            color="primary"
            disabled={!targetPoc.trim() || selectedIds.size === 0 || reassigning}
          >
            {reassigning ? 'Reassigning...' : `Reassign ${selectedIds.size} Record${selectedIds.size !== 1 ? 's' : ''}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PocManagement;
