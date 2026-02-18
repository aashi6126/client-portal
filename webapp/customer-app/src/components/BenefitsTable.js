import React from 'react';
import DataTable from './DataTable';
import { Chip, Box, Tooltip } from '@mui/material';
import FlagIcon from '@mui/icons-material/Flag';

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
            shortName: typePlans.length > 1 ? `${label} ${idx + 1}` : label,
            carrier: plan.carrier,
            renewalDate: plan.renewal_date,
            flag: plan.flag
          });
        }
      });
    });
  } else {
    // Fallback to flat fields
    if (row.current_carrier) {
      activePlans.push({ shortName: 'Medical', carrier: row.current_carrier, renewalDate: row.renewal_date, flag: false });
    }
    if (row.dental_carrier) {
      activePlans.push({ shortName: 'Dental', carrier: row.dental_carrier, renewalDate: row.dental_renewal_date, flag: false });
    }
    if (row.vision_carrier) {
      activePlans.push({ shortName: 'Vision', carrier: row.vision_carrier, renewalDate: row.vision_renewal_date, flag: false });
    }
    if (row.life_adnd_carrier) {
      activePlans.push({ shortName: 'Life', carrier: row.life_adnd_carrier, renewalDate: row.life_adnd_renewal_date, flag: false });
    }
  }

  // Single-plan types (always flat)
  SINGLE_PLAN_TYPES.forEach(plan => {
    if (row[`${plan.prefix}_carrier`]) {
      activePlans.push({
        shortName: plan.shortName,
        carrier: row[`${plan.prefix}_carrier`],
        renewalDate: row[`${plan.prefix}_renewal_date`],
        flag: row[`${plan.prefix}_flag`]
      });
    }
  });

  // Flagged coverages first
  return activePlans.sort((a, b) => (b.flag ? 1 : 0) - (a.flag ? 1 : 0));
};

// Helper function to check if any coverage is flagged
const hasAnyFlag = (row) => {
  if (row.plans) {
    for (const pt of MULTI_PLAN_TYPES) {
      for (const plan of (row.plans[pt] || [])) {
        if (plan.flag) return true;
      }
    }
  }
  for (const plan of SINGLE_PLAN_TYPES) {
    if (row[`${plan.prefix}_flag`]) return true;
  }
  return false;
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
export const benefitsColumns = [
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
    minWidth: 140
  },
  {
    id: 'status',
    label: 'Status',
    sortable: true,
    minWidth: 100,
    render: (value) => {
      if (!value) return <span style={{ color: '#999' }}>—</span>;
      const color = value.toLowerCase() === 'active' ? 'success' : 'default';
      return (
        <Chip
          label={value}
          size="small"
          color={color}
        />
      );
    }
  },
  {
    id: 'outstanding_item',
    label: 'Follow Up',
    sortable: true,
    minWidth: 150,
    render: (value) => {
      if (!value) return <span style={{ color: '#999' }}>—</span>;
      const colorMap = {
        'Pending Premium': 'warning',
        'In Audit': 'info',
        'Pending Cancellation': 'error',
        'Complete': 'success'
      };
      return (
        <Chip
          label={value}
          size="small"
          color={colorMap[value] || 'default'}
          variant="outlined"
        />
      );
    }
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
        return (
          <Tooltip
            key={idx}
            arrow
            title={
              <Box>
                <div><strong>{plan.shortName}</strong></div>
                <div>Carrier: {plan.carrier || 'N/A'}</div>
                <div>Renewal: {formatDate(plan.renewalDate)}</div>
                {plan.flag && <div style={{ color: '#ff6b6b' }}>Flagged</div>}
              </Box>
            }
          >
            <Chip
              label={plan.shortName}
              size="small"
              variant={renewing ? 'filled' : 'outlined'}
              icon={plan.flag ? <FlagIcon sx={{ fontSize: '0.75rem !important', color: '#d32f2f !important' }} /> : undefined}
              sx={{
                fontSize: '0.7rem',
                height: '20px',
                cursor: 'pointer',
                ...(plan.flag && !renewing && {
                  borderColor: '#d32f2f',
                  color: '#d32f2f'
                }),
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
                      {plan.flag && <div style={{ color: '#ff6b6b' }}>Flagged</div>}
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
      const flagged = hasAnyFlag(row) ? 0 : 1;
      const d = getNextRenewal(row);
      const time = d ? d.getTime() : Number.MAX_SAFE_INTEGER;
      return flagged * 1e15 + time;
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
    id: 'num_employees_at_renewal',
    label: '# Employees',
    sortable: true,
    minWidth: 100
  },
  {
    id: 'enrolled_ees',
    label: 'Enrolled EEs',
    sortable: true,
    minWidth: 110
  },
  {
    id: 'remarks',
    label: 'Remarks',
    sortable: true,
    minWidth: 180
  },
];

/**
 * BenefitsTable component - displays list of employee benefits records
 */
const BenefitsTable = ({ benefits, onEdit, onDelete, onClone }) => {
  return (
    <DataTable
      columns={benefitsColumns}
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
