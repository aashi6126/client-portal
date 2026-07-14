import React, { useState } from 'react';
import axios from 'axios';
import {
  Alert, Box, Button, Chip, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';

/**
 * Admin bulk tool: rename client tax IDs, cascading to benefits, commercial,
 * invoices, and cobra records in a single transaction.
 *
 * Usage:
 *   Paste one mapping per line as "old,new" (a single comma or a tab).
 *   Preview runs a dry-run and shows what would happen.
 *   Apply commits — only enabled after a clean preview.
 */
export default function TaxIdRemap({ onApplied }) {
  const [raw, setRaw] = useState('');
  const [results, setResults] = useState(null);
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [previewClean, setPreviewClean] = useState(false);

  const parse = () => {
    return raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => {
        const parts = l.split(/[,\t]/).map((s) => s.trim());
        return { old: parts[0] || '', new: parts[1] || '' };
      });
  };

  const run = async (dryRun) => {
    const mappings = parse();
    if (!mappings.length) {
      setError('Add at least one line: old_tax_id,new_tax_id');
      return;
    }
    setBusy(true); setError('');
    try {
      const resp = await axios.post('/api/admin/tax-id-remap', {
        mappings, dry_run: dryRun,
      });
      setResults(resp.data.results || []);
      setSummary(resp.data.summary || null);
      const noErrors = (resp.data.summary?.errors || 0) === 0;
      const anyOk = (resp.data.summary?.ok || 0) > 0;
      setPreviewClean(dryRun && noErrors && anyOk);
      if (!dryRun && anyOk) {
        onApplied && onApplied();
      }
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
      setResults(null); setSummary(null); setPreviewClean(false);
    } finally { setBusy(false); }
  };

  const statusChip = (status) => {
    const color = status === 'ok' ? 'success' : status === 'skipped' ? 'default' : 'error';
    return <Chip size="small" label={status} color={color} variant="outlined" />;
  };

  const cascadeText = (c) => {
    if (!c) return '—';
    return `benefits: ${c.benefits}, commercial: ${c.commercial}, invoices: ${c.invoices}, cobra: ${c.cobra}`;
  };

  return (
    <Box mt={2}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Tax ID Remap (admin)</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Paste one mapping per line as <code>old,new</code>. Changes cascade to Employee Benefits,
          Commercial Insurance, Invoices, and Cobra records in a single transaction. Comment lines
          starting with <code>#</code> are ignored.
        </Typography>

        <TextField
          label="Mappings (old,new per line)"
          multiline
          rows={10}
          fullWidth
          value={raw}
          onChange={(e) => { setRaw(e.target.value); setPreviewClean(false); }}
          placeholder={`# old_tax_id,new_tax_id\n12-3456789,98-7654321\n11-2222222,33-4444444`}
          sx={{ fontFamily: 'monospace', mb: 2 }}
        />

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Stack direction="row" spacing={2}>
          <Button variant="outlined" disabled={busy} onClick={() => run(true)}>
            Preview (dry run)
          </Button>
          <Button variant="contained" color="warning" disabled={busy || !previewClean}
            onClick={() => run(false)}>
            Apply
          </Button>
          {busy && <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>Working…</Typography>}
        </Stack>

        {summary && (
          <Box sx={{ mt: 3 }}>
            <Stack direction="row" spacing={1}>
              <Chip label={`total: ${summary.total}`} size="small" />
              <Chip label={`ok: ${summary.ok}`} size="small" color="success" />
              <Chip label={`skipped: ${summary.skipped}`} size="small" />
              <Chip label={`errors: ${summary.errors}`} size="small" color="error" variant={summary.errors ? 'filled' : 'outlined'} />
            </Stack>
            {previewClean && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Preview looks clean. Click Apply to commit.
              </Alert>
            )}
            {summary.errors > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Fix the rows marked "error" and re-preview. Apply is disabled while any row would fail.
              </Alert>
            )}
          </Box>
        )}

        {results && (
          <TableContainer component={Paper} sx={{ mt: 2 }} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Old</TableCell>
                  <TableCell>New</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Cascaded</TableCell>
                  <TableCell>Message</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{statusChip(r.status)}</TableCell>
                    <TableCell><code>{r.old}</code></TableCell>
                    <TableCell><code>{r.new}</code></TableCell>
                    <TableCell>{r.client_name || '—'}</TableCell>
                    <TableCell>{cascadeText(r.cascaded)}</TableCell>
                    <TableCell>{r.message || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
