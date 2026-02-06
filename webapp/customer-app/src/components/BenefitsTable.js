import React from 'react';
import DataTable from './DataTable';
import { Chip, Box, Tooltip } from '@mui/material';

// Benefit plan configuration - 11 types including Medical
const benefitPlans = [
  { prefix: 'medical', name: 'Medical', shortName: 'Medical' },
  { prefix: 'dental', name: 'Dental', shortName: 'Dental' },
  { prefix: 'vision', name: 'Vision', shortName: 'Vision' },
  { prefix: 'life_adnd', name: 'Life & AD&D', shortName: 'Life' },
  { prefix: 'ltd', name: 'LTD', shortName: 'LTD' },
  { prefix: 'std', name: 'STD', shortName: 'STD' },
  { prefix: 'k401', name: '401K', shortName: '401K' },
  { prefix: 'critical_illness', name: 'Critical Illness', shortName: 'CI' },
  { prefix: 'accident', name: 'Accident', shortName: 'Accident' },
  { prefix: 'hospital', name: 'Hospital', shortName: 'Hospital' },
  { prefix: 'voluntary_life', name: 'Voluntary Life', shortName: 'Vol Life' }
];

// Helper function to count active benefit plans
const countActivePlans = (row) => {
  let count = 0;
  // Check Medical (uses current_carrier instead of medical_carrier)
  if (row.current_carrier) count++;
  // Check other plans
  benefitPlans.slice(1).forEach(plan => {
    if (row[`${plan.prefix}_carrier`]) count++;
  });
  return count;
};

// Helper function to get all active benefit plans
const getActivePlans = (row) => {
  const activePlans = [];
  // Check Medical (uses current_carrier)
  if (row.current_carrier) {
    activePlans.push('Medical');
  }
  // Check other plans
  benefitPlans.slice(1).forEach(plan => {
    if (row[`${plan.prefix}_carrier`]) {
      activePlans.push(plan.shortName);
    }
  });
  return activePlans;
};

// Helper function to get next renewal date across all plans
const getNextRenewal = (row) => {
  const renewalDates = [];

  // Check Medical renewal
  if (row.renewal_date) {
    renewalDates.push(new Date(row.renewal_date));
  }

  // Check other plan renewals
  benefitPlans.slice(1).forEach(plan => {
    const date = row[`${plan.prefix}_renewal_date`];
    if (date) {
      renewalDates.push(new Date(date));
    }
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
    minWidth: 120
  },
  {
    id: 'client_name',
    label: 'Client Name',
    sticky: true,
    sortable: true,
    minWidth: 200
  },
  {
    id: 'plan_count',
    label: 'Plans',
    sortable: false,
    minWidth: 100,
    render: (value, row) => {
      const count = countActivePlans(row);
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
    id: 'active_plans',
    label: 'Coverage',
    sortable: false,
    minWidth: 280,
    render: (value, row) => {
      const plans = getActivePlans(row);
      if (plans.length === 0) {
        return <span style={{ color: '#999' }}>No coverage</span>;
      }

      return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {plans.slice(0, 5).map((plan, idx) => (
            <Chip
              key={idx}
              label={plan}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: '20px' }}
            />
          ))}
          {plans.length > 5 && (
            <Tooltip title={plans.slice(5).join(', ')} arrow>
              <Chip
                label={`+${plans.length - 5} more`}
                size="small"
                color="primary"
                sx={{ fontSize: '0.7rem', height: '20px' }}
              />
            </Tooltip>
          )}
        </Box>
      );
    }
  },
  {
    id: 'next_renewal',
    label: 'Next Renewal',
    sortable: false,
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
            {nextRenewal.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
    id: 'employer_contribution',
    label: 'Employer %',
    sortable: true,
    minWidth: 100,
    render: (value) => {
      if (!value) return <span style={{ color: '#999' }}>—</span>;
      return `${(parseFloat(value) * 100).toFixed(0)}%`;
    }
  },
  {
    id: 'employee_contribution',
    label: 'Employee %',
    sortable: true,
    minWidth: 100,
    render: (value) => {
      if (!value) return <span style={{ color: '#999' }}>—</span>;
      return `${(parseFloat(value) * 100).toFixed(0)}%`;
    }
  }
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
    />
  );
};

export default BenefitsTable;
