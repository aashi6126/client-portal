import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TableSortLabel,
  Tooltip,
  Box,
  Chip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

/**
 * Reusable DataTable component for displaying tabular data with actions
 *
 * @param {Array} columns - Array of column definitions:
 *   [{ id: 'field_name', label: 'Display Name', sticky: true/false, sortable: true/false, render: (value, row) => ReactNode }]
 * @param {Array} data - Array of data rows
 * @param {Function} onEdit - Callback when edit button is clicked (row) => void
 * @param {Function} onDelete - Callback when delete button is clicked (row) => void
 * @param {String} idField - Field name to use as unique identifier (default: 'id')
 */
const DataTable = ({
  columns = [],
  data = [],
  onEdit,
  onDelete,
  idField = 'id',
  defaultOrderBy = '',
  defaultOrder = 'asc'
}) => {
  const [orderBy, setOrderBy] = useState(defaultOrderBy);
  const [order, setOrder] = useState(defaultOrder);

  // Handle sorting
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!orderBy) return data;

    const sortColumn = columns.find(c => c.id === orderBy);

    return [...data].sort((a, b) => {
      const aVal = sortColumn?.sortValue ? sortColumn.sortValue(a) : a[orderBy];
      const bVal = sortColumn?.sortValue ? sortColumn.sortValue(b) : b[orderBy];

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Handle different data types
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return order === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (order === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return bVal < aVal ? -1 : bVal > aVal ? 1 : 0;
      }
    });
  }, [data, orderBy, order, columns]);

  // Render cell content
  const renderCell = (column, row) => {
    const value = row[column.id];

    // Use custom render function if provided
    if (column.render) {
      return column.render(value, row);
    }

    // Default rendering
    if (value == null || value === '') {
      return <span style={{ color: '#999' }}>—</span>;
    }

    // Handle dates
    if (column.id.includes('date') || column.id.includes('Date')) {
      try {
        const str = String(value);
        const date = /^\d{4}-\d{2}-\d{2}$/.test(str) ? new Date(str + 'T00:00:00') : new Date(str);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        }
      } catch (e) {
        // Not a date, render as-is
      }
    }

    // Handle long text
    const strValue = String(value);
    if (strValue.length > 50) {
      return (
        <Tooltip title={strValue} arrow>
          <span>{strValue.substring(0, 47)}...</span>
        </Tooltip>
      );
    }

    return strValue;
  };

  return (
    <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 250px)', overflow: 'auto' }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            {/* Actions column (left) */}
            <TableCell
              sx={{
                fontWeight: 'bold',
                backgroundColor: '#f5f5f5',
                position: 'sticky',
                left: 0,
                zIndex: 3,
                boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
                minWidth: 80,
                whiteSpace: 'nowrap'
              }}
            >
              Actions
            </TableCell>

            {/* Data columns */}
            {columns.map((column) => (
              <TableCell
                key={column.id}
                sx={{
                  fontWeight: 'bold',
                  backgroundColor: '#f5f5f5',
                  whiteSpace: 'nowrap',
                  minWidth: column.minWidth || 150,
                  maxWidth: column.maxWidth || 300
                }}
              >
                {column.sortable !== false ? (
                  <TableSortLabel
                    active={orderBy === column.id}
                    direction={orderBy === column.id ? order : 'asc'}
                    onClick={() => handleRequestSort(column.id)}
                  >
                    {column.label}
                  </TableSortLabel>
                ) : (
                  column.label
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {sortedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                No data available
              </TableCell>
            </TableRow>
          ) : (
            sortedData.map((row, index) => (
              <TableRow
                key={row[idField] || index}
                hover
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
              >
                {/* Actions cell (left) */}
                <TableCell
                  sx={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 1,
                    backgroundColor: 'white',
                    boxShadow: '2px 0 5px rgba(0,0,0,0.1)'
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {onEdit && (
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => onEdit(row)}
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {onDelete && (
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => onDelete(row)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>

                {/* Data cells */}
                {columns.map((column) => (
                  <TableCell key={column.id}>
                    {renderCell(column, row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DataTable;
