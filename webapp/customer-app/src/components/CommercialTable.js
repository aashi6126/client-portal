import React from 'react';
import DataTable from './DataTable';
import { Chip, Box, Tooltip } from '@mui/material';
import FlagIcon from '@mui/icons-material/Flag';

// Multi-plan types (support multiple plans via plans nested object)
const MULTI_PLAN_TYPES = ['umbrella', 'professional_eo', 'cyber', 'crime'];
const MULTI_PLAN_LABELS = {
  umbrella: 'Umbrella',
  professional_eo: 'E&O',
  cyber: 'Cyber',
  crime: 'Crime'
};

// Single-plan product names
const SINGLE_PLAN_PRODUCTS = {
  general_liability: 'GL',
  property: 'Property',
  bop: 'BOP',
  workers_comp: 'WC',
  auto: 'Auto',
  epli: 'EPLI',
  nydbl: 'NYDBL',
  surety: 'Surety',
  product_liability: 'Product',
  flood: 'Flood',
  directors_officers: 'D&O',
  fiduciary: 'Fiduciary',
  inland_marine: 'Marine'
};

// Parse date string as local time (avoids UTC timezone shift)
const parseDate = (d) => {
  if (!d) return null;
  const str = String(d);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return new Date(str + 'T00:00:00');
  }
  return new Date(str);
};

// Helper function to count active products (types, not individual plans)
const countActiveProducts = (row) => {
  let count = 0;
  // Multi-plan types: check plans nested object
  if (row.plans) {
    MULTI_PLAN_TYPES.forEach(pt => {
      if (row.plans[pt] && row.plans[pt].length > 0) count++;
    });
  } else {
    MULTI_PLAN_TYPES.forEach(pt => {
      if (row[`${pt}_carrier`]) count++;
    });
  }
  // Single-plan types
  Object.keys(SINGLE_PLAN_PRODUCTS).forEach(key => {
    if (row[`${key}_carrier`]) count++;
  });
  return count;
};

// Helper function to get all active products with details
const getActiveProducts = (row) => {
  const products = [];

  // Multi-plan types from plans nested object
  if (row.plans) {
    MULTI_PLAN_TYPES.forEach(pt => {
      const typePlans = row.plans[pt] || [];
      const label = MULTI_PLAN_LABELS[pt];
      typePlans.forEach((plan, idx) => {
        if (plan.carrier || plan.renewal_date || plan.limit || plan.premium) {
          products.push({
            shortName: typePlans.length > 1 ? `${label} ${idx + 1}` : label,
            carrier: plan.carrier,
            renewalDate: plan.renewal_date,
            premium: plan.premium,
            limit: plan.limit,
            flag: plan.flag
          });
        }
      });
    });
  } else {
    // Fallback to flat fields
    MULTI_PLAN_TYPES.forEach(pt => {
      if (row[`${pt}_carrier`]) {
        products.push({
          shortName: MULTI_PLAN_LABELS[pt],
          carrier: row[`${pt}_carrier`],
          renewalDate: row[`${pt}_renewal_date`],
          premium: row[`${pt}_premium`],
          limit: row[`${pt}_limit`],
          flag: false
        });
      }
    });
  }

  // Single-plan types (always flat)
  Object.entries(SINGLE_PLAN_PRODUCTS).forEach(([key, name]) => {
    if (row[`${key}_carrier`]) {
      products.push({
        shortName: name,
        carrier: row[`${key}_carrier`],
        renewalDate: row[`${key}_renewal_date`],
        premium: row[`${key}_premium`],
        limit: row[`${key}_limit`],
        flag: row[`${key}_flag`]
      });
    }
  });

  // Flagged coverages first
  return products.sort((a, b) => (b.flag ? 1 : 0) - (a.flag ? 1 : 0));
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
  for (const key of Object.keys(SINGLE_PLAN_PRODUCTS)) {
    if (row[`${key}_flag`]) return true;
  }
  return false;
};

// Helper function to get next renewal date
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
    MULTI_PLAN_TYPES.forEach(pt => {
      if (row[`${pt}_renewal_date`]) renewalDates.push(parseDate(row[`${pt}_renewal_date`]));
    });
  }

  // Single-plan types
  Object.keys(SINGLE_PLAN_PRODUCTS).forEach(key => {
    if (row[`${key}_renewal_date`]) renewalDates.push(parseDate(row[`${key}_renewal_date`]));
  });

  if (renewalDates.length === 0) return null;

  const today = new Date();
  const futureDates = renewalDates.filter(d => d >= today).sort((a, b) => a - b);
  return futureDates.length > 0 ? futureDates[0] : renewalDates.sort((a, b) => b - a)[0];
};

// Helper function to calculate total premium
const getTotalPremium = (row) => {
  let total = 0;

  // Multi-plan types from plans nested object
  if (row.plans) {
    MULTI_PLAN_TYPES.forEach(pt => {
      (row.plans[pt] || []).forEach(plan => {
        total += parseFloat(plan.premium) || 0;
      });
    });
  } else {
    MULTI_PLAN_TYPES.forEach(pt => {
      total += parseFloat(row[`${pt}_premium`]) || 0;
    });
  }

  // Single-plan types
  Object.keys(SINGLE_PLAN_PRODUCTS).forEach(key => {
    total += parseFloat(row[`${key}_premium`]) || 0;
  });

  return total;
};

// Column definitions for Commercial Insurance table
export const commercialColumns = [
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
    id: 'active_products',
    label: 'Coverage',
    sortable: false,
    minWidth: 300,
    render: (value, row) => {
      const products = getActiveProducts(row);
      if (products.length === 0) {
        return <span style={{ color: '#999' }}>No coverage</span>;
      }

      const formatDate = (d) => {
        if (!d) return 'N/A';
        try {
          return parseDate(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        } catch { return d; }
      };

      const formatPremium = (p) => {
        if (!p) return 'N/A';
        return `$${parseFloat(p).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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

      const renderChip = (product, idx) => {
        const renewing = isUpForRenewal(product.renewalDate);
        return (
          <Tooltip
            key={idx}
            arrow
            title={
              <Box>
                <div><strong>{product.shortName}</strong></div>
                <div>Carrier: {product.carrier || 'N/A'}</div>
                <div>Limit: {product.limit || 'N/A'}</div>
                <div>Premium: {formatPremium(product.premium)}</div>
                <div>Renewal: {formatDate(product.renewalDate)}</div>
                {product.flag && <div style={{ color: '#ff6b6b' }}>Flagged</div>}
              </Box>
            }
          >
            <Chip
              label={product.shortName}
              size="small"
              variant={renewing ? 'filled' : 'outlined'}
              icon={product.flag ? <FlagIcon sx={{ fontSize: '0.75rem !important', color: '#d32f2f !important' }} /> : undefined}
              sx={{
                fontSize: '0.7rem',
                height: '20px',
                cursor: 'pointer',
                ...(product.flag && !renewing && {
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
          {products.slice(0, 5).map((product, idx) => renderChip(product, idx))}
          {products.length > 5 && (
            <Tooltip
              arrow
              title={
                <Box>
                  {products.slice(5).map((product, idx) => (
                    <Box key={idx} sx={{ mb: idx < products.length - 6 ? 1 : 0 }}>
                      <div><strong>{product.shortName}</strong></div>
                      <div>Carrier: {product.carrier || 'N/A'}</div>
                      <div>Limit: {product.limit || 'N/A'}</div>
                      <div>Premium: {formatPremium(product.premium)}</div>
                      <div>Renewal: {formatDate(product.renewalDate)}</div>
                      {product.flag && <div style={{ color: '#ff6b6b' }}>Flagged</div>}
                    </Box>
                  ))}
                </Box>
              }
            >
              <Chip
                label={`+${products.length - 5} more`}
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
    id: 'product_count',
    label: 'Products',
    sortable: false,
    minWidth: 100,
    render: (value, row) => {
      const count = countActiveProducts(row);
      return (
        <Chip
          label={`${count} / 17`}
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
    id: 'total_premium',
    label: 'Total Premium',
    sortable: false,
    minWidth: 130,
    render: (value, row) => {
      const total = getTotalPremium(row);
      if (total === 0) {
        return <span style={{ color: '#999' }}>$0</span>;
      }

      return (
        <Box sx={{ fontWeight: 'bold', color: '#1976d2' }}>
          ${total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </Box>
      );
    }
  },
  {
    id: 'remarks',
    label: 'Remarks',
    sortable: true,
    minWidth: 200
  }
];

/**
 * CommercialTable component - displays list of commercial insurance records
 */
const CommercialTable = ({ commercial, onEdit, onDelete, onClone }) => {
  return (
    <DataTable
      columns={commercialColumns}
      data={commercial}
      onEdit={onEdit}
      onDelete={onDelete}
      onClone={onClone}
      idField="id"
      defaultOrderBy="next_renewal"
    />
  );
};

export default CommercialTable;
