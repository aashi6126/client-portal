import React from 'react';
import DataTable from './DataTable';
import { Chip } from '@mui/material';

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
    minWidth: 140
  },
  {
    id: 'status',
    label: 'Status',
    sortable: true,
    minWidth: 100,
    render: (value) => {
      if (!value) return <span style={{ color: '#999' }}>—</span>;
      const colorMap = {
        'Active': 'success',
        'Quoting': 'warning',
        'Prospect': 'info'
      };
      return (
        <Chip
          label={value}
          size="small"
          color={colorMap[value] || 'default'}
        />
      );
    }
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
    minWidth: 130
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
