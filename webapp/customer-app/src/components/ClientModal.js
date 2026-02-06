import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box
} from '@mui/material';

/**
 * ClientModal - Form for creating/editing client records
 */
const ClientModal = ({ open, onClose, client, onSave }) => {
  const [formData, setFormData] = useState({
    tax_id: '',
    client_name: '',
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (validate()) {
      onSave({
        ...client,
        ...formData
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
                value={formData.state}
                onChange={handleChange('state')}
                fullWidth
                size="small"
              />
            </Grid>

            {/* Zip Code */}
            <Grid item xs={12} sm={4}>
              <TextField
                label="Zip Code"
                value={formData.zip_code}
                onChange={handleChange('zip_code')}
                fullWidth
                size="small"
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
