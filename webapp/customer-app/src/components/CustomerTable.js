// FILE: ./components/CustomerTable.js
import React, { useState } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

export const columns = [
  { id: 'Tax_ID', label: 'Tax ID', sticky: true },
  { id: 'Form_Fire_Code', label: 'Form Fire Code', sticky: true },
  { id: 'Enrollment_POC', label: 'Client POC', sticky: true },
  { id: 'Renewal_Date', label: 'Renewal Date', sticky: true },
  { id: 'Other_Broker', label: 'Other Broker', sticky: true },
  { id: 'Group_Name', label: 'Group Name' },
  { id: 'Contact_Person', label: 'Contact Person' },
  { id: 'Email', label: 'Email' },
  { id: 'Phone_Number', label: 'Phone Number' },
  { id: 'Funding', label: 'Funding' },
  { id: 'Current_Carrier', label: 'Current Carrier' },
  { id: 'Num_Employees_At_Renewal', label: '# of Emp at renewal' },
  { id: 'Waiting_Period', label: 'Waiting Period' },
  { id: 'Deductible_Accumulation', label: 'Deductible Accumulation' },
  { id: 'Previous_Carrier', label: 'Previous Carrier' },
  { id: 'Cobra_Carrier', label: 'Cobra Carrier' },
  { id: 'Dental_Effective_Date', label: 'Dental Effective Date' },
  { id: 'Dental_Carrier', label: 'Dental Carrier' },
  { id: 'Vision_Effective_Date', label: 'Vision Effective Date' },
  { id: 'Vision_Carrier', label: 'Vision Carrier' },
  { id: 'Life_And_ADND_Effective_Date', label: 'Life & AD&D Effective Date' },
  { id: 'Life_And_ADND_Carrier', label: 'Life & AD&D Carrier' },
  { id: 'LTD_Effective_Date', label: 'LTD Effective Date' },
  { id: 'LTD_Carrier', label: 'LTD Carrier' },
  { id: 'STD_Effective_Date', label: 'STD Effective Date' },
  { id: 'STD_Carrier', label: 'STD Carrier' },
  { id: 'Effective_Date_401K', label: '401K Effective Date' },
  { id: 'Carrier_401K', label: '401K Carrier' },
  { id: 'Employer', label: 'Employer' },
  { id: 'Employee', label: 'Employee' },
];

const stickyStyles = [
  { left: 0 },
  { left: 120 },
  { left: 240 },
  { left: 360 },
  { left: 480 },
];

const CustomerTable = ({ customers, openModal, deleteCustomer, cloneCustomer }) => {
  const [orderBy, setOrderBy] = useState('');
  const [order, setOrder] = useState('asc');

  const handleSort = (columnId) => {
    const isAsc = orderBy === columnId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(columnId);
  };

  const sortedCustomers = React.useMemo(() => {
    if (!orderBy || !Array.isArray(customers)) return customers;

    return [...customers].sort((a, b) => {
      const aValue = a[orderBy] || '';
      const bValue = b[orderBy] || '';

      // Handle numeric sorting
      const aNum = parseFloat(aValue);
      const bNum = parseFloat(bValue);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return order === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // Handle string sorting (case-insensitive)
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      if (order === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return bStr < aStr ? -1 : bStr > aStr ? 1 : 0;
      }
    });
  }, [customers, orderBy, order]);

  return (
    <TableContainer
      component={Paper}
      sx={{
        maxHeight: 600,
        border: '1px solid #888',
      }}
    >
      <Table
        stickyHeader
        size="small"
        sx={{
          borderCollapse: 'separate',
          borderSpacing: 0,
          minWidth: 120 * (columns.length + 1),
          '& th, & td': {
            borderRight: '1px solid #ccc',
            borderBottom: '1px solid #ccc',
            backgroundClip: 'padding-box',
            padding: '4px 8px', // compact padding
            whiteSpace: 'nowrap', // prevent text wrapping
            fontSize: '12px', // smaller font for compactness
          },
          '& th:last-child, & td:last-child': {
            borderRight: 0,
          },
        }}
      >
        <TableHead>
          <TableRow>
            {columns.map((col, idx) => (
              <TableCell
                key={col.id}
                sx={
                  col.sticky
                    ? {
                        position: 'sticky',
                        left: stickyStyles[idx].left,
                        zIndex: 3,
                        background: '#e3f2fd',
                        minWidth: 120,
                        fontWeight: 600,
                        borderRight: '1px solid #ccc',
                        borderBottom: '1px solid #ccc',
                        whiteSpace: 'nowrap',
                      }
                    : {
                        minWidth: 120,
                        fontWeight: 600,
                        background: '#e3f2fd',
                        borderRight: '1px solid #ccc',
                        borderBottom: '1px solid #ccc',
                        zIndex: 1,
                        whiteSpace: 'nowrap',
                      }
                }
                align="left"
              >
                <TableSortLabel
                  active={orderBy === col.id}
                  direction={orderBy === col.id ? order : 'asc'}
                  onClick={() => handleSort(col.id)}
                  sx={{
                    '&.MuiTableSortLabel-root': {
                      color: 'inherit',
                      fontWeight: 600,
                    },
                    '&.MuiTableSortLabel-root:hover': {
                      color: 'primary.main',
                    },
                    '& .MuiTableSortLabel-icon': {
                      fontSize: '14px',
                    },
                  }}
                >
                  {col.label}
                </TableSortLabel>
              </TableCell>
            ))}
            <TableCell
              sx={{
                minWidth: 120,
                fontWeight: 600,
                background: '#e3f2fd',
                borderRight: 0,
                borderBottom: '1px solid #ccc',
                zIndex: 1,
                whiteSpace: 'nowrap',
              }}
              align="center"
            >
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.isArray(sortedCustomers) && sortedCustomers.length > 0 ? (
            sortedCustomers.map((customer) => (
              <TableRow key={customer.Customer_id}>
                {columns.map((col, idx) => (
                  <TableCell
                    key={col.id}
                    sx={
                      col.sticky
                        ? {
                            position: 'sticky',
                            left: stickyStyles[idx].left,
                            zIndex: 2,
                            background: '#fff',
                            minWidth: 120,
                            borderRight: '1px solid #ccc',
                            borderBottom: '1px solid #ccc',
                            whiteSpace: 'nowrap',
                          }
                        : {
                            minWidth: 120,
                            background: '#fff',
                            borderRight: '1px solid #ccc',
                            borderBottom: '1px solid #ccc',
                            zIndex: 1,
                            whiteSpace: 'nowrap',
                          }
                    }
                  >
                    {customer[col.id]}
                  </TableCell>
                ))}
                <TableCell
                  sx={{
                    minWidth: 120,
                    background: '#fff',
                    borderRight: 0,
                    borderBottom: '1px solid #ccc',
                    zIndex: 1,
                    whiteSpace: 'nowrap',
                  }}
                  align="center"
                >
                  <IconButton color="primary" size="small" onClick={() => openModal(customer)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton color="error" size="small" onClick={() => deleteCustomer(customer)}>
                    <DeleteIcon />
                  </IconButton>
                  <IconButton color="info" size="small" onClick={() => cloneCustomer(customer)}>
                    <ContentCopyIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length + 1} align="center">
                No customers found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default CustomerTable;