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
  Chip,
  Tooltip,
  InputAdornment,
  Tabs,
  Tab
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

// Multi-plan types: support multiple carrier/limit/premium/renewal per type
const MULTI_PLAN_TYPES = ['umbrella', 'professional_eo', 'cyber', 'crime'];

const MULTI_PLAN_LABELS = {
  umbrella: 'Umbrella Liability',
  professional_eo: 'Professional or E&O',
  cyber: 'Cyber Liability',
  crime: 'Crime or Fidelity Bond'
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
 * CommercialModal - Form for creating/editing commercial insurance records
 */
const CommercialModal = ({ open, onClose, commercial, onSave, clients = [], initialCoverageTab = null }) => {
  // Initialize form with all fields
  const getInitialFormData = () => ({
    tax_id: '',
    parent_client: '',
    // Single-plan types (flat fields)
    general_liability_carrier: '', general_liability_occ_limit: '', general_liability_agg_limit: '', general_liability_premium: '', general_liability_renewal_date: '', general_liability_remarks: '', general_liability_outstanding_item: '',
    property_carrier: '', property_occ_limit: '', property_agg_limit: '', property_premium: '', property_renewal_date: '', property_remarks: '', property_outstanding_item: '',
    bop_carrier: '', bop_occ_limit: '', bop_agg_limit: '', bop_premium: '', bop_renewal_date: '', bop_remarks: '', bop_outstanding_item: '',
    workers_comp_carrier: '', workers_comp_occ_limit: '', workers_comp_agg_limit: '', workers_comp_premium: '', workers_comp_renewal_date: '', workers_comp_remarks: '', workers_comp_outstanding_item: '',
    auto_carrier: '', auto_occ_limit: '', auto_agg_limit: '', auto_premium: '', auto_renewal_date: '', auto_remarks: '', auto_outstanding_item: '',
    epli_carrier: '', epli_occ_limit: '', epli_agg_limit: '', epli_premium: '', epli_renewal_date: '', epli_remarks: '', epli_outstanding_item: '',
    nydbl_carrier: '', nydbl_occ_limit: '', nydbl_agg_limit: '', nydbl_premium: '', nydbl_renewal_date: '', nydbl_remarks: '', nydbl_outstanding_item: '',
    surety_carrier: '', surety_occ_limit: '', surety_agg_limit: '', surety_premium: '', surety_renewal_date: '', surety_remarks: '', surety_outstanding_item: '',
    product_liability_carrier: '', product_liability_occ_limit: '', product_liability_agg_limit: '', product_liability_premium: '', product_liability_renewal_date: '', product_liability_remarks: '', product_liability_outstanding_item: '',
    flood_carrier: '', flood_occ_limit: '', flood_agg_limit: '', flood_premium: '', flood_renewal_date: '', flood_remarks: '', flood_outstanding_item: '',
    directors_officers_carrier: '', directors_officers_occ_limit: '', directors_officers_agg_limit: '', directors_officers_premium: '', directors_officers_renewal_date: '', directors_officers_remarks: '', directors_officers_outstanding_item: '',
    fiduciary_carrier: '', fiduciary_occ_limit: '', fiduciary_agg_limit: '', fiduciary_premium: '', fiduciary_renewal_date: '', fiduciary_remarks: '', fiduciary_outstanding_item: '',
    inland_marine_carrier: '', inland_marine_occ_limit: '', inland_marine_agg_limit: '', inland_marine_premium: '', inland_marine_renewal_date: '', inland_marine_remarks: '', inland_marine_outstanding_item: '',
    // Multi-plan flat fields (backward compat, set by save_commercial_plans)
    umbrella_carrier: '', umbrella_occ_limit: '', umbrella_agg_limit: '', umbrella_premium: '', umbrella_renewal_date: '',
    professional_eo_carrier: '', professional_eo_occ_limit: '', professional_eo_agg_limit: '', professional_eo_premium: '', professional_eo_renewal_date: '',
    cyber_carrier: '', cyber_occ_limit: '', cyber_agg_limit: '', cyber_premium: '', cyber_renewal_date: '',
    crime_carrier: '', crime_occ_limit: '', crime_agg_limit: '', crime_premium: '', crime_renewal_date: ''
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [errors, setErrors] = useState({});
  const [activeCoverages, setActiveCoverages] = useState([]);
  const [selectedTab, setSelectedTab] = useState(0);

  // Multi-plan state: { umbrella: [{carrier, occ_limit, agg_limit, premium, renewal_date, remarks, outstanding_item}, ...], ... }
  const [plans, setPlans] = useState({
    umbrella: [],
    professional_eo: [],
    cyber: [],
    crime: []
  });

  // Insurance product types configuration
  const insuranceProducts = [
    { name: 'Commercial General Liability', tabLabel: 'GL', prefix: 'general_liability' },
    { name: 'Commercial Property', tabLabel: 'Property', prefix: 'property' },
    { name: 'Business Owners Policy (BOP)', tabLabel: 'BOP', prefix: 'bop' },
    { name: 'Umbrella Liability', tabLabel: 'Umbrella', prefix: 'umbrella', multiPlan: true },
    { name: 'Workers Compensation', tabLabel: 'WC', prefix: 'workers_comp' },
    { name: 'Professional or E&O', tabLabel: 'E&O', prefix: 'professional_eo', multiPlan: true },
    { name: 'Cyber Liability', tabLabel: 'Cyber', prefix: 'cyber', multiPlan: true },
    { name: 'Commercial Auto', tabLabel: 'Auto', prefix: 'auto' },
    { name: 'EPLI (Employment Practices Liability)', tabLabel: 'EPLI', prefix: 'epli' },
    { name: 'NYDBL (NY Disability Benefit Law)', tabLabel: 'NYDBL', prefix: 'nydbl' },
    { name: 'Surety Bond', tabLabel: 'Surety', prefix: 'surety' },
    { name: 'Product Liability', tabLabel: 'Product', prefix: 'product_liability' },
    { name: 'Flood', tabLabel: 'Flood', prefix: 'flood' },
    { name: 'Crime or Fidelity Bond', tabLabel: 'Crime', prefix: 'crime', multiPlan: true },
    { name: 'Directors & Officers', tabLabel: 'D&O', prefix: 'directors_officers' },
    { name: 'Fiduciary Bond', tabLabel: 'Fiduciary', prefix: 'fiduciary' },
    { name: 'Inland Marine', tabLabel: 'Marine', prefix: 'inland_marine' }
  ];

  // Initialize form data when modal opens or commercial changes
  useEffect(() => {
    if (commercial) {
      setFormData({ ...getInitialFormData(), ...commercial });

      // Initialize multi-plan state from commercial.plans
      const newPlans = { umbrella: [], professional_eo: [], cyber: [], crime: [] };
      if (commercial.plans) {
        for (const planType of MULTI_PLAN_TYPES) {
          const typePlans = commercial.plans[planType] || [];
          if (typePlans.length > 0) {
            newPlans[planType] = typePlans.map(p => ({
              carrier: p.carrier || '',
              occ_limit: p.occ_limit || '',
              agg_limit: p.agg_limit || '',
              premium: p.premium || '',
              renewal_date: p.renewal_date || '',
              remarks: p.remarks || '',
              outstanding_item: p.outstanding_item || ''
            }));
          }
        }
      }

      // Fallback: if no plans in API response, populate from flat fields
      if (!commercial.plans || Object.values(commercial.plans).every(arr => arr.length === 0)) {
        for (const planType of MULTI_PLAN_TYPES) {
          if (commercial[`${planType}_carrier`] || commercial[`${planType}_renewal_date`] ||
              commercial[`${planType}_occ_limit`] || commercial[`${planType}_agg_limit`] || commercial[`${planType}_premium`]) {
            newPlans[planType] = [{
              carrier: commercial[`${planType}_carrier`] || '',
              occ_limit: commercial[`${planType}_occ_limit`] || '',
              agg_limit: commercial[`${planType}_agg_limit`] || '',
              premium: commercial[`${planType}_premium`] || '',
              renewal_date: commercial[`${planType}_renewal_date`] || '',
              remarks: '',
              outstanding_item: ''
            }];
          }
        }
      }

      setPlans(newPlans);

      // Determine which coverages have data
      const active = [];
      insuranceProducts.forEach(p => {
        if (p.multiPlan) {
          if (newPlans[p.prefix] && newPlans[p.prefix].length > 0) {
            active.push(p.prefix);
          }
        } else {
          if (commercial[`${p.prefix}_carrier`] || commercial[`${p.prefix}_limit`] ||
              commercial[`${p.prefix}_premium`] || commercial[`${p.prefix}_renewal_date`]) {
            active.push(p.prefix);
          }
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
      setPlans({ umbrella: [], professional_eo: [], cyber: [], crime: [] });
      setActiveCoverages([]);
      setSelectedTab(0);
    }
    setErrors({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commercial, open, initialCoverageTab]);

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

  // Multi-plan helpers
  const addPlan = (planType) => {
    setPlans(prev => ({
      ...prev,
      [planType]: [...prev[planType], { carrier: '', occ_limit: '', agg_limit: '', premium: '', renewal_date: '', remarks: '', outstanding_item: '' }]
    }));
  };

  const removePlan = (planType, index) => {
    setPlans(prev => ({
      ...prev,
      [planType]: prev[planType].filter((_, i) => i !== index)
    }));
  };

  const updatePlan = (planType, index, field, value) => {
    setPlans(prev => ({
      ...prev,
      [planType]: prev[planType].map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      )
    }));
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
      // Filter out empty plans
      const cleanPlans = {};
      for (const planType of MULTI_PLAN_TYPES) {
        cleanPlans[planType] = plans[planType].filter(p => p.carrier || p.occ_limit || p.agg_limit || p.premium || p.renewal_date);
      }

      onSave({
        ...commercial,
        ...formData,
        plans: cleanPlans
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
      const newActive = [...activeCoverages, prefix];
      setActiveCoverages(newActive);
      // For multi-plan types, add one empty plan
      if (MULTI_PLAN_TYPES.includes(prefix)) {
        addPlan(prefix);
      }
      // Switch to the newly added tab
      setSelectedTab(newActive.length - 1);
    }
  };

  // Remove a coverage type and clear its data
  const handleRemoveCoverage = (prefix) => {
    const idx = activeCoverages.indexOf(prefix);
    const newActive = activeCoverages.filter(p => p !== prefix);
    setActiveCoverages(newActive);
    if (MULTI_PLAN_TYPES.includes(prefix)) {
      setPlans(prev => ({ ...prev, [prefix]: [] }));
    } else {
      setFormData({
        ...formData,
        [`${prefix}_carrier`]: '',
        [`${prefix}_occ_limit`]: '',
        [`${prefix}_agg_limit`]: '',
        [`${prefix}_premium`]: '',
        [`${prefix}_renewal_date`]: '',
        [`${prefix}_remarks`]: '',
        [`${prefix}_outstanding_item`]: ''
      });
    }
    // Adjust selected tab
    if (selectedTab >= newActive.length) {
      setSelectedTab(Math.max(0, newActive.length - 1));
    } else if (idx < selectedTab) {
      setSelectedTab(selectedTab - 1);
    }
  };

  // Render multi-plan rows for a given type
  const renderMultiPlanRows = (planType) => {
    const typePlans = plans[planType];
    const label = MULTI_PLAN_LABELS[planType];

    return (
      <Box>
        {typePlans.map((plan, idx) => (
          <Box key={idx} sx={{ mb: 1.5, p: 1.5, backgroundColor: '#fafafa', borderRadius: 1, border: '1px solid #e0e0e0' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, color: '#666' }}>
                {label} Plan {idx + 1}
              </Typography>
              <Tooltip title={`Remove ${label} Plan ${idx + 1}`}>
                <IconButton size="small" color="error" onClick={() => removePlan(planType, idx)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Carrier"
                  value={plan.carrier || ''}
                  onChange={(e) => updatePlan(planType, idx, 'carrier', e.target.value)}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Occ Limit"
                  type="number"
                  value={plan.occ_limit || ''}
                  onChange={(e) => updatePlan(planType, idx, 'occ_limit', e.target.value)}
                  fullWidth
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    endAdornment: <InputAdornment position="end">M</InputAdornment>,
                    inputProps: { min: 0, step: 0.01 }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Agg Limit"
                  type="number"
                  value={plan.agg_limit || ''}
                  onChange={(e) => updatePlan(planType, idx, 'agg_limit', e.target.value)}
                  fullWidth
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    endAdornment: <InputAdornment position="end">M</InputAdornment>,
                    inputProps: { min: 0, step: 0.01 }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Premium ($)"
                  type="number"
                  value={plan.premium || ''}
                  onChange={(e) => updatePlan(planType, idx, 'premium', e.target.value)}
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
                  value={plan.renewal_date ? plan.renewal_date.split('T')[0] : ''}
                  onChange={(e) => updatePlan(planType, idx, 'renewal_date', e.target.value)}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  helperText={isPastDate(plan.renewal_date?.split('T')[0]) ? 'Date is in the past — no reminder will be generated' : ''}
                  slotProps={{ formHelperText: isPastDate(plan.renewal_date?.split('T')[0]) ? { sx: { color: '#ed6c02' } } : undefined }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Outstanding Item"
                  select
                  value={plan.outstanding_item || ''}
                  onChange={(e) => updatePlan(planType, idx, 'outstanding_item', e.target.value)}
                  size="small"
                  sx={{ minWidth: 180 }}
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="Premium Due">Premium Due</MenuItem>
                  <MenuItem value="In Audit">In Audit</MenuItem>
                  <MenuItem value="Cancel Due">Cancel Due</MenuItem>
                  <MenuItem value="Add Line">Add Line</MenuItem>
                  <MenuItem value="Complete">Complete</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Remarks"
                  value={plan.remarks || ''}
                  onChange={(e) => updatePlan(planType, idx, 'remarks', e.target.value)}
                  fullWidth
                  size="small"
                />
              </Grid>
            </Grid>
          </Box>
        ))}
        <Button
          size="small"
          startIcon={<AddCircleOutlineIcon />}
          onClick={() => addPlan(planType)}
          sx={{ mt: 1 }}
        >
          Add {label} Plan
        </Button>
      </Box>
    );
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
          {/* Client Information */}
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
              disabled={isEditMode}
              fullWidth
              sx={{ mb: 2 }}
            />
            <Autocomplete
              freeSolo
              options={clients.map(c => c.client_name).filter(Boolean)}
              value={formData.parent_client || ''}
              onChange={(e, newValue) => setFormData({ ...formData, parent_client: newValue || '' })}
              onInputChange={(e, newValue) => setFormData({ ...formData, parent_client: newValue || '' })}
              renderInput={(params) => (
                <TextField {...params} label="Parent Client" size="small" fullWidth />
              )}
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
                    const isMultiPlan = product.multiPlan;
                    const planCount = isMultiPlan && plans[prefix] ? plans[prefix].length : 0;
                    return (
                      <Tab
                        key={prefix}
                        sx={{ minWidth: 0, minHeight: 36, px: 1.5, py: 0.5, fontSize: '0.8rem' }}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <span>{product.tabLabel}</span>
                            {isMultiPlan && planCount > 1 && (
                              <Chip
                                label={planCount}
                                size="small"
                                color="primary"
                                sx={{ height: 16, fontSize: '0.6rem', minWidth: 18 }}
                              />
                            )}
                          </Box>
                        }
                      />
                    );
                  })}
                </Tabs>
              </Box>

              {activeCoverages.map((prefix, idx) => {
                if (idx !== selectedTab) return null;
                const product = insuranceProducts.find(p => p.prefix === prefix);
                if (!product) return null;
                const isMultiPlan = product.multiPlan;

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
                    {isMultiPlan ? (
                      renderMultiPlanRows(prefix)
                    ) : (
                      <Box sx={{ p: 1.5, backgroundColor: '#fafafa', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: '#666', mb: 1 }}>
                          {product.name} Plan 1
                        </Typography>
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
                          <Grid item xs={12} sm={3}>
                            <TextField
                              label="Occ Limit"
                              type="number"
                              value={formData[`${product.prefix}_occ_limit`] || ''}
                              onChange={handleChange(`${product.prefix}_occ_limit`)}
                              fullWidth
                              size="small"
                              InputProps={{
                                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                endAdornment: <InputAdornment position="end">M</InputAdornment>,
                                inputProps: { min: 0, step: 0.01 }
                              }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <TextField
                              label="Agg Limit"
                              type="number"
                              value={formData[`${product.prefix}_agg_limit`] || ''}
                              onChange={handleChange(`${product.prefix}_agg_limit`)}
                              fullWidth
                              size="small"
                              InputProps={{
                                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                endAdornment: <InputAdornment position="end">M</InputAdornment>,
                                inputProps: { min: 0, step: 0.01 }
                              }}
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
                              helperText={isPastDate(formData[`${product.prefix}_renewal_date`]?.split('T')[0]) ? 'Date is in the past — no reminder will be generated' : ''}
                              slotProps={{ formHelperText: isPastDate(formData[`${product.prefix}_renewal_date`]?.split('T')[0]) ? { sx: { color: '#ed6c02' } } : undefined }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="Outstanding Item"
                              select
                              value={formData[`${prefix}_outstanding_item`] || ''}
                              onChange={handleChange(`${prefix}_outstanding_item`)}
                              size="small"
                              sx={{ minWidth: 180 }}
                            >
                              <MenuItem value="">None</MenuItem>
                              <MenuItem value="Premium Due">Premium Due</MenuItem>
                              <MenuItem value="In Audit">In Audit</MenuItem>
                              <MenuItem value="Cancel Due">Cancel Due</MenuItem>
                              <MenuItem value="Add Line">Add Line</MenuItem>
                              <MenuItem value="Complete">Complete</MenuItem>
                            </TextField>
                          </Grid>
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
                        </Grid>
                      </Box>
                    )}
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

export default CommercialModal;
