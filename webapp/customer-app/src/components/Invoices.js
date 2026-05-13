import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Chip, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Tooltip
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UndoIcon from '@mui/icons-material/Undo';
import BlockIcon from '@mui/icons-material/Block';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

const COVERAGE_SHORT = {
  'commercial general liability': 'GL',
  'commercial property': 'Property',
  'business owners policy': 'BOP',
  'workers compensation': 'WC',
  'commercial auto': 'Auto',
  'epli': 'EPLI',
  'nydbl': 'NYDBL',
  'surety bond': 'Surety',
  'product liability': 'Product',
  'flood': 'Flood',
  'directors & officers': 'D&O',
  'fiduciary bond': 'Fiduciary',
  'inland marine': 'Inland Marine',
  'umbrella liability': 'Umbrella',
  'professional or e&o': 'E&O',
  'cyber liability': 'Cyber',
  'crime or fidelity bond': 'Crime',
};

const shortCoverage = (name) => {
  if (!name) return '';
  const clean = name.replace(/\s*\(Binder 25%\)/i, '').trim();
  return COVERAGE_SHORT[clean.toLowerCase()] || clean;
};

const Invoices = ({ isAdmin = false }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [paymentDialog, setPaymentDialog] = useState({ open: false, invoiceId: null });
  const [undoDialog, setUndoDialog] = useState({ open: false, invoiceId: null, invoiceNumber: null });
  const [voidDialog, setVoidDialog] = useState({ open: false, invoiceId: null, invoiceNumber: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, invoiceId: null, invoiceNumber: null });
  const [voidReason, setVoidReason] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const getDefaultMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const [selectedMonth, setSelectedMonth] = useState('');

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/invoices');
      setInvoices(res.data);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const filteredInvoices = useMemo(() => {
    let list = invoices;
    if (tab === 1) {
      list = list.filter(inv => inv.status === 'pending');
    }
    if (selectedMonth) {
      list = list.filter(inv => inv.invoice_date && inv.invoice_date.startsWith(selectedMonth));
    }
    return list;
  }, [invoices, tab, selectedMonth]);

  const pendingCount = useMemo(() => {
    let list = invoices;
    if (selectedMonth) {
      list = list.filter(inv => inv.invoice_date && inv.invoice_date.startsWith(selectedMonth));
    }
    return list.filter(inv => inv.status === 'pending').length;
  }, [invoices, selectedMonth]);

  const allCount = useMemo(() => {
    let list = invoices;
    if (selectedMonth) {
      list = list.filter(inv => inv.invoice_date && inv.invoice_date.startsWith(selectedMonth));
    }
    return list.length;
  }, [invoices, selectedMonth]);

  const handleRecordPayment = async () => {
    try {
      await axios.put(`/api/invoices/${paymentDialog.invoiceId}/payment`, {
        payment_date: paymentDate || null,
        payment_notes: paymentNotes || null
      });
      setPaymentDialog({ open: false, invoiceId: null });
      setPaymentDate('');
      setPaymentNotes('');
      fetchInvoices();
    } catch (err) {
      console.error('Error recording payment:', err);
    }
  };

  const handleVoid = async () => {
    try {
      await axios.put(`/api/invoices/${voidDialog.invoiceId}/void`, { reason: voidReason || 'Voided' });
      setVoidDialog({ open: false, invoiceId: null, invoiceNumber: null });
      setVoidReason('');
      fetchInvoices();
    } catch (err) {
      console.error('Error voiding invoice:', err);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/invoices/${deleteDialog.invoiceId}`);
      setDeleteDialog({ open: false, invoiceId: null, invoiceNumber: null });
      fetchInvoices();
    } catch (err) {
      console.error('Error deleting invoice:', err);
    }
  };

  const handleUndoPayment = async () => {
    try {
      await axios.delete(`/api/invoices/${undoDialog.invoiceId}/payment`);
      setUndoDialog({ open: false, invoiceId: null, invoiceNumber: null });
      fetchInvoices();
    } catch (err) {
      console.error('Error undoing payment:', err);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    } catch { return d; }
  };

  const formatCurrency = (val) => {
    if (val === null || val === undefined) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6">
            Invoices ({filteredInvoices.length})
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">Month:</Typography>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4, fontSize: '0.875rem' }}
            />
            <Button size="small" variant="outlined" onClick={() => setSelectedMonth('')} sx={{ textTransform: 'none' }}>
              All
            </Button>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`All Invoices (${allCount})`} />
          <Tab label={`Pending (${pendingCount})`} />
        </Tabs>

        <DataGrid
          rows={filteredInvoices}
          columns={[
            { field: 'invoice_number', headerName: 'Invoice #', width: 100 },
            {
              field: 'type', headerName: 'Type', width: 90,
              renderCell: (params) => (
                <Chip label={params.row.is_binding ? 'Binder' : 'Annual'} size="small" variant="outlined"
                  color={params.row.is_binding ? 'warning' : 'primary'} sx={{ fontSize: '0.7rem' }} />
              ),
              sortComparator: (v1, v2, p1, p2) => (p1.api.getRow(p1.id).is_binding ? 1 : 0) - (p2.api.getRow(p2.id).is_binding ? 1 : 0),
            },
            { field: 'client_name', headerName: 'Client', flex: 1, minWidth: 150,
              renderCell: (params) => <strong>{params.value}</strong> },
            { field: 'invoice_date', headerName: 'Date', width: 110,
              valueFormatter: (value) => formatDate(value) },
            { field: 'amount', headerName: 'Amount', width: 110,
              valueFormatter: (value) => formatCurrency(value) },
            {
              field: 'coverages', headerName: 'Coverages', width: 220, sortable: false,
              renderCell: (params) => {
                const desc = params.row.policies_description;
                if (!desc) return '—';
                return (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3, py: 0.5 }}>
                    {desc.split('|').map((entry, i) => {
                      const [coverage, policyNum] = entry.split('::');
                      const label = shortCoverage(coverage);
                      if (!label) return null;
                      return (
                        <Tooltip key={i} title={policyNum ? `Policy #: ${policyNum}` : 'No policy number'} arrow>
                          <Chip label={label} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 20, cursor: 'help' }} />
                        </Tooltip>
                      );
                    })}
                  </Box>
                );
              },
            },
            { field: 'recipient_email', headerName: 'Recipient', width: 160 },
            {
              field: 'status', headerName: 'Status', width: 100,
              renderCell: (params) => (
                <Chip
                  label={params.value === 'paid' ? 'Paid' : params.value === 'voided' ? 'Voided' : 'Pending'}
                  size="small"
                  color={params.value === 'paid' ? 'success' : params.value === 'voided' ? 'default' : 'warning'}
                  sx={{ fontSize: '0.7rem', ...(params.value === 'voided' && { textDecoration: 'line-through' }) }}
                />
              ),
            },
            { field: 'payment_date', headerName: 'Payment Date', width: 120,
              valueFormatter: (value) => value ? formatDate(value) : '—' },
            {
              field: 'actions', headerName: 'Actions', width: isAdmin ? 200 : 160, sortable: false, filterable: false,
              renderCell: (params) => (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {params.row.status === 'pending' && (
                    <>
                      <Button size="small" startIcon={<CheckCircleIcon />} color="success"
                        onClick={() => { setPaymentDialog({ open: true, invoiceId: params.row.id }); setPaymentDate(new Date().toISOString().split('T')[0]); }}
                        sx={{ fontSize: '0.65rem', minWidth: 0 }}>Paid</Button>
                      <Button size="small" startIcon={<BlockIcon />} color="error"
                        onClick={() => setVoidDialog({ open: true, invoiceId: params.row.id, invoiceNumber: params.row.invoice_number })}
                        sx={{ fontSize: '0.65rem', minWidth: 0 }}>Void</Button>
                    </>
                  )}
                  {params.row.status === 'paid' && (
                    <Button size="small" startIcon={<UndoIcon />} color="warning"
                      onClick={() => setUndoDialog({ open: true, invoiceId: params.row.id, invoiceNumber: params.row.invoice_number })}
                      sx={{ fontSize: '0.65rem', minWidth: 0 }}>Undo</Button>
                  )}
                  {isAdmin && (
                    <Button size="small" startIcon={<DeleteIcon />} color="error"
                      onClick={() => setDeleteDialog({ open: true, invoiceId: params.row.id, invoiceNumber: params.row.invoice_number })}
                      sx={{ fontSize: '0.65rem', minWidth: 0 }}>Delete</Button>
                  )}
                </Box>
              ),
            },
          ]}
          autoHeight
          density="compact"
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeader': {
              backgroundColor: '#f8f9fc',
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              color: '#4a5568',
              borderBottom: '2px solid #eef0f6',
            },
            '& .MuiDataGrid-columnHeaderRow': { mb: 1 },
            '& .MuiDataGrid-cell': { fontSize: '0.8125rem', borderColor: '#f0f0f5', py: 1 },
            '& .MuiDataGrid-row:hover': { backgroundColor: '#f8f9fc' },
          }}
          loading={loading}
          getRowHeight={() => 'auto'}
        />
      </Paper>

      <Dialog open={voidDialog.open} onClose={() => setVoidDialog({ open: false, invoiceId: null, invoiceNumber: null })}>
        <DialogTitle>Void Invoice</DialogTitle>
        <DialogContent sx={{ pt: 2, minWidth: 350 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Are you sure you want to void Invoice #{voidDialog.invoiceNumber}? This action cannot be undone.
          </Typography>
          <TextField
            label="Reason (optional)"
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            fullWidth size="small" multiline minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVoidDialog({ open: false, invoiceId: null, invoiceNumber: null })}>Cancel</Button>
          <Button onClick={handleVoid} variant="contained" color="error">Void Invoice</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, invoiceId: null, invoiceNumber: null })}>
        <DialogTitle>Delete Invoice</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Permanently delete Invoice #{deleteDialog.invoiceNumber}? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, invoiceId: null, invoiceNumber: null })}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={undoDialog.open} onClose={() => setUndoDialog({ open: false, invoiceId: null, invoiceNumber: null })}>
        <DialogTitle>Undo Payment</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to undo the payment for Invoice #{undoDialog.invoiceNumber}? This will mark it as pending again.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUndoDialog({ open: false, invoiceId: null, invoiceNumber: null })}>Cancel</Button>
          <Button onClick={handleUndoPayment} variant="contained" color="warning">Undo Payment</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={paymentDialog.open} onClose={() => setPaymentDialog({ open: false, invoiceId: null })}>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent sx={{ pt: 2, minWidth: 350 }}>
          <TextField
            label="Payment Date"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            label="Notes (optional)"
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
            fullWidth
            size="small"
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialog({ open: false, invoiceId: null })}>Cancel</Button>
          <Button onClick={handleRecordPayment} variant="contained" color="success">Record Payment</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Invoices;
