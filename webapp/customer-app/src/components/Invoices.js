import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UndoIcon from '@mui/icons-material/Undo';
import axios from 'axios';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [paymentDialog, setPaymentDialog] = useState({ open: false, invoiceId: null });
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const getDefaultMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonth());

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

  const handleUndoPayment = async (invoiceId) => {
    try {
      await axios.delete(`/api/invoices/${invoiceId}/payment`);
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

        {loading ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>Loading...</Typography>
        ) : filteredInvoices.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            {tab === 1 ? 'No pending invoices' : 'No invoices found'}{selectedMonth ? ` for ${selectedMonth}` : ''}
          </Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 'calc(100vh - 280px)' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Invoice #</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Client</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Policies</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Recipient</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Payment Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: 130 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredInvoices.map((inv) => (
                  <TableRow key={inv.id} hover>
                    <TableCell>{inv.invoice_number}</TableCell>
                    <TableCell><strong>{inv.client_name}</strong></TableCell>
                    <TableCell>{formatDate(inv.invoice_date)}</TableCell>
                    <TableCell>{formatCurrency(inv.amount)}</TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inv.policies_description || '—'}
                    </TableCell>
                    <TableCell>{inv.recipient_email || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={inv.status === 'paid' ? 'Paid' : 'Pending'}
                        size="small"
                        color={inv.status === 'paid' ? 'success' : 'warning'}
                        sx={{ fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell>{inv.status === 'paid' ? formatDate(inv.payment_date) : '—'}</TableCell>
                    <TableCell>
                      {inv.status === 'pending' ? (
                        <Button
                          size="small"
                          startIcon={<CheckCircleIcon />}
                          color="success"
                          onClick={() => {
                            setPaymentDialog({ open: true, invoiceId: inv.id });
                            setPaymentDate(new Date().toISOString().split('T')[0]);
                          }}
                          sx={{ fontSize: '0.7rem' }}
                        >
                          Paid
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          startIcon={<UndoIcon />}
                          color="warning"
                          onClick={() => handleUndoPayment(inv.id)}
                          sx={{ fontSize: '0.7rem' }}
                        >
                          Undo
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

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
