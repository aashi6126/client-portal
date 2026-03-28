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
  MenuItem,
  Typography,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

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

const emptyContact = { contact_person: '', email: '', phone_number: '', phone_extension: '', address_line_1: '', address_line_2: '', city: '', state: 'NJ', zip_code: '' };

/**
 * ClientModal - Form for creating/editing client records
 */
const ClientModal = ({ open, onClose, client, onSave }) => {
  const [formData, setFormData] = useState({
    tax_id: '',
    client_name: '',
    dba: '',
    status: 'Active',
    gross_revenue: '',
    total_ees: '',
    industry: ''
  });

  const [contacts, setContacts] = useState([{ ...emptyContact }]);
  const [errors, setErrors] = useState({});

  // Initialize form data when modal opens or client changes
  useEffect(() => {
    if (client) {
      setFormData({
        tax_id: client.tax_id || '',
        client_name: client.client_name || '',
        dba: client.dba || '',
        status: client.status || 'Active',
        gross_revenue: client.gross_revenue ?? '',
        total_ees: client.total_ees ?? '',
        industry: client.industry || ''
      });

      // Load contacts from client data
      if (client.contacts && client.contacts.length > 0) {
        setContacts(client.contacts.map(c => ({
          contact_person: c.contact_person || '',
          email: c.email || '',
          phone_number: c.phone_number || '',
          phone_extension: c.phone_extension || '',
          address_line_1: c.address_line_1 || '',
          address_line_2: c.address_line_2 || '',
          city: c.city || '',
          state: c.state || '',
          zip_code: c.zip_code || ''
        })));
      } else if (client.contact_person || client.email || client.phone_number) {
        // Backward compatibility: populate from flat fields
        setContacts([{
          contact_person: client.contact_person || '',
          email: client.email || '',
          phone_number: client.phone_number || '',
          phone_extension: client.phone_extension || '',
          address_line_1: client.address_line_1 || '',
          address_line_2: client.address_line_2 || '',
          city: client.city || '',
          state: client.state || '',
          zip_code: client.zip_code || ''
        }]);
      } else {
        setContacts([{ ...emptyContact }]);
      }
    } else {
      // Reset for new client
      setFormData({
        tax_id: '',
        client_name: '',
        dba: '',
        status: 'Active',
        gross_revenue: '',
        total_ees: '',
        address_line_1: '',
        address_line_2: '',
        city: '',
        state: '',
        zip_code: ''
      });
      setContacts([{ ...emptyContact }]);
    }
    setErrors({});
  }, [client, open]);

  // Handle input changes
  const handleChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  // Contact helpers
  const updateContact = (index, field, value) => {
    setContacts(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  const addContact = () => {
    setContacts(prev => [...prev, { ...emptyContact }]);
  };

  const removeContact = (index) => {
    setContacts(prev => prev.filter((_, i) => i !== index));
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!formData.tax_id || formData.tax_id.trim() === '') {
      newErrors.tax_id = 'Tax ID is required';
    } else if (!/^\d{2}-\d{7}$/.test(formData.tax_id)) {
      newErrors.tax_id = 'Tax ID must be in ##-####### format';
    }

    if (!formData.client_name || formData.client_name.trim() === '') {
      newErrors.client_name = 'Client Name is required';
    }

    // Validate contacts
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
    contacts.forEach((c, i) => {
      if (c.email && c.email.trim() !== '' && !emailRegex.test(c.email)) {
        newErrors[`contact_email_${i}`] = 'Invalid email format';
      }
      if (c.phone_number && c.phone_number.trim() !== '' && !phoneRegex.test(c.phone_number)) {
        newErrors[`contact_phone_${i}`] = 'Phone must be ###-###-####';
      }
      if (c.zip_code && c.zip_code.length !== 5) {
        newErrors[`contact_zip_${i}`] = 'Zip code must be 5 digits';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (validate()) {
      // First contact populates flat fields for backward compat
      const firstContact = contacts[0] || {};
      onSave({
        ...client,
        ...formData,
        contact_person: firstContact.contact_person || '',
        email: firstContact.email || '',
        phone_number: firstContact.phone_number || '',
        phone_extension: firstContact.phone_extension || '',
        address_line_1: firstContact.address_line_1 || '',
        address_line_2: firstContact.address_line_2 || '',
        city: firstContact.city || '',
        state: firstContact.state || '',
        zip_code: firstContact.zip_code || '',
        gross_revenue: formData.gross_revenue !== '' ? parseFloat(formData.gross_revenue) : null,
        total_ees: formData.total_ees !== '' ? parseInt(formData.total_ees, 10) : null,
        contacts: contacts
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
          {/* Client Information */}
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
            Client Information
          </Typography>
          <Grid container spacing={2}>
            {/* Tax ID */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Tax ID *"
                value={formData.tax_id}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                  const val = digits.length > 2 ? digits.slice(0, 2) + '-' + digits.slice(2) : digits;
                  setFormData({ ...formData, tax_id: val });
                  if (errors.tax_id) setErrors({ ...errors, tax_id: null });
                }}
                fullWidth
                size="small"
                placeholder="##-#######"
                error={Boolean(errors.tax_id)}
                helperText={errors.tax_id}
                disabled={false}
                inputProps={{ maxLength: 10 }}
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

            {/* DBA */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="DBA"
                value={formData.dba}
                onChange={handleChange('dba')}
                fullWidth
                size="small"
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

            {/* Industry */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Industry"
                value={formData.industry}
                onChange={handleChange('industry')}
                fullWidth
                size="small"
              />
            </Grid>
          </Grid>

          {/* Contacts Section */}
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Contacts ({contacts.length})
            </Typography>
            <Button
              size="small"
              startIcon={<AddCircleOutlineIcon />}
              onClick={addContact}
            >
              Add Contact
            </Button>
          </Box>

          {contacts.map((contact, idx) => (
            <Box key={idx} sx={{ mb: 1.5, p: 1.5, backgroundColor: '#fafafa', borderRadius: 1, border: '1px solid #e0e0e0' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, color: '#666' }}>
                  Contact {idx + 1}{idx === 0 ? ' (Primary)' : ''}
                </Typography>
                {contacts.length > 1 && (
                  <Tooltip title={`Remove Contact ${idx + 1}`}>
                    <IconButton size="small" color="error" onClick={() => removeContact(idx)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Contact Person"
                    value={contact.contact_person}
                    onChange={(e) => updateContact(idx, 'contact_person', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Email"
                    type="email"
                    value={contact.email}
                    onChange={(e) => updateContact(idx, 'email', e.target.value)}
                    fullWidth
                    size="small"
                    error={Boolean(errors[`contact_email_${idx}`])}
                    helperText={errors[`contact_email_${idx}`]}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Phone Number"
                    value={contact.phone_number}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      let val = digits;
                      if (digits.length > 6) val = digits.slice(0, 3) + '-' + digits.slice(3, 6) + '-' + digits.slice(6);
                      else if (digits.length > 3) val = digits.slice(0, 3) + '-' + digits.slice(3);
                      updateContact(idx, 'phone_number', val);
                    }}
                    fullWidth
                    size="small"
                    placeholder="###-###-####"
                    error={Boolean(errors[`contact_phone_${idx}`])}
                    helperText={errors[`contact_phone_${idx}`]}
                    inputProps={{ maxLength: 12 }}
                  />
                </Grid>
                <Grid item xs={12} sm={1}>
                  <TextField
                    label="Ext"
                    value={contact.phone_extension}
                    onChange={(e) => updateContact(idx, 'phone_extension', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Address Line 1"
                    value={contact.address_line_1}
                    onChange={(e) => updateContact(idx, 'address_line_1', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Address Line 2"
                    value={contact.address_line_2}
                    onChange={(e) => updateContact(idx, 'address_line_2', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="City"
                    value={contact.city}
                    onChange={(e) => updateContact(idx, 'city', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="State"
                    select
                    value={contact.state}
                    onChange={(e) => updateContact(idx, 'state', e.target.value)}
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
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Zip Code"
                    value={contact.zip_code}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 5);
                      updateContact(idx, 'zip_code', val);
                    }}
                    fullWidth
                    size="small"
                    error={Boolean(errors[`contact_zip_${idx}`])}
                    helperText={errors[`contact_zip_${idx}`]}
                    inputProps={{ maxLength: 5 }}
                  />
                </Grid>
              </Grid>
            </Box>
          ))}
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
