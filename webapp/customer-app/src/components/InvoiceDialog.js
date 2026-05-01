import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Checkbox,
  Typography,
  Box,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import axios from 'axios';

const SINGLE_PLAN_TYPES = [
  'general_liability',
  'property',
  'bop',
  'workers_comp',
  'auto',
  'epli',
  'nydbl',
  'surety',
  'product_liability',
  'flood',
  'directors_officers',
  'fiduciary',
  'inland_marine'
];

const MULTI_PLAN_TYPES = ['umbrella', 'professional_eo', 'cyber', 'crime'];

const LABELS = {
  general_liability: 'Commercial General Liability',
  property: 'Commercial Property',
  bop: 'Business Owners Policy',
  workers_comp: 'Workers Compensation',
  auto: 'Commercial Auto',
  epli: 'EPLI',
  nydbl: 'NYDBL',
  surety: 'Surety Bond',
  product_liability: 'Product Liability',
  flood: 'Flood',
  directors_officers: 'Directors & Officers',
  fiduciary: 'Fiduciary Bond',
  inland_marine: 'Inland Marine',
  umbrella: 'Umbrella Liability',
  professional_eo: 'Professional or E&O',
  cyber: 'Cyber Liability',
  crime: 'Crime or Fidelity Bond'
};

const formatCurrency = (val) => {
  const num = parseFloat(val);
  if (isNaN(num)) return '$0.00';
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function InvoiceDialog({ open, onClose, commercial, clientEmail }) {
  const [selected, setSelected] = useState({});
  const [toEmail, setToEmail] = useState('');
  const [ccEmail, setCcEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [isBinding, setIsBinding] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [alert, setAlert] = useState(null); // { severity, message }

  // Build the list of active policies from the commercial record
  const activePolicies = useMemo(() => {
    if (!commercial) return [];
    const policies = [];

    // Single-plan types
    for (const ptype of SINGLE_PLAN_TYPES) {
      const carrier = commercial[`${ptype}_carrier`];
      const premium = commercial[`${ptype}_premium`];
      if (carrier || premium) {
        policies.push({
          key: ptype,
          label: LABELS[ptype],
          premium: parseFloat(premium) || 0
        });
      }
    }

    // Multi-plan types
    const plans = commercial.plans || {};
    for (const ptype of MULTI_PLAN_TYPES) {
      const entries = plans[ptype] || [];
      entries.forEach((entry, idx) => {
        if (entry.carrier || entry.premium) {
          const suffix = entries.length > 1 ? ` #${idx + 1}` : '';
          policies.push({
            key: `${ptype}:${idx}`,
            ptype,
            label: `${LABELS[ptype]}${suffix}`,
            premium: parseFloat(entry.premium) || 0
          });
        }
      });
    }

    return policies;
  }, [commercial]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      const initial = {};
      activePolicies.forEach((p) => { initial[p.key] = true; });
      setSelected(initial);
      setToEmail(clientEmail || '');
      setCcEmail('');
      setSubject(commercial ? `Invoice - ${commercial.business_name || ''}`.trim() : 'Invoice');
      setInvoiceDate(todayISO());
      setIsBinding(false);
      setSending(false);
      setPreviewing(false);
      setAlert(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePolicy = (key) => {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleBindingToggle = (checked) => {
    setIsBinding(checked);
    const name = commercial?.business_name || commercial?.client_name || '';
    setSubject(checked
      ? `Binder Invoice - ${name}`.trim()
      : `Invoice - ${name}`.trim()
    );
  };

  const fullSubtotal = useMemo(() => {
    return activePolicies
      .filter((p) => selected[p.key])
      .reduce((sum, p) => sum + p.premium, 0);
  }, [activePolicies, selected]);

  const subtotal = isBinding ? fullSubtotal * 0.25 : fullSubtotal;

  // Build policy_types array for the API (collapse multi-plan keys back)
  const buildPolicyTypes = () => {
    const types = new Set();
    activePolicies.forEach((p) => {
      if (selected[p.key]) {
        types.add(p.ptype || p.key);
      }
    });
    return Array.from(types);
  };

  const selectedCount = activePolicies.filter((p) => selected[p.key]).length;
  const canSend = commercial?.id && selectedCount > 0 && toEmail.trim();
  const canPreview = commercial?.id && selectedCount > 0;

  const handlePreview = async () => {
    setPreviewing(true);
    setAlert(null);
    try {
      const resp = await axios.post('/api/invoice/preview', {
        commercial_id: commercial.id,
        policy_types: buildPolicyTypes(),
        invoice_date: invoiceDate,
        is_binding: isBinding
      }, { responseType: 'blob' });

      const blob = new Blob([resp.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      let message = 'Failed to generate preview';
      if (err.response && err.response.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          message = parsed.error || message;
        } catch (_) { /* ignore parse errors */ }
      } else if (err.response?.data?.error) {
        message = err.response.data.error;
      }
      setAlert({ severity: 'error', message });
    } finally {
      setPreviewing(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    setAlert(null);
    try {
      await axios.post('/api/invoice/send', {
        commercial_id: commercial.id,
        policy_types: buildPolicyTypes(),
        invoice_date: invoiceDate,
        to_email: toEmail.trim(),
        cc_email: ccEmail.trim(),
        subject: subject.trim(),
        is_binding: isBinding
      });
      setAlert({ severity: 'success', message: 'Invoice sent successfully!' });
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to send invoice';
      setAlert({ severity: 'error', message });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Generate Invoice</DialogTitle>
      <DialogContent dividers>
        {alert && (
          <Alert severity={alert.severity} sx={{ mb: 2 }} onClose={() => setAlert(null)}>
            {alert.message}
          </Alert>
        )}

        {!commercial?.id && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Save this record before generating an invoice.
          </Alert>
        )}

        <Typography variant="subtitle2" sx={{ mb: 1 }}>Select Policies</Typography>

        {activePolicies.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No active policies found.
          </Typography>
        ) : (
          <Box sx={{ mb: 2 }}>
            {activePolicies.map((p) => (
              <Box
                key={p.key}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Checkbox
                    checked={!!selected[p.key]}
                    onChange={() => togglePolicy(p.key)}
                    size="small"
                  />
                  <Typography variant="body2">{p.label}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {formatCurrency(p.premium)}
                </Typography>
              </Box>
            ))}
            <Divider sx={{ my: 1 }} />
            {isBinding && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1, mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">Full Premium</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>{formatCurrency(fullSubtotal)}</Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
              <Typography variant="subtitle2">{isBinding ? 'Binder (25%)' : 'Subtotal'}</Typography>
              <Typography variant="subtitle2">{formatCurrency(subtotal)}</Typography>
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Checkbox
            checked={isBinding}
            onChange={(e) => handleBindingToggle(e.target.checked)}
            size="small"
          />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>Binder Invoice</Typography>
            <Typography variant="caption" color="text.secondary">Charge 25% of premium as binder deposit</Typography>
          </Box>
        </Box>

        <Typography variant="subtitle2" sx={{ mb: 1 }}>Invoice Date</Typography>
        <TextField
          type="date"
          size="small"
          fullWidth
          value={invoiceDate}
          onChange={(e) => setInvoiceDate(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Typography variant="subtitle2" sx={{ mb: 1 }}>Email</Typography>
        <TextField
          label="To"
          size="small"
          fullWidth
          value={toEmail}
          onChange={(e) => setToEmail(e.target.value)}
          sx={{ mb: 1 }}
        />
        <TextField
          label="CC"
          size="small"
          fullWidth
          value={ccEmail}
          onChange={(e) => setCcEmail(e.target.value)}
          sx={{ mb: 1 }}
        />
        <TextField
          label="Subject"
          size="small"
          fullWidth
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handlePreview}
          disabled={!canPreview || previewing}
          startIcon={previewing ? <CircularProgress size={18} /> : null}
        >
          Preview PDF
        </Button>
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={!canSend || sending}
          startIcon={sending ? <CircularProgress size={18} color="inherit" /> : null}
        >
          Send Invoice
        </Button>
      </DialogActions>
    </Dialog>
  );
}
