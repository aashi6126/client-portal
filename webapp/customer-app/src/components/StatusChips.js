// Small display components for data-driven status UI. Extracted so the
// four *Table components (Client, Benefits, Commercial, Personal,
// Individual) stop each duplicating the same hex codes and JSX shape.

import React from 'react';
import { Box, Chip, Tooltip } from '@mui/material';
import {
  STATUS_COLORS,
  OUTSTANDING_ITEM_COLORS,
  OUTSTANDING_CLEARED,
  RENEWAL_PILL,
} from '../theme/tokens';

/**
 * Small colored dot for record status ("Active", "Prospect", other).
 * Renders inline; caller wraps in whatever container they want.
 */
export function StatusDot({ value, size = 8 }) {
  const key = String(value || '').toLowerCase();
  const color =
    key === 'active'   ? STATUS_COLORS.active :
    key === 'prospect' ? STATUS_COLORS.prospect :
                         STATUS_COLORS.inactive;
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: color,
        flexShrink: 0,
      }}
    />
  );
}

/**
 * Soft-yellow pill for renewal dates, formatted MM/DD/YYYY. Pass the
 * ISO date string; renders `—` if falsy.
 */
export function RenewalChip({ date }) {
  if (!date) return <span style={{ color: STATUS_COLORS.inactive }}>—</span>;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return <span style={{ color: STATUS_COLORS.inactive }}>—</span>;
  const label = d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  return (
    <Chip
      label={label}
      size="small"
      variant="outlined"
      sx={{
        backgroundColor: RENEWAL_PILL.bg,
        color: RENEWAL_PILL.fg,
        borderColor: RENEWAL_PILL.border,
        fontWeight: 500,
        fontVariantNumeric: 'tabular-nums',
      }}
    />
  );
}

/**
 * Colored chip for an outstanding item value ("Premium Due", "In Audit",
 * etc.). Returns null for cleared values so callers can drop it in a
 * conditional-less way. Optional `withDot` renders a small colored dot
 * next to the chip for extra scannability in dense tables.
 */
export function OutstandingChip({ value, withDot = false }) {
  if (!value || OUTSTANDING_CLEARED.has(value)) return null;
  const color = OUTSTANDING_ITEM_COLORS[value] || STATUS_COLORS.inactive;
  const chip = (
    <Chip
      label={value}
      size="small"
      variant="outlined"
      sx={{
        color,
        borderColor: color,
        backgroundColor: `${color}12`, // 12 = ~7% opacity in hex
        fontWeight: 500,
      }}
    />
  );
  if (!withDot) return chip;
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
      <Box
        component="span"
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      {chip}
    </Box>
  );
}

/**
 * Wraps a status dot + label pair with an optional tooltip. Used in the
 * name columns across tables so record identity + status reads as one.
 */
export function StatusLabel({ status, children }) {
  return (
    <Tooltip title={status || 'Unknown'} placement="top" arrow>
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
        <StatusDot value={status} />
        <span>{children}</span>
      </Box>
    </Tooltip>
  );
}
