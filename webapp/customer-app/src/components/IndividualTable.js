import React from 'react';
import DataTable from './DataTable';

// Column definitions for Individuals table
export const individualColumns = [
  {
    id: 'individual_id',
    label: 'Individual ID',
    sticky: true,
    sortable: true,
    minWidth: 120
  },
  {
    id: 'first_name',
    label: 'First Name',
    sticky: true,
    sortable: true,
    minWidth: 120,
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
    id: 'last_name',
    label: 'Last Name',
    sortable: true,
    minWidth: 120
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
 * IndividualTable component - displays list of individuals
 */
const IndividualTable = ({ individuals, onEdit, onDelete, onClone }) => {
  return (
    <DataTable
      columns={individualColumns}
      data={individuals}
      onEdit={onEdit}
      onDelete={onDelete}
      onClone={onClone}
      idField="id"
    />
  );
};

export default IndividualTable;
