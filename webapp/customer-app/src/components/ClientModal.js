import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
  MenuItem
} from '@mui/material';

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'District of Columbia' }
];

/**
 * ClientModal - Form for creating/editing client records
 */
const ClientModal = ({ open, onClose, client, onSave }) => {
  const [formData, setFormData] = useState({
    tax_id: '',
    client_name: '',
    status: 'Active',
    gross_revenue: '',
    total_ees: '',
    contact_person: '',
    email: '',
    phone_number: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    zip_code: ''
  });

  const [errors, setErrors] = useState({});

  // Initialize form data when modal opens or client changes
  useEffect(() => {
    if (client) {
      setFormData({
        tax_id: client.tax_id || '',
        client_name: client.client_name || '',
        status: client.status || 'Active',
        gross_revenue: client.gross_revenue ?? '',
        total_ees: client.total_ees ?? '',
        contact_person: client.contact_person || '',
        email: client.email || '',
        phone_number: client.phone_number || '',
        address_line_1: client.address_line_1 || '',
        address_line_2: client.address_line_2 || '',
        city: client.city || '',
        state: client.state || '',
        zip_code: client.zip_code || ''
      });
    } else {
      // Reset for new client
      setFormData({
        tax_id: '',
        client_name: '',
        status: 'Active',
        gross_revenue: '',
        total_ees: '',
        contact_person: '',
        email: '',
        phone_number: '',
        address_line_1: '',
        address_line_2: '',
        city: '',
        state: '',
        zip_code: ''
      });
    }
    setErrors({});
  }, [client, open]);

  // Handle input changes
  const handleChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
    // Clear error for this field
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: null
      });
    }
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!formData.tax_id || formData.tax_id.trim() === '') {
      newErrors.tax_id = 'Tax ID is required';
    }

    if (!formData.client_name || formData.client_name.trim() === '') {
      newErrors.client_name = 'Client Name is required';
    }

    if (formData.email && formData.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Invalid email format';
      }
    }

    if (formData.zip_code && formData.zip_code.length !== 5) {
      newErrors.zip_code = 'Zip code must be 5 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (validate()) {
      onSave({
        ...client,
        ...formData,
        gross_revenue: formData.gross_revenue !== '' ? parseFloat(formData.gross_revenue) : null,
        total_ees: formData.total_ees !== '' ? parseInt(formData.total_ees, 10) : null
      });
    }
  };

  const isEditMode = Boolean(client && client.id);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '500px' }
      }}
    >
      <DialogTitle>
        {isEditMode ? 'Edit Client' : 'Add New Client'}
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ pt: 1 }}>
          <Grid container spacing={2}>
            {/* Tax ID */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Tax ID *"
                value={formData.tax_id}
                onChange={handleChange('tax_id')}
                fullWidth
                size="small"
                error={Boolean(errors.tax_id)}
                helperText={errors.tax_id}
                disabled={isEditMode} // Tax ID should not be changed after creation
              />
            </Grid>

            {/* Client Name */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Client Name *"
                value={formData.client_name}
                onChange={handleChange('client_name')}
                fullWidth
                size="small"
                error={Boolean(errors.client_name)}
                helperText={errors.client_name}
              />
            </Grid>

            {/* Status */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Status"
                select
                value={formData.status}
                onChange={handleChange('status')}
                fullWidth
                size="small"
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Quoting">Quoting</MenuItem>
                <MenuItem value="Prospect">Prospect</MenuItem>
              </TextField>
            </Grid>

            {/* Gross Revenue */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Gross Revenue"
                type="number"
                value={formData.gross_revenue}
                onChange={handleChange('gross_revenue')}
                fullWidth
                size="small"
                InputProps={{ startAdornment: <span style={{ marginRight: 4, color: '#999' }}>$</span> }}
              />
            </Grid>

            {/* Total EEs */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Total EEs"
                type="number"
                value={formData.total_ees}
                onChange={handleChange('total_ees')}
                fullWidth
                size="small"
              />
            </Grid>

            {/* Contact Person */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Contact Person"
                value={formData.contact_person}
                onChange={handleChange('contact_person')}
                fullWidth
                size="small"
              />
            </Grid>

            {/* Email */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                fullWidth
                size="small"
                error={Boolean(errors.email)}
                helperText={errors.email}
              />
            </Grid>

            {/* Phone Number */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Phone Number"
                value={formData.phone_number}
                onChange={handleChange('phone_number')}
                fullWidth
                size="small"
              />
            </Grid>

            {/* Address Line 1 */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Address Line 1"
                value={formData.address_line_1}
                onChange={handleChange('address_line_1')}
                fullWidth
                size="small"
              />
            </Grid>

            {/* Address Line 2 */}
            <Grid item xs={12}>
              <TextField
                label="Address Line 2"
                value={formData.address_line_2}
                onChange={handleChange('address_line_2')}
                fullWidth
                size="small"
              />
            </Grid>

            {/* City */}
            <Grid item xs={12} sm={4}>
              <TextField
                label="City"
                value={formData.city}
                onChange={handleChange('city')}
                fullWidth
                size="small"
              />
            </Grid>

            {/* State */}
            <Grid item xs={12} sm={4}>
              <TextField
                label="State"
                select
                value={formData.state}
                onChange={handleChange('state')}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (val) => {
                    if (!val) return <em style={{ color: '#999' }}>Select State</em>;
                    const found = US_STATES.find(s => s.code === val);
                    return found ? `${found.name} (${found.code})` : val;
                  }
                }}
              >
                <MenuItem value="">
                  <em>Select State</em>
                </MenuItem>
                {US_STATES.map((s) => (
                  <MenuItem key={s.code} value={s.code}>
                    {s.name} ({s.code})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Zip Code */}
            <Grid item xs={12} sm={4}>
              <TextField
                label="Zip Code"
                value={formData.zip_code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 5);
                  setFormData({ ...formData, zip_code: val });
                  if (errors.zip_code) setErrors({ ...errors, zip_code: null });
                }}
                fullWidth
                size="small"
                error={Boolean(errors.zip_code)}
                helperText={errors.zip_code}
                inputProps={{ maxLength: 5 }}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClientModal;
