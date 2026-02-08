import React from 'react';
import DataTable from './DataTable';
import { Chip, Box, Tooltip } from '@mui/material';

// Parse date string as local time (avoids UTC timezone shift)
const parseDate = (d) => {
  if (!d) return null;
  const str = String(d);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return new Date(str + 'T00:00:00');
  }
  return new Date(str);
};

// Helper function to count active products
const countActiveProducts = (row) => {
  const products = [
    'general_liability', 'property', 'bop', 'umbrella', 'workers_comp',
    'professional_eo', 'cyber', 'auto', 'epli', 'nydbl', 'surety',
    'product_liability', 'flood', 'crime', 'directors_officers',
    'fiduciary', 'inland_marine'
  ];

  return products.filter(p => row[`${p}_carrier`]).length;
};

// Helper function to get all active products with details
const getActiveProducts = (row) => {
  const productNames = {
    general_liability: 'GL',
    property: 'Property',
    bop: 'BOP',
    umbrella: 'Umbrella',
    workers_comp: 'WC',
    professional_eo: 'E&O',
    cyber: 'Cyber',
    auto: 'Auto',
    epli: 'EPLI',
    nydbl: 'NYDBL',
    surety: 'Surety',
    product_liability: 'Product',
    flood: 'Flood',
    crime: 'Crime',
    directors_officers: 'D&O',
    fiduciary: 'Fiduciary',
    inland_marine: 'Marine'
  };

  return Object.entries(productNames)
    .filter(([key]) => row[`${key}_carrier`])
    .map(([key, name]) => ({
      shortName: name,
      carrier: row[`${key}_carrier`],
      renewalDate: row[`${key}_renewal_date`],
      premium: row[`${key}_premium`],
      limit: row[`${key}_limit`]
    }));
};

// Helper function to get next renewal date
const getNextRenewal = (row) => {
  const products = [
    'general_liability', 'property', 'bop', 'umbrella', 'workers_comp',
    'professional_eo', 'cyber', 'auto', 'epli', 'nydbl', 'surety',
    'product_liability', 'flood', 'crime', 'directors_officers',
    'fiduciary', 'inland_marine'
  ];

  const renewalDates = products
    .map(p => row[`${p}_renewal_date`])
    .filter(d => d)
    .map(d => parseDate(d))
    .sort((a, b) => a - b);

  return renewalDates.length > 0 ? renewalDates[0] : null;
};

// Helper function to calculate total premium
const getTotalPremium = (row) => {
  const products = [
    'general_liability', 'property', 'bop', 'umbrella', 'workers_comp',
    'professional_eo', 'cyber', 'auto', 'epli', 'nydbl', 'surety',
    'product_liability', 'flood', 'crime', 'directors_officers',
    'fiduciary', 'inland_marine'
  ];

  return products
    .map(p => parseFloat(row[`${p}_premium`]) || 0)
    .reduce((sum, premium) => sum + premium, 0);
};

// Column definitions for Commercial Insurance table
export const commercialColumns = [
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
    label: 'Outstanding Item',
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
          return parseDate(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
              </Box>
            }
          >
            <Chip
              label={product.shortName}
              size="small"
              variant={renewing ? 'filled' : 'outlined'}
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
      const d = getNextRenewal(row);
      return d ? d.getTime() : null;
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
