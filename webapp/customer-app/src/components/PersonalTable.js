import React from 'react';
import DataTable from './DataTable';
import { Chip, Box, Tooltip } from '@mui/material';

// All personal coverage types are single-plan
const PERSONAL_PRODUCTS = {
  personal_auto: 'Auto',
  homeowners: 'Home',
  personal_umbrella: 'Umbrella',
  event: 'Event',
  visitors_medical: 'Visitors'
};

// Color mapping for outstanding item values
const OUTSTANDING_ITEM_COLORS = {
  'Premium Due': '#ed6c02',
  'In Audit': '#0288d1',
  'Cancel Due': '#d32f2f',
  'Add Line': '#7b1fa2',
  'Complete': '#2e7d32',
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

// Helper function to count active products (types that have a carrier)
const countActiveProducts = (row) => {
  let count = 0;
  Object.keys(PERSONAL_PRODUCTS).forEach(key => {
    if (row[`${key}_carrier`]) count++;
  });
  return count;
};

// Helper to get the renewal/reference date field for each coverage type
const getRenewalDateField = (prefix) => {
  if (prefix === 'event') return 'event_start_date';
  if (prefix === 'visitors_medical') return 'visitors_medical_start_date';
  return `${prefix}_renewal_date`;
};

// Helper function to get all active products with details
const getActiveProducts = (row) => {
  const products = [];

  Object.entries(PERSONAL_PRODUCTS).forEach(([key, name]) => {
    if (row[`${key}_carrier`]) {
      const renewalField = getRenewalDateField(key);
      const product = {
        prefix: key,
        shortName: name,
        carrier: row[`${key}_carrier`],
        renewalDate: row[renewalField],
        premium: row[`${key}_premium`],
        remarks: row[`${key}_remarks`],
        outstandingItem: row[`${key}_outstanding_item`]
      };

      // Personal Auto specific fields
      if (key === 'personal_auto') {
        product.bi_occ_limit = row.personal_auto_bi_occ_limit;
        product.bi_agg_limit = row.personal_auto_bi_agg_limit;
        product.pd_limit = row.personal_auto_pd_limit;
      }

      // Homeowners specific fields
      if (key === 'homeowners') {
        product.dwelling_limit = row.homeowners_dwelling_limit;
        product.liability_limit = row.homeowners_liability_limit;
      }

      // Personal Umbrella specific fields
      if (key === 'personal_umbrella') {
        product.liability_limit = row.personal_umbrella_liability_limit;
        product.deductible = row.personal_umbrella_deductible;
      }

      // Event specific fields
      if (key === 'event') {
        product.event_type = row.event_event_type;
        product.event_location = row.event_event_location;
        product.event_start_date = row.event_start_date;
        product.event_end_date = row.event_end_date;
        product.entry_fee = row.event_entry_fee;
        product.audience_count = row.event_audience_count;
      }

      // Visitors Medical specific fields
      if (key === 'visitors_medical') {
        product.start_date = row.visitors_medical_start_date;
        product.end_date = row.visitors_medical_end_date;
        product.destination_country = row.visitors_medical_destination_country;
      }

      products.push(product);
    }
  });

  // Sort: products with remarks first
  products.sort((a, b) => {
    const aHas = a.remarks ? 1 : 0;
    const bHas = b.remarks ? 1 : 0;
    return bHas - aHas;
  });

  return products;
};

// Helper function to get next renewal date
const getNextRenewal = (row) => {
  const renewalDates = [];

  Object.keys(PERSONAL_PRODUCTS).forEach(key => {
    const renewalField = getRenewalDateField(key);
    if (row[renewalField]) renewalDates.push(parseDate(row[renewalField]));
  });

  if (renewalDates.length === 0) return null;

  const today = new Date();
  const futureDates = renewalDates.filter(d => d >= today).sort((a, b) => a - b);
  return futureDates.length > 0 ? futureDates[0] : renewalDates.sort((a, b) => b - a)[0];
};

// Helper function to calculate total premium
const getTotalPremium = (row) => {
  let total = 0;
  Object.keys(PERSONAL_PRODUCTS).forEach(key => {
    total += parseFloat(row[`${key}_premium`]) || 0;
  });
  return total;
};

// Build tooltip content based on coverage type
const renderTooltipContent = (product, formatDate, formatPremium) => {
  const { prefix } = product;

  if (prefix === 'personal_auto') {
    return (
      <Box>
        <div><strong>{product.shortName}</strong></div>
        <div>Carrier: {product.carrier || ''}</div>
        <div>BI Occ Limit: {product.bi_occ_limit ? `$${product.bi_occ_limit}` : ''}</div>
        <div>BI Agg Limit: {product.bi_agg_limit ? `$${product.bi_agg_limit}` : ''}</div>
        <div>PD Limit: {product.pd_limit ? `$${product.pd_limit}` : ''}</div>
        <div>Premium: {formatPremium(product.premium)}</div>
        <div>Renewal: {formatDate(product.renewalDate)}</div>
        {product.remarks && <div>Remarks: {product.remarks}</div>}
        {product.outstandingItem && <div>Outstanding: <span style={{ color: OUTSTANDING_ITEM_COLORS[product.outstandingItem] || 'inherit', fontWeight: 600 }}>{product.outstandingItem}</span></div>}
      </Box>
    );
  }

  if (prefix === 'homeowners') {
    return (
      <Box>
        <div><strong>{product.shortName}</strong></div>
        <div>Carrier: {product.carrier || ''}</div>
        <div>Dwelling Limit: {product.dwelling_limit ? `$${product.dwelling_limit}` : ''}</div>
        <div>Liability Limit: {product.liability_limit ? `$${product.liability_limit}` : ''}</div>
        <div>Premium: {formatPremium(product.premium)}</div>
        <div>Renewal: {formatDate(product.renewalDate)}</div>
        {product.remarks && <div>Remarks: {product.remarks}</div>}
        {product.outstandingItem && <div>Outstanding: <span style={{ color: OUTSTANDING_ITEM_COLORS[product.outstandingItem] || 'inherit', fontWeight: 600 }}>{product.outstandingItem}</span></div>}
      </Box>
    );
  }

  if (prefix === 'personal_umbrella') {
    return (
      <Box>
        <div><strong>{product.shortName}</strong></div>
        <div>Carrier: {product.carrier || ''}</div>
        <div>Liability Limit: {product.liability_limit ? `$${product.liability_limit}` : ''}</div>
        <div>Deductible: {product.deductible ? `$${product.deductible}` : ''}</div>
        <div>Premium: {formatPremium(product.premium)}</div>
        <div>Renewal: {formatDate(product.renewalDate)}</div>
        {product.remarks && <div>Remarks: {product.remarks}</div>}
        {product.outstandingItem && <div>Outstanding: <span style={{ color: OUTSTANDING_ITEM_COLORS[product.outstandingItem] || 'inherit', fontWeight: 600 }}>{product.outstandingItem}</span></div>}
      </Box>
    );
  }

  if (prefix === 'event') {
    return (
      <Box>
        <div><strong>{product.shortName}</strong></div>
        <div>Carrier: {product.carrier || ''}</div>
        <div>Event Type: {product.event_type || ''}</div>
        <div>Location: {product.event_location || ''}</div>
        <div>Start Date: {formatDate(product.event_start_date)}</div>
        <div>End Date: {formatDate(product.event_end_date)}</div>
        <div>Premium: {formatPremium(product.premium)}</div>
        {product.remarks && <div>Remarks: {product.remarks}</div>}
        {product.outstandingItem && <div>Outstanding: <span style={{ color: OUTSTANDING_ITEM_COLORS[product.outstandingItem] || 'inherit', fontWeight: 600 }}>{product.outstandingItem}</span></div>}
      </Box>
    );
  }

  if (prefix === 'visitors_medical') {
    return (
      <Box>
        <div><strong>{product.shortName}</strong></div>
        <div>Carrier: {product.carrier || ''}</div>
        <div>Start Date: {formatDate(product.start_date)}</div>
        <div>End Date: {formatDate(product.end_date)}</div>
        <div>Destination: {product.destination_country || ''}</div>
        <div>Premium: {formatPremium(product.premium)}</div>
        {product.remarks && <div>Remarks: {product.remarks}</div>}
        {product.outstandingItem && <div>Outstanding: <span style={{ color: OUTSTANDING_ITEM_COLORS[product.outstandingItem] || 'inherit', fontWeight: 600 }}>{product.outstandingItem}</span></div>}
      </Box>
    );
  }

  // Fallback
  return (
    <Box>
      <div><strong>{product.shortName}</strong></div>
      <div>Carrier: {product.carrier || ''}</div>
      <div>Premium: {formatPremium(product.premium)}</div>
      <div>Renewal: {formatDate(product.renewalDate)}</div>
      {product.remarks && <div>Remarks: {product.remarks}</div>}
      {product.outstandingItem && <div>Outstanding: <span style={{ color: OUTSTANDING_ITEM_COLORS[product.outstandingItem] || 'inherit', fontWeight: 600 }}>{product.outstandingItem}</span></div>}
    </Box>
  );
};

// Column definitions for Personal Insurance table
const getPersonalColumns = (onEdit) => [
  {
    id: 'individual_id',
    label: 'Individual ID',
    sticky: true,
    sortable: true,
    minWidth: 120
  },
  {
    id: 'individual_name',
    label: 'Individual Name',
    sticky: true,
    sortable: true,
    minWidth: 140,
    render: (value, row) => {
      const dotColor = row.individual_status === 'Active' ? '#4caf50' : row.individual_status === 'Prospect' ? '#ff9800' : '#999';
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
    sortable: true,
    minWidth: 140
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
        if (!d) return '';
        try {
          return parseDate(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        } catch { return d; }
      };

      const formatPremium = (p) => {
        if (!p) return '';
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

      const hasOutstanding = (item) => item && item !== 'None' && item !== 'Complete';

      const renderChip = (product, idx) => {
        const renewing = isUpForRenewal(product.renewalDate);
        const showRedDot = hasOutstanding(product.outstandingItem);
        return (
          <Tooltip
            key={idx}
            arrow
            title={renderTooltipContent(product, formatDate, formatPremium)}
          >
            <Chip
              label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{showRedDot && <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#d32f2f', display: 'inline-block', flexShrink: 0 }} />}{product.shortName}</span>}
              size="small"
              variant={renewing ? 'filled' : 'outlined'}
              onClick={(e) => {
                e.stopPropagation();
                if (onEdit) onEdit(row, product.prefix);
              }}
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
                      {renderTooltipContent(product, formatDate, formatPremium)}
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
          label={`${count} / 5`}
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
      return d ? d.getTime() : Number.MAX_SAFE_INTEGER;
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
  }
];

/**
 * PersonalTable component - displays list of personal insurance records
 */
const PersonalTable = ({ personal, onEdit, onDelete, onClone }) => {
  return (
    <DataTable
      columns={getPersonalColumns(onEdit)}
      data={personal}
      onEdit={onEdit}
      onDelete={onDelete}
      onClone={onClone}
      idField="id"
      defaultOrderBy="next_renewal"
    />
  );
};

export default PersonalTable;
