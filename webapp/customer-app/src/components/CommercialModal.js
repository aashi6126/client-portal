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
  Paper,
  Chip,
  Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FlagIcon from '@mui/icons-material/Flag';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';

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
const CommercialModal = ({ open, onClose, commercial, onSave, clients = [] }) => {
  // Initialize form with all fields
  const getInitialFormData = () => ({
    tax_id: '',
    remarks: '',
    status: 'Active',
    outstanding_item: '',
    // Single-plan types (flat fields)
    general_liability_carrier: '', general_liability_occ_limit: '', general_liability_agg_limit: '', general_liability_premium: '', general_liability_renewal_date: '', general_liability_flag: false,
    property_carrier: '', property_occ_limit: '', property_agg_limit: '', property_premium: '', property_renewal_date: '', property_flag: false,
    bop_carrier: '', bop_occ_limit: '', bop_agg_limit: '', bop_premium: '', bop_renewal_date: '', bop_flag: false,
    workers_comp_carrier: '', workers_comp_occ_limit: '', workers_comp_agg_limit: '', workers_comp_premium: '', workers_comp_renewal_date: '', workers_comp_flag: false,
    auto_carrier: '', auto_occ_limit: '', auto_agg_limit: '', auto_premium: '', auto_renewal_date: '', auto_flag: false,
    epli_carrier: '', epli_occ_limit: '', epli_agg_limit: '', epli_premium: '', epli_renewal_date: '', epli_flag: false,
    nydbl_carrier: '', nydbl_occ_limit: '', nydbl_agg_limit: '', nydbl_premium: '', nydbl_renewal_date: '', nydbl_flag: false,
    surety_carrier: '', surety_occ_limit: '', surety_agg_limit: '', surety_premium: '', surety_renewal_date: '', surety_flag: false,
    product_liability_carrier: '', product_liability_occ_limit: '', product_liability_agg_limit: '', product_liability_premium: '', product_liability_renewal_date: '', product_liability_flag: false,
    flood_carrier: '', flood_occ_limit: '', flood_agg_limit: '', flood_premium: '', flood_renewal_date: '', flood_flag: false,
    directors_officers_carrier: '', directors_officers_occ_limit: '', directors_officers_agg_limit: '', directors_officers_premium: '', directors_officers_renewal_date: '', directors_officers_flag: false,
    fiduciary_carrier: '', fiduciary_occ_limit: '', fiduciary_agg_limit: '', fiduciary_premium: '', fiduciary_renewal_date: '', fiduciary_flag: false,
    inland_marine_carrier: '', inland_marine_occ_limit: '', inland_marine_agg_limit: '', inland_marine_premium: '', inland_marine_renewal_date: '', inland_marine_flag: false,
    // Multi-plan flat fields (backward compat, set by save_commercial_plans)
    umbrella_carrier: '', umbrella_occ_limit: '', umbrella_agg_limit: '', umbrella_premium: '', umbrella_renewal_date: '',
    professional_eo_carrier: '', professional_eo_occ_limit: '', professional_eo_agg_limit: '', professional_eo_premium: '', professional_eo_renewal_date: '',
    cyber_carrier: '', cyber_occ_limit: '', cyber_agg_limit: '', cyber_premium: '', cyber_renewal_date: '',
    crime_carrier: '', crime_occ_limit: '', crime_agg_limit: '', crime_premium: '', crime_renewal_date: ''
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [errors, setErrors] = useState({});
  const [activeCoverages, setActiveCoverages] = useState([]);

  // Multi-plan state: { umbrella: [{carrier, occ_limit, agg_limit, premium, renewal_date, flag}, ...], ... }
  const [plans, setPlans] = useState({
    umbrella: [],
    professional_eo: [],
    cyber: [],
    crime: []
  });

  // Insurance product types configuration
  const insuranceProducts = [
    { name: 'Commercial General Liability', prefix: 'general_liability' },
    { name: 'Commercial Property', prefix: 'property' },
    { name: 'Business Owners Policy (BOP)', prefix: 'bop' },
    { name: 'Umbrella Liability', prefix: 'umbrella', multiPlan: true },
    { name: 'Workers Compensation', prefix: 'workers_comp' },
    { name: 'Professional or E&O', prefix: 'professional_eo', multiPlan: true },
    { name: 'Cyber Liability', prefix: 'cyber', multiPlan: true },
    { name: 'Commercial Auto', prefix: 'auto' },
    { name: 'EPLI (Employment Practices Liability)', prefix: 'epli' },
    { name: 'NYDBL (NY Disability Benefit Law)', prefix: 'nydbl' },
    { name: 'Surety Bond', prefix: 'surety' },
    { name: 'Product Liability', prefix: 'product_liability' },
    { name: 'Flood', prefix: 'flood' },
    { name: 'Crime or Fidelity Bond', prefix: 'crime', multiPlan: true },
    { name: 'Directors & Officers', prefix: 'directors_officers' },
    { name: 'Fiduciary Bond', prefix: 'fiduciary' },
    { name: 'Inland Marine', prefix: 'inland_marine' }
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
              flag: p.flag || false
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
              flag: false
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
    } else {
      setFormData(getInitialFormData());
      setPlans({ umbrella: [], professional_eo: [], cyber: [], crime: [] });
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

  // Multi-plan helpers
  const addPlan = (planType) => {
    setPlans(prev => ({
      ...prev,
      [planType]: [...prev[planType], { carrier: '', occ_limit: '', agg_limit: '', premium: '', renewal_date: '', flag: false }]
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
      setActiveCoverages([...activeCoverages, prefix]);
      // For multi-plan types, add one empty plan
      if (MULTI_PLAN_TYPES.includes(prefix)) {
        addPlan(prefix);
      }
    }
  };

  // Remove a coverage type and clear its data
  const handleRemoveCoverage = (prefix) => {
    setActiveCoverages(activeCoverages.filter(p => p !== prefix));
    if (MULTI_PLAN_TYPES.includes(prefix)) {
      setPlans(prev => ({ ...prev, [prefix]: [] }));
    } else {
      setFormData({
        ...formData,
        [`${prefix}_carrier`]: '',
        [`${prefix}_limit`]: '',
        [`${prefix}_premium`]: '',
        [`${prefix}_renewal_date`]: '',
        [`${prefix}_flag`]: false
      });
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
                Plan {idx + 1}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Tooltip title={plan.flag ? 'Remove flag' : 'Flag this plan'}>
                  <IconButton
                    size="small"
                    onClick={() => updatePlan(planType, idx, 'flag', !plan.flag)}
                    sx={{ color: plan.flag ? '#d32f2f' : '#999' }}
                  >
                    {plan.flag ? <FlagIcon fontSize="small" /> : <FlagOutlinedIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
                <Tooltip title={`Remove Plan ${idx + 1}`}>
                  <IconButton size="small" color="error" onClick={() => removePlan(planType, idx)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
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
                  value={plan.occ_limit || ''}
                  onChange={(e) => updatePlan(planType, idx, 'occ_limit', e.target.value)}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Agg Limit"
                  value={plan.agg_limit || ''}
                  onChange={(e) => updatePlan(planType, idx, 'agg_limit', e.target.value)}
                  fullWidth
                  size="small"
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
              const isMultiPlan = product.multiPlan;

              return (
                <Accordion key={product.prefix} defaultExpanded={true}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontWeight: 500 }}>{product.name}</Typography>
                        {isMultiPlan && plans[prefix] && plans[prefix].length > 1 && (
                          <Chip
                            label={`${plans[prefix].length} Plans`}
                            size="small"
                            color="primary"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                        {/* Show flag indicator if any plan/coverage is flagged */}
                        {isMultiPlan ? (
                          plans[prefix] && plans[prefix].some(p => p.flag) && (
                            <FlagIcon fontSize="small" sx={{ color: '#d32f2f' }} />
                          )
                        ) : (
                          formData[`${prefix}_flag`] && (
                            <FlagIcon fontSize="small" sx={{ color: '#d32f2f' }} />
                          )
                        )}
                      </Box>
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
                    {isMultiPlan ? (
                      renderMultiPlanRows(prefix)
                    ) : (
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
                            value={formData[`${product.prefix}_occ_limit`] || ''}
                            onChange={handleChange(`${product.prefix}_occ_limit`)}
                            fullWidth
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <TextField
                            label="Agg Limit"
                            value={formData[`${product.prefix}_agg_limit`] || ''}
                            onChange={handleChange(`${product.prefix}_agg_limit`)}
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
                            helperText={isPastDate(formData[`${product.prefix}_renewal_date`]?.split('T')[0]) ? 'Date is in the past — no reminder will be generated' : ''}
                            slotProps={{ formHelperText: isPastDate(formData[`${product.prefix}_renewal_date`]?.split('T')[0]) ? { sx: { color: '#ed6c02' } } : undefined }}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Tooltip title={formData[`${prefix}_flag`] ? 'Remove flag' : 'Flag this coverage'}>
                            <IconButton
                              size="small"
                              onClick={() => setFormData({ ...formData, [`${prefix}_flag`]: !formData[`${prefix}_flag`] })}
                              sx={{ color: formData[`${prefix}_flag`] ? '#d32f2f' : '#999' }}
                            >
                              {formData[`${prefix}_flag`] ? <FlagIcon /> : <FlagOutlinedIcon />}
                            </IconButton>
                          </Tooltip>
                        </Grid>
                      </Grid>
                    )}
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
