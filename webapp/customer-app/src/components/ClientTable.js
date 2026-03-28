import React from 'react';
import { Tooltip } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import DataTable from './DataTable';

// Column definitions for Clients table
export const clientColumns = [
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
      const dotColor = row.status === 'Active' ? '#4caf50' : row.status === 'Prospect' ? '#ff9800' : '#999';
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
    id: 'coverage_icons',
    label: 'Coverage',
    sortable: false,
    minWidth: 80,
    render: (_, row) => {
      const hasEB = row.has_employee_benefits;
      const hasCI = row.has_commercial_insurance;
      if (!hasEB && !hasCI) return <span style={{ color: '#ccc' }}>—</span>;
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {hasEB && (
            <Tooltip title="Employee Benefits">
              <HealthAndSafetyIcon sx={{ fontSize: 18, color: '#2e7d32' }} />
            </Tooltip>
          )}
          {hasCI && (
            <Tooltip title="Commercial Insurance">
              <BusinessIcon sx={{ fontSize: 18, color: '#1565c0' }} />
            </Tooltip>
          )}
        </span>
      );
    }
  },
  {
    id: 'dba',
    label: 'DBA',
    sortable: true,
    minWidth: 140
  },
  {
    id: 'industry',
    label: 'Industry',
    sortable: true,
    minWidth: 140
  },
  {
    id: 'gross_revenue',
    label: 'Gross Revenue',
    sortable: true,
    minWidth: 130,
    render: (value) => {
      if (value == null) return <span style={{ color: '#999' }}>—</span>;
      return `$${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
  },
  {
    id: 'total_ees',
    label: 'Total EEs',
    sortable: true,
    minWidth: 100,
    render: (value) => {
      if (value == null) return <span style={{ color: '#999' }}>—</span>;
      return value.toLocaleString('en-US');
    }
  },
  {
    id: 'contact_person',
    label: 'Contact Person',
    sortable: true,
    minWidth: 150
  },
  {
    id: 'email',
    label: 'Email',
    sortable: true,
    minWidth: 200
  },
  {
    id: 'phone_number',
    label: 'Phone Number',
    sortable: true,
    minWidth: 150,
    render: (value, row) => {
      if (!value) return '';
      const ext = row.phone_extension;
      return ext ? `${value} x${ext}` : value;
    }
  },
  {
    id: 'address_line_1',
    label: 'Address Line 1',
    sortable: true,
    minWidth: 180
  },
  {
    id: 'address_line_2',
    label: 'Address Line 2',
    sortable: true,
    minWidth: 180
  },
  {
    id: 'city',
    label: 'City',
    sortable: true,
    minWidth: 120
  },
  {
    id: 'state',
    label: 'State',
    sortable: true,
    minWidth: 80
  },
  {
    id: 'zip_code',
    label: 'Zip Code',
    sortable: true,
    minWidth: 100
  }
];

/**
 * ClientTable component - displays list of clients
 */
const ClientTable = ({ clients, onEdit, onDelete, onClone }) => {
  return (
    <DataTable
      columns={clientColumns}
      data={clients}
      onEdit={onEdit}
      onDelete={onDelete}
      onClone={onClone}
      idField="id"
    />
  );
};

export default ClientTable;
