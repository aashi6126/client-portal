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
  Autocomplete,
  Typography,
  Divider,
  MenuItem,
  IconButton,
  Paper,
  Tooltip,
  InputAdornment,
  Tabs,
  Tab
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

// Color mapping for outstanding item values
const OUTSTANDING_ITEM_COLORS = {
  'Premium Due': '#ed6c02',
  'In Audit': '#0288d1',
  'Cancel Due': '#d32f2f',
  'Add Line': '#7b1fa2',
  'Complete': '#2e7d32',
};

// Check if a date string is in the past
const isPastDate = (dateStr) => {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr + 'T00:00:00');
  return date < today;
};

/**
 * PersonalModal - Form for creating/editing personal insurance records
 */
const PersonalModal = ({ open, onClose, personal, onSave, individuals = [], initialCoverageTab = null }) => {
  // Insurance product types configuration
  const insuranceProducts = [
    { name: 'Personal Auto', tabLabel: 'Auto', prefix: 'personal_auto' },
    { name: 'Homeowners', tabLabel: 'Home', prefix: 'homeowners' },
    { name: 'Personal Umbrella', tabLabel: 'Umbrella', prefix: 'personal_umbrella' },
    { name: 'Event Insurance', tabLabel: 'Event', prefix: 'event' },
    { name: 'Visitors Medical', tabLabel: 'Visitors', prefix: 'visitors_medical' }
  ];

  // Initialize form with all fields
  const getInitialFormData = () => ({
    individual_id: '',
    // Personal Auto
    personal_auto_carrier: '', personal_auto_bi_occ_limit: '', personal_auto_bi_agg_limit: '', personal_auto_pd_limit: '', personal_auto_renewal_date: '', personal_auto_premium: '', personal_auto_outstanding_item: '', personal_auto_remarks: '',
    // Homeowners
    homeowners_carrier: '', homeowners_dwelling_limit: '', homeowners_liability_limit: '', homeowners_renewal_date: '', homeowners_premium: '', homeowners_outstanding_item: '', homeowners_remarks: '',
    // Personal Umbrella
    personal_umbrella_carrier: '', personal_umbrella_liability_limit: '', personal_umbrella_deductible: '', personal_umbrella_renewal_date: '', personal_umbrella_premium: '', personal_umbrella_outstanding_item: '', personal_umbrella_remarks: '',
    // Event Insurance
    event_carrier: '', event_type: '', event_location: '', event_start_date: '', event_end_date: '', event_entry_fee: '', event_audience_count: '', event_premium: '', event_outstanding_item: '', event_remarks: '',
    // Visitors Medical
    visitors_medical_carrier: '', visitors_medical_start_date: '', visitors_medical_end_date: '', visitors_medical_destination_country: '', visitors_medical_premium: '', visitors_medical_outstanding_item: '', visitors_medical_remarks: ''
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [errors, setErrors] = useState({});
  const [activeCoverages, setActiveCoverages] = useState([]);
  const [selectedTab, setSelectedTab] = useState(0);

  // Initialize form data when modal opens or personal changes
  useEffect(() => {
    if (personal) {
      setFormData({ ...getInitialFormData(), ...personal });

      // Determine which coverages have data
      const active = [];
      insuranceProducts.forEach(p => {
        const prefix = p.prefix;
        const keys = Object.keys(getInitialFormData()).filter(k => k.startsWith(prefix + '_'));
        const hasData = keys.some(k => personal[k]);
        if (hasData) {
          active.push(prefix);
        }
      });
      setActiveCoverages(active);
      // If an initial coverage tab was requested, jump to it
      if (initialCoverageTab) {
        const tabIdx = active.indexOf(initialCoverageTab);
        setSelectedTab(tabIdx >= 0 ? tabIdx : 0);
      } else {
        setSelectedTab(0);
      }
    } else {
      setFormData(getInitialFormData());
      setActiveCoverages([]);
      setSelectedTab(0);
    }
    setErrors({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personal, open, initialCoverageTab]);

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

  // Handle individual selection
  const handleIndividualChange = (event, newValue) => {
    if (newValue) {
      setFormData({ ...formData, individual_id: newValue.individual_id });
      if (errors.individual_id) {
        setErrors({ ...errors, individual_id: null });
      }
    }
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!formData.individual_id || formData.individual_id.trim() === '') {
      newErrors.individual_id = 'Individual is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (validate()) {
      onSave({
        ...personal,
        ...formData
      });
    }
  };

  const isEditMode = Boolean(personal && personal.id);
  const selectedIndividual = individuals.find(i => i.individual_id === formData.individual_id);

  // Get available coverages (not yet added)
  const availableCoverages = insuranceProducts.filter(
    p => !activeCoverages.includes(p.prefix)
  );

  // Add a new coverage type
  const handleAddCoverage = (prefix) => {
    if (prefix && !activeCoverages.includes(prefix)) {
      const newActive = [...activeCoverages, prefix];
      setActiveCoverages(newActive);
      // Switch to the newly added tab
      setSelectedTab(newActive.length - 1);
    }
  };

  // Remove a coverage type and clear its data
  const handleRemoveCoverage = (prefix) => {
    const idx = activeCoverages.indexOf(prefix);
    const newActive = activeCoverages.filter(p => p !== prefix);
    setActiveCoverages(newActive);

    // Clear all fields for this prefix
    const clearedFields = {};
    Object.keys(formData).forEach(key => {
      if (key.startsWith(prefix + '_')) {
        clearedFields[key] = '';
      }
    });
    setFormData({ ...formData, ...clearedFields });

    // Adjust selected tab
    if (selectedTab >= newActive.length) {
      setSelectedTab(Math.max(0, newActive.length - 1));
    } else if (idx < selectedTab) {
      setSelectedTab(selectedTab - 1);
    }
  };

  // Render the Outstanding Item dropdown
  const renderOutstandingItem = (prefix) => (
    <Grid item xs={12} sm={6}>
      <TextField
        label="Outstanding Item"
        select
        value={formData[`${prefix}_outstanding_item`] || ''}
        onChange={handleChange(`${prefix}_outstanding_item`)}
        size="small"
        sx={{
          minWidth: 180,
          '& .MuiSelect-select': {
            color: OUTSTANDING_ITEM_COLORS[formData[`${prefix}_outstanding_item`]] || 'inherit',
            fontWeight: formData[`${prefix}_outstanding_item`] ? 600 : 400
          }
        }}
      >
        <MenuItem value="">None</MenuItem>
        <MenuItem value="Premium Due" sx={{ color: OUTSTANDING_ITEM_COLORS['Premium Due'], fontWeight: 600 }}>Premium Due</MenuItem>
        <MenuItem value="In Audit" sx={{ color: OUTSTANDING_ITEM_COLORS['In Audit'], fontWeight: 600 }}>In Audit</MenuItem>
        <MenuItem value="Cancel Due" sx={{ color: OUTSTANDING_ITEM_COLORS['Cancel Due'], fontWeight: 600 }}>Cancel Due</MenuItem>
        <MenuItem value="Add Line" sx={{ color: OUTSTANDING_ITEM_COLORS['Add Line'], fontWeight: 600 }}>Add Line</MenuItem>
        <MenuItem value="Complete" sx={{ color: OUTSTANDING_ITEM_COLORS['Complete'], fontWeight: 600 }}>Complete</MenuItem>
      </TextField>
    </Grid>
  );

  // Render the Remarks field
  const renderRemarks = (prefix) => (
    <Grid item xs={12}>
      <TextField
        label="Remarks"
        value={formData[`${prefix}_remarks`] || ''}
        onChange={handleChange(`${prefix}_remarks`)}
        fullWidth
        size="small"
        multiline
        minRows={2}
      />
    </Grid>
  );

  // Render coverage-specific fields based on product prefix
  const renderCoverageFields = (product) => {
    const prefix = product.prefix;

    switch (prefix) {
      case 'personal_auto':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Carrier"
                value={formData[`${prefix}_carrier`] || ''}
                onChange={handleChange(`${prefix}_carrier`)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Bodily Injury Occ Limit"
                type="number"
                value={formData[`${prefix}_bi_occ_limit`] || ''}
                onChange={handleChange(`${prefix}_bi_occ_limit`)}
                fullWidth
                size="small"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Bodily Injury Agg Limit"
                type="number"
                value={formData[`${prefix}_bi_agg_limit`] || ''}
                onChange={handleChange(`${prefix}_bi_agg_limit`)}
                fullWidth
                size="small"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Property Damage Limit"
                type="number"
                value={formData[`${prefix}_pd_limit`] || ''}
                onChange={handleChange(`${prefix}_pd_limit`)}
                fullWidth
                size="small"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Renewal Date"
                type="date"
                value={formData[`${prefix}_renewal_date`] ? formData[`${prefix}_renewal_date`].split('T')[0] : ''}
                onChange={handleChange(`${prefix}_renewal_date`)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                helperText={isPastDate(formData[`${prefix}_renewal_date`]?.split('T')[0]) ? 'Date is in the past — no reminder will be generated' : ''}
                slotProps={{ formHelperText: isPastDate(formData[`${prefix}_renewal_date`]?.split('T')[0]) ? { sx: { color: '#ed6c02' } } : undefined }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Premium"
                type="number"
                value={formData[`${prefix}_premium`] || ''}
                onChange={handleChange(`${prefix}_premium`)}
                fullWidth
                size="small"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
            {renderOutstandingItem(prefix)}
            {renderRemarks(prefix)}
          </Grid>
        );

      case 'homeowners':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Carrier"
                value={formData[`${prefix}_carrier`] || ''}
                onChange={handleChange(`${prefix}_carrier`)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Dwelling Limit"
                type="number"
                value={formData[`${prefix}_dwelling_limit`] || ''}
                onChange={handleChange(`${prefix}_dwelling_limit`)}
                fullWidth
                size="small"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Liability Limit"
                type="number"
                value={formData[`${prefix}_liability_limit`] || ''}
                onChange={handleChange(`${prefix}_liability_limit`)}
                fullWidth
                size="small"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Renewal Date"
                type="date"
                value={formData[`${prefix}_renewal_date`] ? formData[`${prefix}_renewal_date`].split('T')[0] : ''}
                onChange={handleChange(`${prefix}_renewal_date`)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                helperText={isPastDate(formData[`${prefix}_renewal_date`]?.split('T')[0]) ? 'Date is in the past — no reminder will be generated' : ''}
                slotProps={{ formHelperText: isPastDate(formData[`${prefix}_renewal_date`]?.split('T')[0]) ? { sx: { color: '#ed6c02' } } : undefined }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Premium"
                type="number"
                value={formData[`${prefix}_premium`] || ''}
                onChange={handleChange(`${prefix}_premium`)}
                fullWidth
                size="small"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
            {renderOutstandingItem(prefix)}
            {renderRemarks(prefix)}
          </Grid>
        );

      case 'personal_umbrella':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Carrier"
                value={formData[`${prefix}_carrier`] || ''}
                onChange={handleChange(`${prefix}_carrier`)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Liability Limit"
                type="number"
                value={formData[`${prefix}_liability_limit`] || ''}
                onChange={handleChange(`${prefix}_liability_limit`)}
                fullWidth
                size="small"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Deductible"
                type="number"
                value={formData[`${prefix}_deductible`] || ''}
                onChange={handleChange(`${prefix}_deductible`)}
                fullWidth
                size="small"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Renewal Date"
                type="date"
                value={formData[`${prefix}_renewal_date`] ? formData[`${prefix}_renewal_date`].split('T')[0] : ''}
                onChange={handleChange(`${prefix}_renewal_date`)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                helperText={isPastDate(formData[`${prefix}_renewal_date`]?.split('T')[0]) ? 'Date is in the past — no reminder will be generated' : ''}
                slotProps={{ formHelperText: isPastDate(formData[`${prefix}_renewal_date`]?.split('T')[0]) ? { sx: { color: '#ed6c02' } } : undefined }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Premium"
                type="number"
                value={formData[`${prefix}_premium`] || ''}
                onChange={handleChange(`${prefix}_premium`)}
                fullWidth
                size="small"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
            {renderOutstandingItem(prefix)}
            {renderRemarks(prefix)}
          </Grid>
        );

      case 'event':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Carrier"
                value={formData[`${prefix}_carrier`] || ''}
                onChange={handleChange(`${prefix}_carrier`)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Type of Event"
                value={formData[`${prefix}_type`] || ''}
                onChange={handleChange(`${prefix}_type`)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Event Location"
                value={formData[`${prefix}_location`] || ''}
                onChange={handleChange(`${prefix}_location`)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Event Start Date"
                type="date"
                value={formData[`${prefix}_start_date`] ? formData[`${prefix}_start_date`].split('T')[0] : ''}
                onChange={handleChange(`${prefix}_start_date`)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                helperText={isPastDate(formData[`${prefix}_start_date`]?.split('T')[0]) ? 'Date is in the past' : ''}
                slotProps={{ formHelperText: isPastDate(formData[`${prefix}_start_date`]?.split('T')[0]) ? { sx: { color: '#ed6c02' } } : undefined }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Event End Date"
                type="date"
                value={formData[`${prefix}_end_date`] ? formData[`${prefix}_end_date`].split('T')[0] : ''}
                onChange={handleChange(`${prefix}_end_date`)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                helperText={isPastDate(formData[`${prefix}_end_date`]?.split('T')[0]) ? 'Date is in the past' : ''}
                slotProps={{ formHelperText: isPastDate(formData[`${prefix}_end_date`]?.split('T')[0]) ? { sx: { color: '#ed6c02' } } : undefined }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                label="Entry Fee"
                type="number"
                value={formData[`${prefix}_entry_fee`] || ''}
                onChange={handleChange(`${prefix}_entry_fee`)}
                fullWidth
                size="small"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                label="Audience Count"
                type="number"
                value={formData[`${prefix}_audience_count`] || ''}
                onChange={handleChange(`${prefix}_audience_count`)}
                fullWidth
                size="small"
                InputProps={{
                  inputProps: { min: 0 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Premium"
                type="number"
                value={formData[`${prefix}_premium`] || ''}
                onChange={handleChange(`${prefix}_premium`)}
                fullWidth
                size="small"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
            {renderOutstandingItem(prefix)}
            {renderRemarks(prefix)}
          </Grid>
        );

      case 'visitors_medical':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Carrier"
                value={formData[`${prefix}_carrier`] || ''}
                onChange={handleChange(`${prefix}_carrier`)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Start Date"
                type="date"
                value={formData[`${prefix}_start_date`] ? formData[`${prefix}_start_date`].split('T')[0] : ''}
                onChange={handleChange(`${prefix}_start_date`)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                helperText={isPastDate(formData[`${prefix}_start_date`]?.split('T')[0]) ? 'Date is in the past' : ''}
                slotProps={{ formHelperText: isPastDate(formData[`${prefix}_start_date`]?.split('T')[0]) ? { sx: { color: '#ed6c02' } } : undefined }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="End Date"
                type="date"
                value={formData[`${prefix}_end_date`] ? formData[`${prefix}_end_date`].split('T')[0] : ''}
                onChange={handleChange(`${prefix}_end_date`)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                helperText={isPastDate(formData[`${prefix}_end_date`]?.split('T')[0]) ? 'Date is in the past' : ''}
                slotProps={{ formHelperText: isPastDate(formData[`${prefix}_end_date`]?.split('T')[0]) ? { sx: { color: '#ed6c02' } } : undefined }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Destination Country"
                value={formData[`${prefix}_destination_country`] || ''}
                onChange={handleChange(`${prefix}_destination_country`)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Premium"
                type="number"
                value={formData[`${prefix}_premium`] || ''}
                onChange={handleChange(`${prefix}_premium`)}
                fullWidth
                size="small"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
            {renderOutstandingItem(prefix)}
            {renderRemarks(prefix)}
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px', maxHeight: '90vh' }
      }}
    >
      <DialogTitle>
        {isEditMode ? 'Edit Personal Insurance' : 'Add New Personal Insurance'}
      </DialogTitle>

      <DialogContent dividers sx={{ overflow: 'auto' }}>
        <Box sx={{ pt: 1 }}>
          {/* Client Information */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
              Individual Information
            </Typography>
            <Autocomplete
              options={individuals}
              getOptionLabel={(option) => `${option.first_name || ''} ${option.last_name || ''} (${option.individual_id})`}
              value={selectedIndividual || null}
              onChange={handleIndividualChange}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Individual *"
                  error={Boolean(errors.individual_id)}
                  helperText={errors.individual_id}
                  size="small"
                />
              )}
              disabled={isEditMode}
              fullWidth
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Insurance Products */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Coverages ({activeCoverages.length})
            </Typography>
            {availableCoverages.length > 0 && (
              <TextField
                select
                size="small"
                value=""
                onChange={(e) => handleAddCoverage(e.target.value)}
                sx={{ minWidth: 200 }}
                SelectProps={{
                  displayEmpty: true
                }}
              >
                <MenuItem value="" disabled>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AddIcon fontSize="small" />
                    Add Coverage
                  </Box>
                </MenuItem>
                {availableCoverages.map((product) => (
                  <MenuItem key={product.prefix} value={product.prefix}>
                    {product.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Box>

          {activeCoverages.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
              <Typography>No coverages added yet. Use the dropdown above to add coverage types.</Typography>
            </Paper>
          ) : (
            <Box>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs
                  value={selectedTab}
                  onChange={(e, newValue) => setSelectedTab(newValue)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ minHeight: 36 }}
                >
                  {activeCoverages.map((prefix) => {
                    const product = insuranceProducts.find(p => p.prefix === prefix);
                    if (!product) return null;
                    return (
                      <Tab
                        key={prefix}
                        sx={{ minWidth: 0, minHeight: 36, px: 1.5, py: 0.5, fontSize: '0.8rem' }}
                        label={product.tabLabel}
                      />
                    );
                  })}
                </Tabs>
              </Box>

              {activeCoverages.map((prefix, idx) => {
                if (idx !== selectedTab) return null;
                const product = insuranceProducts.find(p => p.prefix === prefix);
                if (!product) return null;

                return (
                  <Box key={prefix}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                      <Tooltip title={`Remove ${product.name}`}>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveCoverage(prefix)}
                          sx={{ color: 'error.main' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Box sx={{ p: 1.5, backgroundColor: '#fafafa', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#666', mb: 1 }}>
                        {product.name}
                      </Typography>
                      {renderCoverageFields(product)}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
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

export default PersonalModal;
