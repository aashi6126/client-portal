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
  Chip,
  Paper,
  MenuItem,
  IconButton,
  Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FlagIcon from '@mui/icons-material/Flag';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';

// Multi-plan types: support multiple carrier/renewal per type
const MULTI_PLAN_TYPES = ['medical', 'dental', 'vision', 'life_adnd'];

const MULTI_PLAN_LABELS = {
  medical: 'Medical',
  dental: 'Dental',
  vision: 'Vision',
  life_adnd: 'Life & AD&D'
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
 * BenefitsModal - Form for creating/editing employee benefits records
 */
const BenefitsModal = ({ open, onClose, benefit, onSave, clients = [] }) => {
  const getInitialFormData = () => ({
    tax_id: '',
    status: '',
    outstanding_item: '',
    remarks: '',
    form_fire_code: '',
    enrollment_poc: '',
    funding: '',
    num_employees_at_renewal: '',
    waiting_period: '',
    deductible_accumulation: '',
    previous_carrier: '',
    cobra_carrier: '',
    employee_contribution: '',
    contribution_type: '%',
    // Single-plan types (flat fields)
    ltd_renewal_date: '', ltd_carrier: '', ltd_flag: false,
    std_renewal_date: '', std_carrier: '', std_flag: false,
    k401_renewal_date: '', k401_carrier: '', k401_flag: false,
    critical_illness_renewal_date: '', critical_illness_carrier: '', critical_illness_flag: false,
    accident_renewal_date: '', accident_carrier: '', accident_flag: false,
    hospital_renewal_date: '', hospital_carrier: '', hospital_flag: false,
    voluntary_life_renewal_date: '', voluntary_life_carrier: '', voluntary_life_flag: false
  });

  const [formData, setFormData] = useState(getInitialFormData());

  // Multi-plan state: { medical: [{carrier, renewal_date, flag, waiting_period}, ...], dental: [...], ... }
  const [plans, setPlans] = useState({
    medical: [],
    dental: [],
    vision: [],
    life_adnd: []
  });

  const [errors, setErrors] = useState({});
  const [activeCoverages, setActiveCoverages] = useState([]);

  // Benefit product types configuration
  const benefitProducts = [
    { name: 'Medical', prefix: 'medical', multiPlan: true },
    { name: 'Dental', prefix: 'dental', multiPlan: true },
    { name: 'Vision', prefix: 'vision', multiPlan: true },
    { name: 'Life & AD&D', prefix: 'life_adnd', multiPlan: true },
    { name: 'LTD (Long-Term Disability)', prefix: 'ltd' },
    { name: 'STD (Short-Term Disability)', prefix: 'std' },
    { name: '401K', prefix: 'k401' },
    { name: 'Critical Illness', prefix: 'critical_illness' },
    { name: 'Accident', prefix: 'accident' },
    { name: 'Hospital', prefix: 'hospital' },
    { name: 'Voluntary Life', prefix: 'voluntary_life' }
  ];

  // Initialize form data when modal opens or benefit changes
  useEffect(() => {
    if (benefit) {
      // Parse contribution value to determine type (% or $)
      let contributionType = '%';
      let contributionValue = benefit.employee_contribution || '';
      if (typeof contributionValue === 'string') {
        if (contributionValue.startsWith('$')) {
          contributionType = '$';
          contributionValue = contributionValue.replace('$', '').trim();
        } else if (contributionValue.endsWith('%')) {
          contributionType = '%';
          contributionValue = contributionValue.replace('%', '').trim();
        } else if (contributionValue && !isNaN(parseFloat(contributionValue)) && parseFloat(contributionValue) <= 1) {
          contributionType = '%';
          contributionValue = (parseFloat(contributionValue) * 100).toString();
        }
      }

      setFormData({
        ...getInitialFormData(),
        ...benefit,
        employee_contribution: contributionValue,
        contribution_type: contributionType
      });

      // Initialize plans from benefit.plans (nested object from API)
      const newPlans = { medical: [], dental: [], vision: [], life_adnd: [] };
      if (benefit.plans) {
        for (const planType of MULTI_PLAN_TYPES) {
          const typePlans = benefit.plans[planType] || [];
          if (typePlans.length > 0) {
            newPlans[planType] = typePlans.map(p => ({
              carrier: p.carrier || '',
              renewal_date: p.renewal_date || '',
              flag: p.flag || false,
              waiting_period: p.waiting_period || ''
            }));
          }
        }
      }

      // Fallback: if no plans in API response, populate from flat fields
      if (!benefit.plans || Object.values(benefit.plans).every(arr => arr.length === 0)) {
        if (benefit.current_carrier || benefit.renewal_date) {
          newPlans.medical = [{ carrier: benefit.current_carrier || '', renewal_date: benefit.renewal_date || '', flag: false, waiting_period: '' }];
        }
        if (benefit.dental_carrier || benefit.dental_renewal_date) {
          newPlans.dental = [{ carrier: benefit.dental_carrier || '', renewal_date: benefit.dental_renewal_date || '', flag: false, waiting_period: '' }];
        }
        if (benefit.vision_carrier || benefit.vision_renewal_date) {
          newPlans.vision = [{ carrier: benefit.vision_carrier || '', renewal_date: benefit.vision_renewal_date || '', flag: false, waiting_period: '' }];
        }
        if (benefit.life_adnd_carrier || benefit.life_adnd_renewal_date) {
          newPlans.life_adnd = [{ carrier: benefit.life_adnd_carrier || '', renewal_date: benefit.life_adnd_renewal_date || '', flag: false, waiting_period: '' }];
        }
      }

      setPlans(newPlans);

      // Determine which coverages have data
      const active = [];
      benefitProducts.forEach(p => {
        if (p.multiPlan) {
          if (newPlans[p.prefix] && newPlans[p.prefix].length > 0) {
            active.push(p.prefix);
          }
        } else {
          if (benefit[`${p.prefix}_carrier`] || benefit[`${p.prefix}_renewal_date`]) {
            active.push(p.prefix);
          }
        }
      });
      setActiveCoverages(active);
    } else {
      // Reset for new benefit
      setFormData(getInitialFormData());
      setPlans({ medical: [], dental: [], vision: [], life_adnd: [] });
      setActiveCoverages([]);
    }
    setErrors({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [benefit, open]);

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
      [planType]: [...prev[planType], { carrier: '', renewal_date: '', flag: false, waiting_period: '' }]
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

    const taxId = formData.tax_id ? String(formData.tax_id).trim() : '';
    if (!taxId) {
      newErrors.tax_id = 'Client is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (validate()) {
      const { contribution_type, ...dataToSave } = formData;
      // Format contribution with type prefix/suffix
      if (dataToSave.employee_contribution) {
        dataToSave.employee_contribution = contribution_type === '$'
          ? `$${dataToSave.employee_contribution}`
          : `${dataToSave.employee_contribution}%`;
      }

      // Filter out empty plans (no carrier and no renewal date)
      const cleanPlans = {};
      for (const planType of MULTI_PLAN_TYPES) {
        cleanPlans[planType] = plans[planType].filter(p => p.carrier || p.renewal_date);
      }

      onSave({
        ...benefit,
        ...dataToSave,
        plans: cleanPlans
      });
    }
  };

  const isEditMode = Boolean(benefit && benefit.id);
  const selectedClient = clients.find(c => c.tax_id === formData.tax_id);

  // Get available coverages (not yet added)
  const availableCoverages = benefitProducts.filter(
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
      // Clear medical-specific global fields if medical
      if (prefix === 'medical') {
        setFormData(prev => ({
          ...prev,
          funding: '',
          waiting_period: '',
          deductible_accumulation: '',
          previous_carrier: ''
        }));
      }
    } else {
      setFormData({
        ...formData,
        [`${prefix}_carrier`]: '',
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
                {label} Plan {idx + 1}
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
                <Tooltip title={`Remove ${label} Plan ${idx + 1}`}>
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
              <Grid item xs={12}>
                <TextField
                  label="Waiting Period"
                  select
                  value={plan.waiting_period || ''}
                  onChange={(e) => updatePlan(planType, idx, 'waiting_period', e.target.value)}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="1st of Month after DOH">1st of Month after DOH</MenuItem>
                  <MenuItem value="1st of Month after 30 Days">1st of Month after 30 Days</MenuItem>
                  <MenuItem value="1st of Month after 60 Days">1st of Month after 60 Days</MenuItem>
                  <MenuItem value="90 Days">90 Days</MenuItem>
                </TextField>
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
        {isEditMode ? 'Edit Employee Benefits' : 'Add New Employee Benefits'}
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
              disabled={isEditMode}
              fullWidth
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* General Information */}
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            General Information
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Status"
                value={formData.status || ''}
                onChange={handleChange('status')}
                fullWidth
                size="small"
                select
                InputLabelProps={{ shrink: true }}
              >
                <MenuItem value="">None</MenuItem>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Outstanding Item"
                value={formData.outstanding_item || ''}
                onChange={handleChange('outstanding_item')}
                fullWidth
                size="small"
                select
              >
                <MenuItem value="">None</MenuItem>
                <MenuItem value="Pending Premium">Pending Premium</MenuItem>
                <MenuItem value="In Audit">In Audit</MenuItem>
                <MenuItem value="Pending Cancellation">Pending Cancellation</MenuItem>
                <MenuItem value="Complete">Complete</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Remarks"
                value={formData.remarks || ''}
                onChange={handleChange('remarks')}
                fullWidth
                size="small"
              />
            </Grid>
          </Grid>

          {/* Medical Global Fields */}
          {activeCoverages.includes('medical') && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                Medical Plan Details
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Form Fire Code"
                    value={formData.form_fire_code || ''}
                    onChange={handleChange('form_fire_code')}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Enrollment POC"
                    value={formData.enrollment_poc || ''}
                    onChange={handleChange('enrollment_poc')}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Funding"
                    value={formData.funding || ''}
                    onChange={handleChange('funding')}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="# of Employees at Renewal"
                    type="number"
                    value={formData.num_employees_at_renewal || ''}
                    onChange={handleChange('num_employees_at_renewal')}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Waiting Period"
                    value={formData.waiting_period || ''}
                    onChange={handleChange('waiting_period')}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Deductible Accumulation"
                    value={formData.deductible_accumulation || ''}
                    onChange={handleChange('deductible_accumulation')}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Previous Carrier"
                    value={formData.previous_carrier || ''}
                    onChange={handleChange('previous_carrier')}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Cobra Administrator"
                    value={formData.cobra_carrier || ''}
                    onChange={handleChange('cobra_carrier')}
                    fullWidth
                    size="small"
                  />
                </Grid>
              </Grid>
            </>
          )}

          {/* 1095 Section */}
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            1095 Reporting
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Type"
                  value={formData.contribution_type || '%'}
                  onChange={handleChange('contribution_type')}
                  size="small"
                  fullWidth
                  select
                >
                  <MenuItem value="%">Percentage (%)</MenuItem>
                  <MenuItem value="$">Dollar ($)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={9}>
                <TextField
                  label="Employee Contribution"
                  type="number"
                  value={formData.employee_contribution || ''}
                  onChange={handleChange('employee_contribution')}
                  size="small"
                  fullWidth
                  InputProps={{
                    startAdornment: formData.contribution_type === '$' ? <Typography sx={{ mr: 0.5 }}>$</Typography> : undefined,
                    endAdornment: formData.contribution_type === '%' ? <Typography sx={{ ml: 0.5 }}>%</Typography> : undefined,
                    inputProps: { min: 0, step: formData.contribution_type === '%' ? 1 : 0.01 }
                  }}
                />
              </Grid>
            </Grid>
          </Paper>

          <Divider sx={{ my: 2 }} />

          {/* Coverages */}
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
              const product = benefitProducts.find(p => p.prefix === prefix);
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

export default BenefitsModal;
