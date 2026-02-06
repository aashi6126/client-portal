import React from 'react';
import DataTable from './DataTable';
import { Chip, Box, Tooltip } from '@mui/material';

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

// Helper function to get all active products
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
    .map(([, name]) => name);
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
    .map(d => new Date(d))
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
    id: 'active_products',
    label: 'Coverage',
    sortable: false,
    minWidth: 300,
    render: (value, row) => {
      const products = getActiveProducts(row);
      if (products.length === 0) {
        return <span style={{ color: '#999' }}>No coverage</span>;
      }

      return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {products.slice(0, 5).map((product, idx) => (
            <Chip
              key={idx}
              label={product}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: '20px' }}
            />
          ))}
          {products.length > 5 && (
            <Tooltip title={products.slice(5).join(', ')} arrow>
              <Chip
                label={`+${products.length - 5} more`}
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
    />
  );
};

export default CommercialTable;
