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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  MenuItem,
  IconButton,
  Paper
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

/**
 * CommercialModal - Form for creating/editing commercial insurance records
 */
const CommercialModal = ({ open, onClose, commercial, onSave, clients = [] }) => {
  // Initialize form with all fields
  const getInitialFormData = () => ({
    tax_id: '',
    remarks: '',
    status: 'Active',
    outstanding_item: '',
    // 17 Insurance Products
    general_liability_carrier: '',
    general_liability_limit: '',
    general_liability_premium: '',
    general_liability_renewal_date: '',
    property_carrier: '',
    property_limit: '',
    property_premium: '',
    property_renewal_date: '',
    bop_carrier: '',
    bop_limit: '',
    bop_premium: '',
    bop_renewal_date: '',
    umbrella_carrier: '',
    umbrella_limit: '',
    umbrella_premium: '',
    umbrella_renewal_date: '',
    workers_comp_carrier: '',
    workers_comp_limit: '',
    workers_comp_premium: '',
    workers_comp_renewal_date: '',
    professional_eo_carrier: '',
    professional_eo_limit: '',
    professional_eo_premium: '',
    professional_eo_renewal_date: '',
    cyber_carrier: '',
    cyber_limit: '',
    cyber_premium: '',
    cyber_renewal_date: '',
    auto_carrier: '',
    auto_limit: '',
    auto_premium: '',
    auto_renewal_date: '',
    epli_carrier: '',
    epli_limit: '',
    epli_premium: '',
    epli_renewal_date: '',
    nydbl_carrier: '',
    nydbl_limit: '',
    nydbl_premium: '',
    nydbl_renewal_date: '',
    surety_carrier: '',
    surety_limit: '',
    surety_premium: '',
    surety_renewal_date: '',
    product_liability_carrier: '',
    product_liability_limit: '',
    product_liability_premium: '',
    product_liability_renewal_date: '',
    flood_carrier: '',
    flood_limit: '',
    flood_premium: '',
    flood_renewal_date: '',
    crime_carrier: '',
    crime_limit: '',
    crime_premium: '',
    crime_renewal_date: '',
    directors_officers_carrier: '',
    directors_officers_limit: '',
    directors_officers_premium: '',
    directors_officers_renewal_date: '',
    fiduciary_carrier: '',
    fiduciary_limit: '',
    fiduciary_premium: '',
    fiduciary_renewal_date: '',
    inland_marine_carrier: '',
    inland_marine_limit: '',
    inland_marine_premium: '',
    inland_marine_renewal_date: ''
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [errors, setErrors] = useState({});
  const [activeCoverages, setActiveCoverages] = useState([]);

  // Insurance product types configuration
  const insuranceProducts = [
    { name: 'Commercial General Liability', prefix: 'general_liability' },
    { name: 'Commercial Property', prefix: 'property' },
    { name: 'Business Owners Policy (BOP)', prefix: 'bop' },
    { name: 'Umbrella Liability', prefix: 'umbrella' },
    { name: 'Workers Compensation', prefix: 'workers_comp' },
    { name: 'Professional or E&O', prefix: 'professional_eo' },
    { name: 'Cyber Liability', prefix: 'cyber' },
    { name: 'Commercial Auto', prefix: 'auto' },
    { name: 'EPLI (Employment Practices Liability)', prefix: 'epli' },
    { name: 'NYDBL (NY Disability Benefit Law)', prefix: 'nydbl' },
    { name: 'Surety Bond', prefix: 'surety' },
    { name: 'Product Liability', prefix: 'product_liability' },
    { name: 'Flood', prefix: 'flood' },
    { name: 'Crime or Fidelity Bond', prefix: 'crime' },
    { name: 'Directors & Officers', prefix: 'directors_officers' },
    { name: 'Fiduciary Bond', prefix: 'fiduciary' },
    { name: 'Inland Marine', prefix: 'inland_marine' }
  ];

  // Initialize form data when modal opens or commercial changes
  useEffect(() => {
    if (commercial) {
      setFormData({ ...getInitialFormData(), ...commercial });
      // Determine which coverages have data
      const active = insuranceProducts
        .filter(p =>
          commercial[`${p.prefix}_carrier`] ||
          commercial[`${p.prefix}_limit`] ||
          commercial[`${p.prefix}_premium`] ||
          commercial[`${p.prefix}_renewal_date`]
        )
        .map(p => p.prefix);
      setActiveCoverages(active);
    } else {
      setFormData(getInitialFormData());
      setActiveCoverages([]);
    }
    setErrors({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commercial, open]);

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

  // Handle client selection
  const handleClientChange = (event, newValue) => {
    if (newValue) {
      setFormData({ ...formData, tax_id: newValue.tax_id });
      if (errors.tax_id) {
        setErrors({ ...errors, tax_id: null });
      }
    }
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!formData.tax_id || formData.tax_id.trim() === '') {
      newErrors.tax_id = 'Client is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (validate()) {
      onSave({
        ...commercial,
        ...formData
      });
    }
  };

  const isEditMode = Boolean(commercial && commercial.id);
  const selectedClient = clients.find(c => c.tax_id === formData.tax_id);

  // Get available coverages (not yet added)
  const availableCoverages = insuranceProducts.filter(
    p => !activeCoverages.includes(p.prefix)
  );

  // Add a new coverage type
  const handleAddCoverage = (prefix) => {
    if (prefix && !activeCoverages.includes(prefix)) {
      setActiveCoverages([...activeCoverages, prefix]);
    }
  };

  // Remove a coverage type and clear its data
  const handleRemoveCoverage = (prefix) => {
    setActiveCoverages(activeCoverages.filter(p => p !== prefix));
    setFormData({
      ...formData,
      [`${prefix}_carrier`]: '',
      [`${prefix}_limit`]: '',
      [`${prefix}_premium`]: '',
      [`${prefix}_renewal_date`]: ''
    });
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
        {isEditMode ? 'Edit Commercial Insurance' : 'Add New Commercial Insurance'}
      </DialogTitle>

      <DialogContent dividers sx={{ overflow: 'auto' }}>
        <Box sx={{ pt: 1 }}>
          {/* Client Selector */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
              Client Information
            </Typography>
            <Autocomplete
              options={clients}
              getOptionLabel={(option) => `${option.client_name} (${option.tax_id})`}
              value={selectedClient || null}
              onChange={handleClientChange}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Client *"
                  error={Boolean(errors.tax_id)}
                  helperText={errors.tax_id}
                  size="small"
                />
              )}
              disabled={isEditMode} // Cannot change client after creation
              fullWidth
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Core Fields */}
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            General Information
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Status"
                select
                value={formData.status || 'Active'}
                onChange={handleChange('status')}
                fullWidth
                size="small"
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Outstanding Item"
                value={formData.outstanding_item || ''}
                onChange={handleChange('outstanding_item')}
                fullWidth
                size="small"
                select
                InputLabelProps={{ shrink: true }}
              >
                <MenuItem value="">None</MenuItem>
                <MenuItem value="Pending Premium">Pending Premium</MenuItem>
                <MenuItem value="In Audit">In Audit</MenuItem>
                <MenuItem value="Pending Cancellation">Pending Cancellation</MenuItem>
                <MenuItem value="Complete">Complete</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Remarks"
                value={formData.remarks || ''}
                onChange={handleChange('remarks')}
                fullWidth
                size="small"
                multiline
                rows={2}
              />
            </Grid>
          </Grid>

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
            activeCoverages.map((prefix) => {
              const product = insuranceProducts.find(p => p.prefix === prefix);
              if (!product) return null;
              return (
                <Accordion key={product.prefix} defaultExpanded={true}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 1 }}>
                      <Typography sx={{ fontWeight: 500 }}>{product.name}</Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveCoverage(prefix);
                        }}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Carrier"
                          value={formData[`${product.prefix}_carrier`] || ''}
                          onChange={handleChange(`${product.prefix}_carrier`)}
                          fullWidth
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Limit"
                          value={formData[`${product.prefix}_limit`] || ''}
                          onChange={handleChange(`${product.prefix}_limit`)}
                          fullWidth
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Premium ($)"
                          type="number"
                          value={formData[`${product.prefix}_premium`] || ''}
                          onChange={handleChange(`${product.prefix}_premium`)}
                          fullWidth
                          size="small"
                          InputProps={{
                            inputProps: { min: 0, step: 0.01 }
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Renewal Date"
                          type="date"
                          value={formData[`${product.prefix}_renewal_date`] ? formData[`${product.prefix}_renewal_date`].split('T')[0] : ''}
                          onChange={handleChange(`${product.prefix}_renewal_date`)}
                          fullWidth
                          size="small"
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              );
            })
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

export default CommercialModal;
