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
  Switch,
  FormControlLabel,
  Chip,
  Paper,
  MenuItem,
  IconButton,
  Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

// Multi-plan types: support multiple carrier/renewal per type
const MULTI_PLAN_TYPES = ['medical', 'dental', 'vision', 'life_adnd'];

const MULTI_PLAN_LABELS = {
  medical: 'Medical',
  dental: 'Dental',
  vision: 'Vision',
  life_adnd: 'Life & AD&D'
};

/**
 * BenefitsModal - Form for creating/editing employee benefits records
 */
const BenefitsModal = ({ open, onClose, benefit, onSave, clients = [] }) => {
  const [formData, setFormData] = useState({
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
    ltd_renewal_date: '',
    ltd_carrier: '',
    std_renewal_date: '',
    std_carrier: '',
    k401_renewal_date: '',
    k401_carrier: '',
    critical_illness_renewal_date: '',
    critical_illness_carrier: '',
    accident_renewal_date: '',
    accident_carrier: '',
    hospital_renewal_date: '',
    hospital_carrier: '',
    voluntary_life_renewal_date: '',
    voluntary_life_carrier: ''
  });

  // Multi-plan state: { medical: [{carrier, renewal_date}, ...], dental: [...], ... }
  const [plans, setPlans] = useState({
    medical: [],
    dental: [],
    vision: [],
    life_adnd: []
  });

  const [errors, setErrors] = useState({});

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
              renewal_date: p.renewal_date || ''
            }));
          }
        }
      }

      // Fallback: if no plans in API response, populate from flat fields
      if (!benefit.plans || Object.values(benefit.plans).every(arr => arr.length === 0)) {
        if (benefit.current_carrier || benefit.renewal_date) {
          newPlans.medical = [{ carrier: benefit.current_carrier || '', renewal_date: benefit.renewal_date || '' }];
        }
        if (benefit.dental_carrier || benefit.dental_renewal_date) {
          newPlans.dental = [{ carrier: benefit.dental_carrier || '', renewal_date: benefit.dental_renewal_date || '' }];
        }
        if (benefit.vision_carrier || benefit.vision_renewal_date) {
          newPlans.vision = [{ carrier: benefit.vision_carrier || '', renewal_date: benefit.vision_renewal_date || '' }];
        }
        if (benefit.life_adnd_carrier || benefit.life_adnd_renewal_date) {
          newPlans.life_adnd = [{ carrier: benefit.life_adnd_carrier || '', renewal_date: benefit.life_adnd_renewal_date || '' }];
        }
      }

      setPlans(newPlans);
    } else {
      // Reset for new benefit
      setFormData({
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
        ltd_renewal_date: '',
        ltd_carrier: '',
        std_renewal_date: '',
        std_carrier: '',
        k401_renewal_date: '',
        k401_carrier: '',
        critical_illness_renewal_date: '',
        critical_illness_carrier: '',
        accident_renewal_date: '',
        accident_carrier: '',
        hospital_renewal_date: '',
        hospital_carrier: '',
        voluntary_life_renewal_date: '',
        voluntary_life_carrier: ''
      });
      setPlans({ medical: [], dental: [], vision: [], life_adnd: [] });
    }
    setErrors({});
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
      [planType]: [...prev[planType], { carrier: '', renewal_date: '' }]
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

  // Single-plan types configuration
  const singlePlanTypes = [
    { name: 'LTD (Long-Term Disability)', prefix: 'ltd' },
    { name: 'STD (Short-Term Disability)', prefix: 'std' },
    { name: '401K', prefix: 'k401' },
    { name: 'Critical Illness', prefix: 'critical_illness' },
    { name: 'Accident', prefix: 'accident' },
    { name: 'Hospital', prefix: 'hospital' },
    { name: 'Voluntary Life', prefix: 'voluntary_life' }
  ];

  // Check if a coverage is enabled
  const isCoverageEnabled = (prefix) => {
    if (MULTI_PLAN_TYPES.includes(prefix)) {
      return plans[prefix].length > 0;
    }
    return Boolean(formData[`${prefix}_carrier`] || formData[`${prefix}_renewal_date`]);
  };

  // Toggle coverage on/off for single-plan types
  const toggleSingleCoverage = (prefix) => {
    if (isCoverageEnabled(prefix)) {
      setFormData({
        ...formData,
        [`${prefix}_carrier`]: '',
        [`${prefix}_renewal_date`]: ''
      });
    }
  };

  // Toggle coverage on/off for multi-plan types
  const toggleMultiCoverage = (planType) => {
    if (plans[planType].length > 0) {
      // Clear all plans for this type
      setPlans(prev => ({ ...prev, [planType]: [] }));
      // Also clear medical-specific fields if medical
      if (planType === 'medical') {
        setFormData(prev => ({
          ...prev,
          funding: '',
          waiting_period: '',
          deductible_accumulation: '',
          previous_carrier: ''
        }));
      }
    } else {
      // Add one empty plan
      addPlan(planType);
    }
  };

  // Count active coverages
  const countActiveCoverages = () => {
    let count = 0;
    MULTI_PLAN_TYPES.forEach(pt => { if (plans[pt].length > 0) count++; });
    singlePlanTypes.forEach(plan => { if (isCoverageEnabled(plan.prefix)) count++; });
    return count;
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
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Renewal Date"
                  type="date"
                  value={plan.renewal_date ? plan.renewal_date.split('T')[0] : ''}
                  onChange={(e) => updatePlan(planType, idx, 'renewal_date', e.target.value)}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
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
            <Grid container spacing={2} sx={{ mt: 1 }}>
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
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Coverage Summary */}
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Active Coverages:
            </Typography>
            <Chip
              label={`${countActiveCoverages()} / 11`}
              color={countActiveCoverages() > 0 ? 'primary' : 'default'}
              size="small"
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Medical Plan - Multi-plan with global fields */}
          <Accordion defaultExpanded={isCoverageEnabled('medical')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', pr: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontWeight: 500 }}>Medical</Typography>
                  {plans.medical.length > 0 && (
                    <Chip
                      label={plans.medical.length > 1 ? `${plans.medical.length} Plans` : 'Active'}
                      size="small"
                      color="success"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={plans.medical.length > 0}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleMultiCoverage('medical');
                      }}
                      onClick={(e) => e.stopPropagation()}
                      size="small"
                    />
                  }
                  label={plans.medical.length > 0 ? <RemoveIcon fontSize="small" /> : <AddIcon fontSize="small" />}
                  onClick={(e) => e.stopPropagation()}
                  sx={{ m: 0 }}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {/* Medical global fields */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
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

              {/* Medical plan rows (dynamic) */}
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: '#555' }}>
                Medical Plans
              </Typography>
              {renderMultiPlanRows('medical')}
            </AccordionDetails>
          </Accordion>

          {/* Dental, Vision, Life & AD&D - Multi-plan */}
          {['dental', 'vision', 'life_adnd'].map((planType) => (
            <Accordion key={planType} defaultExpanded={isCoverageEnabled(planType)}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', pr: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontWeight: 500 }}>{MULTI_PLAN_LABELS[planType]}</Typography>
                    {plans[planType].length > 0 && (
                      <Chip
                        label={plans[planType].length > 1 ? `${plans[planType].length} Plans` : 'Active'}
                        size="small"
                        color="success"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={plans[planType].length > 0}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleMultiCoverage(planType);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        size="small"
                      />
                    }
                    label={plans[planType].length > 0 ? <RemoveIcon fontSize="small" /> : <AddIcon fontSize="small" />}
                    onClick={(e) => e.stopPropagation()}
                    sx={{ m: 0 }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {renderMultiPlanRows(planType)}
              </AccordionDetails>
            </Accordion>
          ))}

          {/* 1095 Section */}
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mt: 3, mb: 2 }}>
            1095 Reporting
          </Typography>
          <Paper variant="outlined" sx={{ p: 2 }}>
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

          {/* Single-plan types */}
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mt: 3, mb: 2 }}>
            Additional Benefit Plans
          </Typography>
          {singlePlanTypes.map((plan) => (
            <Accordion key={plan.prefix} defaultExpanded={isCoverageEnabled(plan.prefix)}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', pr: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontWeight: 500 }}>{plan.name}</Typography>
                    {isCoverageEnabled(plan.prefix) && (
                      <Chip label="Active" size="small" color="success" sx={{ height: 20, fontSize: '0.7rem' }} />
                    )}
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isCoverageEnabled(plan.prefix)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSingleCoverage(plan.prefix);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        size="small"
                      />
                    }
                    label={isCoverageEnabled(plan.prefix) ? <RemoveIcon fontSize="small" /> : <AddIcon fontSize="small" />}
                    onClick={(e) => e.stopPropagation()}
                    sx={{ m: 0 }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Renewal Date"
                      type="date"
                      value={formData[`${plan.prefix}_renewal_date`] ? formData[`${plan.prefix}_renewal_date`].split('T')[0] : ''}
                      onChange={handleChange(`${plan.prefix}_renewal_date`)}
                      fullWidth
                      size="small"
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Carrier"
                      value={formData[`${plan.prefix}_carrier`] || ''}
                      onChange={handleChange(`${plan.prefix}_carrier`)}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
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

export default BenefitsModal;
