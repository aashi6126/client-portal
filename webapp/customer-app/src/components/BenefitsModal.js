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
  Paper
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

/**
 * BenefitsModal - Form for creating/editing employee benefits records
 */
const BenefitsModal = ({ open, onClose, benefit, onSave, clients = [] }) => {
  const [formData, setFormData] = useState({
    tax_id: '',
    form_fire_code: '',
    enrollment_poc: '',
    renewal_date: '',
    funding: '',
    current_carrier: '',
    num_employees_at_renewal: '',
    waiting_period: '',
    deductible_accumulation: '',
    previous_carrier: '',
    cobra_carrier: '',
    employer_contribution: '',
    employee_contribution: '',
    // 10 Benefit Plans
    dental_renewal_date: '',
    dental_carrier: '',
    vision_renewal_date: '',
    vision_carrier: '',
    life_adnd_renewal_date: '',
    life_adnd_carrier: '',
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

  const [errors, setErrors] = useState({});

  // Initialize form data when modal opens or benefit changes
  useEffect(() => {
    if (benefit) {
      setFormData({ ...benefit });
    } else {
      // Reset for new benefit
      setFormData({
        tax_id: '',
        form_fire_code: '',
        enrollment_poc: '',
        renewal_date: '',
        funding: '',
        current_carrier: '',
        num_employees_at_renewal: '',
        waiting_period: '',
        deductible_accumulation: '',
        previous_carrier: '',
        cobra_carrier: '',
        employer_contribution: '',
        employee_contribution: '',
        dental_renewal_date: '',
        dental_carrier: '',
        vision_renewal_date: '',
        vision_carrier: '',
        life_adnd_renewal_date: '',
        life_adnd_carrier: '',
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
      onSave({
        ...benefit,
        ...formData
      });
    }
  };

  const isEditMode = Boolean(benefit && benefit.id);
  const selectedClient = clients.find(c => c.tax_id === formData.tax_id);

  // Benefit plans configuration
  const benefitPlans = [
    { name: 'Dental', prefix: 'dental' },
    { name: 'Vision', prefix: 'vision' },
    { name: 'Life & AD&D', prefix: 'life_adnd' },
    { name: 'LTD (Long-Term Disability)', prefix: 'ltd' },
    { name: 'STD (Short-Term Disability)', prefix: 'std' },
    { name: '401K', prefix: 'k401' },
    { name: 'Critical Illness', prefix: 'critical_illness' },
    { name: 'Accident', prefix: 'accident' },
    { name: 'Hospital', prefix: 'hospital' },
    { name: 'Voluntary Life', prefix: 'voluntary_life' }
  ];

  // Check if a coverage is enabled (has carrier or renewal date)
  const isCoverageEnabled = (prefix) => {
    if (prefix === 'medical') {
      return Boolean(formData.current_carrier || formData.renewal_date);
    }
    return Boolean(formData[`${prefix}_carrier`] || formData[`${prefix}_renewal_date`]);
  };

  // Toggle coverage on/off
  const toggleCoverage = (prefix) => {
    if (prefix === 'medical') {
      if (isCoverageEnabled('medical')) {
        // Disable - clear medical fields
        setFormData({
          ...formData,
          current_carrier: '',
          renewal_date: '',
          funding: '',
          waiting_period: '',
          deductible_accumulation: '',
          previous_carrier: ''
        });
      }
      // If enabling, just leave fields empty for user to fill
    } else {
      if (isCoverageEnabled(prefix)) {
        // Disable - clear this plan's fields
        setFormData({
          ...formData,
          [`${prefix}_carrier`]: '',
          [`${prefix}_renewal_date`]: ''
        });
      }
      // If enabling, just leave fields empty for user to fill
    }
  };

  // Count active coverages
  const countActiveCoverages = () => {
    let count = 0;
    if (isCoverageEnabled('medical')) count++;
    benefitPlans.forEach(plan => {
      if (isCoverageEnabled(plan.prefix)) count++;
    });
    return count;
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
              disabled={isEditMode} // Cannot change client after creation
              fullWidth
            />
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

          {/* Medical Plan - Special handling */}
          <Accordion defaultExpanded={isCoverageEnabled('medical')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', pr: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontWeight: 500 }}>Medical Plan</Typography>
                  {isCoverageEnabled('medical') && (
                    <Chip label="Active" size="small" color="success" sx={{ height: 20, fontSize: '0.7rem' }} />
                  )}
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={isCoverageEnabled('medical')}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleCoverage('medical');
                      }}
                      onClick={(e) => e.stopPropagation()}
                      size="small"
                    />
                  }
                  label={isCoverageEnabled('medical') ? <RemoveIcon fontSize="small" /> : <AddIcon fontSize="small" />}
                  onClick={(e) => e.stopPropagation()}
                  sx={{ m: 0 }}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
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
                label="Renewal Date"
                type="date"
                value={formData.renewal_date ? formData.renewal_date.split('T')[0] : ''}
                onChange={handleChange('renewal_date')}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
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
                label="Current Carrier"
                value={formData.current_carrier || ''}
                onChange={handleChange('current_carrier')}
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
            </AccordionDetails>
          </Accordion>

          {/* Additional Benefit Plans */}
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mt: 3, mb: 2 }}>
            Additional Benefit Plans
          </Typography>
          {benefitPlans.map((plan) => (
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
                          toggleCoverage(plan.prefix);
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

          {/* 1095 Section */}
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mt: 3, mb: 2 }}>
            1095 Reporting
          </Typography>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Employer Contribution %
                </Typography>
                <TextField
                  type="number"
                  value={formData.employer_contribution ? (parseFloat(formData.employer_contribution) * 100) : ''}
                  onChange={(e) => handleChange('employer_contribution')({ target: { value: e.target.value ? (parseFloat(e.target.value) / 100).toString() : '' } })}
                  size="small"
                  fullWidth
                  InputProps={{ inputProps: { min: 0, max: 100, step: 1 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Employee Contribution %
                </Typography>
                <TextField
                  type="number"
                  value={formData.employee_contribution ? (parseFloat(formData.employee_contribution) * 100) : ''}
                  onChange={(e) => handleChange('employee_contribution')({ target: { value: e.target.value ? (parseFloat(e.target.value) / 100).toString() : '' } })}
                  size="small"
                  fullWidth
                  InputProps={{ inputProps: { min: 0, max: 100, step: 1 } }}
                />
              </Grid>
            </Grid>
          </Paper>
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
