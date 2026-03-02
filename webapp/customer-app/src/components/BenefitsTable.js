import React from 'react';
import DataTable from './DataTable';
import { Chip, Box, Tooltip } from '@mui/material';

// Multi-plan types (support multiple plans via plans nested object)
const MULTI_PLAN_TYPES = ['medical', 'dental', 'vision', 'life_adnd'];
const MULTI_PLAN_LABELS = {
  medical: 'Medical',
  dental: 'Dental',
  vision: 'Vision',
  life_adnd: 'Life'
};

// Single-plan types (flat fields)
const SINGLE_PLAN_TYPES = [
  { prefix: 'ltd', shortName: 'LTD' },
  { prefix: 'std', shortName: 'STD' },
  { prefix: 'k401', shortName: '401K' },
  { prefix: 'critical_illness', shortName: 'CI' },
  { prefix: 'accident', shortName: 'Accident' },
  { prefix: 'hospital', shortName: 'Hospital' },
  { prefix: 'voluntary_life', shortName: 'Vol Life' }
];

// Parse date string as local time (avoids UTC timezone shift)
const parseDate = (d) => {
  if (!d) return null;
  const str = String(d);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return new Date(str + 'T00:00:00');
  }
  return new Date(str);
};

// Helper function to count active benefit types (not individual plans)
const countActiveTypes = (row) => {
  let count = 0;
  // Multi-plan types: check plans nested object
  if (row.plans) {
    MULTI_PLAN_TYPES.forEach(pt => {
      if (row.plans[pt] && row.plans[pt].length > 0) count++;
    });
  } else {
    // Fallback to flat fields
    if (row.current_carrier) count++;
    if (row.dental_carrier) count++;
    if (row.vision_carrier) count++;
    if (row.life_adnd_carrier) count++;
  }
  // Single-plan types
  SINGLE_PLAN_TYPES.forEach(plan => {
    if (row[`${plan.prefix}_carrier`]) count++;
  });
  return count;
};

// Helper function to get all active plans with details for display
const getActivePlans = (row) => {
  const activePlans = [];

  // Multi-plan types from plans nested object
  if (row.plans) {
    MULTI_PLAN_TYPES.forEach(pt => {
      const typePlans = row.plans[pt] || [];
      const label = MULTI_PLAN_LABELS[pt];
      typePlans.forEach((plan, idx) => {
        if (plan.carrier || plan.renewal_date) {
          activePlans.push({
            prefix: pt,
            shortName: typePlans.length > 1 ? `${label} ${idx + 1}` : label,
            carrier: plan.carrier,
            renewalDate: plan.renewal_date,
            remarks: plan.remarks,
            outstandingItem: plan.outstanding_item
          });
        }
      });
    });
  } else {
    // Fallback to flat fields
    if (row.current_carrier) {
      activePlans.push({ prefix: 'medical', shortName: 'Medical', carrier: row.current_carrier, renewalDate: row.renewal_date, remarks: null, outstandingItem: null });
    }
    if (row.dental_carrier) {
      activePlans.push({ prefix: 'dental', shortName: 'Dental', carrier: row.dental_carrier, renewalDate: row.dental_renewal_date, remarks: null, outstandingItem: null });
    }
    if (row.vision_carrier) {
      activePlans.push({ prefix: 'vision', shortName: 'Vision', carrier: row.vision_carrier, renewalDate: row.vision_renewal_date, remarks: null, outstandingItem: null });
    }
    if (row.life_adnd_carrier) {
      activePlans.push({ prefix: 'life_adnd', shortName: 'Life', carrier: row.life_adnd_carrier, renewalDate: row.life_adnd_renewal_date, remarks: null, outstandingItem: null });
    }
  }

  // Single-plan types (always flat)
  SINGLE_PLAN_TYPES.forEach(plan => {
    if (row[`${plan.prefix}_carrier`]) {
      activePlans.push({
        prefix: plan.prefix,
        shortName: plan.shortName,
        carrier: row[`${plan.prefix}_carrier`],
        renewalDate: row[`${plan.prefix}_renewal_date`],
        remarks: row[`${plan.prefix}_remarks`],
        outstandingItem: row[`${plan.prefix}_outstanding_item`]
      });
    }
  });

  // Sort: plans with remarks first
  activePlans.sort((a, b) => {
    const aHas = a.remarks ? 1 : 0;
    const bHas = b.remarks ? 1 : 0;
    return bHas - aHas;
  });

  return activePlans;
};

// Helper function to get next renewal date across all plans
const getNextRenewal = (row) => {
  const renewalDates = [];

  // Multi-plan types from plans nested object
  if (row.plans) {
    MULTI_PLAN_TYPES.forEach(pt => {
      (row.plans[pt] || []).forEach(plan => {
        if (plan.renewal_date) {
          renewalDates.push(parseDate(plan.renewal_date));
        }
      });
    });
  } else {
    // Fallback to flat fields
    if (row.renewal_date) renewalDates.push(parseDate(row.renewal_date));
    if (row.dental_renewal_date) renewalDates.push(parseDate(row.dental_renewal_date));
    if (row.vision_renewal_date) renewalDates.push(parseDate(row.vision_renewal_date));
    if (row.life_adnd_renewal_date) renewalDates.push(parseDate(row.life_adnd_renewal_date));
  }

  // Single-plan types
  SINGLE_PLAN_TYPES.forEach(plan => {
    const date = row[`${plan.prefix}_renewal_date`];
    if (date) renewalDates.push(parseDate(date));
  });

  if (renewalDates.length === 0) return null;

  const today = new Date();
  const futureDates = renewalDates.filter(d => d >= today).sort((a, b) => a - b);

  return futureDates.length > 0 ? futureDates[0] : renewalDates.sort((a, b) => b - a)[0];
};

// Column definitions for Employee Benefits table
const getBenefitsColumns = (onEdit) => [
  {
    id: 'tax_id',
    label: 'Tax ID',
    sticky: true,
    sortable: true,
    minWidth: 90
  },
  {
    id: 'client_name',
    label: 'Client Name',
    sticky: true,
    sortable: true,
    minWidth: 140,
    render: (value, row) => {
      const dotColor = row.client_status === 'Active' ? '#4caf50' : row.client_status === 'Prospect' ? '#ff9800' : '#999';
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: dotColor,
            display: 'inline-block',
            flexShrink: 0
          }} />
          {value}
        </span>
      );
    }
  },
  {
    id: 'parent_client',
    label: 'Parent Client',
    sortable: true,
    minWidth: 140
  },
  {
    id: 'active_plans',
    label: 'Coverage',
    sortable: false,
    minWidth: 280,
    render: (value, row) => {
      const plans = getActivePlans(row);
      if (plans.length === 0) {
        return <span style={{ color: '#999' }}>No coverage</span>;
      }

      const formatDate = (d) => {
        if (!d) return 'N/A';
        try {
          return parseDate(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        } catch { return d; }
      };

      const isUpForRenewal = (renewalDate) => {
        if (!renewalDate) return false;
        try {
          const renewal = parseDate(renewalDate);
          const today = new Date();
          const daysUntil = Math.ceil((renewal - today) / (1000 * 60 * 60 * 24));
          return daysUntil >= 0 && daysUntil <= 30;
        } catch { return false; }
      };

      const renderChip = (plan, idx) => {
        const renewing = isUpForRenewal(plan.renewalDate);
        const hasRemarks = Boolean(plan.remarks);
        return (
          <Tooltip
            key={idx}
            arrow
            title={
              <Box>
                <div><strong>{plan.shortName}</strong></div>
                <div>Carrier: {plan.carrier || 'N/A'}</div>
                <div>Renewal: {formatDate(plan.renewalDate)}</div>
                {hasRemarks && <div>Remarks: {plan.remarks}</div>}
                {plan.outstandingItem && <div>Outstanding: {plan.outstandingItem}</div>}
              </Box>
            }
          >
            <Chip
              label={plan.shortName}
              size="small"
              variant={renewing ? 'filled' : 'outlined'}
              onClick={(e) => {
                e.stopPropagation();
                if (onEdit) onEdit(row, plan.prefix);
              }}
              sx={{
                fontSize: '0.7rem',
                height: '20px',
                cursor: 'pointer',
                ...(renewing && {
                  backgroundColor: '#fff3cd',
                  color: '#856404',
                  borderColor: '#ffc107',
                  fontWeight: 'bold'
                })
              }}
            />
          </Tooltip>
        );
      };

      return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {plans.slice(0, 5).map((plan, idx) => renderChip(plan, idx))}
          {plans.length > 5 && (
            <Tooltip
              arrow
              title={
                <Box>
                  {plans.slice(5).map((plan, idx) => (
                    <Box key={idx} sx={{ mb: idx < plans.length - 6 ? 1 : 0 }}>
                      <div><strong>{plan.shortName}</strong></div>
                      <div>Carrier: {plan.carrier || 'N/A'}</div>
                      <div>Renewal: {formatDate(plan.renewalDate)}</div>
                      {plan.remarks && <div>Remarks: {plan.remarks}</div>}
                      {plan.outstandingItem && <div>Outstanding: {plan.outstandingItem}</div>}
                    </Box>
                  ))}
                </Box>
              }
            >
              <Chip
                label={`+${plans.length - 5} more`}
                size="small"
                color="primary"
                sx={{ fontSize: '0.7rem', height: '20px', cursor: 'pointer' }}
              />
            </Tooltip>
          )}
        </Box>
      );
    }
  },
  {
    id: 'plan_count',
    label: 'Plans',
    sortable: false,
    minWidth: 100,
    render: (value, row) => {
      const count = countActiveTypes(row);
      return (
        <Chip
          label={`${count} / 11`}
          size="small"
          color={count > 0 ? 'primary' : 'default'}
          variant="outlined"
        />
      );
    }
  },
  {
    id: 'next_renewal',
    label: 'Next Renewal',
    sortable: true,
    sortValue: (row) => {
      const d = getNextRenewal(row);
      return d ? d.getTime() : Number.MAX_SAFE_INTEGER;
    },
    minWidth: 130,
    render: (value, row) => {
      const nextRenewal = getNextRenewal(row);
      if (!nextRenewal) {
        return <span style={{ color: '#999' }}>—</span>;
      }

      const today = new Date();
      const daysUntil = Math.ceil((nextRenewal - today) / (1000 * 60 * 60 * 24));
      const isUrgent = daysUntil <= 30 && daysUntil >= 0;

      return (
        <Box>
          <div style={{ fontWeight: isUrgent ? 'bold' : 'normal' }}>
            {nextRenewal.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
          </div>
          {isUrgent && (
            <Chip
              label={`${daysUntil} days`}
              size="small"
              color="warning"
              sx={{ fontSize: '0.65rem', height: '18px', mt: 0.5 }}
            />
          )}
        </Box>
      );
    }
  },
  {
    id: 'enrollment_poc',
    label: 'Enrollment POC',
    sortable: true,
    minWidth: 140
  },
  {
    id: 'funding',
    label: 'Funding',
    sortable: true,
    minWidth: 120
  },
  {
    id: 'form_fire_code',
    label: 'Form Fire Code',
    sortable: true,
    minWidth: 120
  },
  {
    id: 'enrolled_ees',
    label: 'Enrolled EEs',
    sortable: true,
    minWidth: 110
  },
];

/**
 * BenefitsTable component - displays list of employee benefits records
 */
const BenefitsTable = ({ benefits, onEdit, onDelete, onClone }) => {
  return (
    <DataTable
      columns={getBenefitsColumns(onEdit)}
      data={benefits}
      onEdit={onEdit}
      onDelete={onDelete}
      onClone={onClone}
      idField="id"
      defaultOrderBy="next_renewal"
    />
  );
};

export default BenefitsTable;
