// FILE: ./components/CustomerModal.js
import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import './CustomerModal.css';

const dateFieldIds = [
  'Renewal_Date',
  'Dental_Effective_Date',
  'Vision_Effective_Date',
  'Life_And_ADND_Effective_Date',
  'LTD_Effective_Date',
  'STD_Effective_Date',
  'Effective_Date_401K',
];

const fields = [
  { id: 'Tax_ID', label: 'Tax ID' },
  { id: 'Form_Fire_Code', label: 'Form Fire Code' },
  { id: 'Enrollment_POC', label: 'Enrollment POC' },
  { id: 'Renewal_Date', label: 'Renewal Date' },
  { id: 'Other_Broker', label: 'Other Broker' },
  { id: 'Group_Name', label: 'Group Name' },
  { id: 'Contact_Person', label: 'Contact Person' },
  { id: 'Email', label: 'Email' },
  { id: 'Phone_Number', label: 'Phone Number' },
  { id: 'Funding', label: 'Funding' },
  { id: 'Current_Carrier', label: 'Current Carrier' },
  { id: 'Num_Employees_At_Renewal', label: '# of Emp at renewal' },
  { id: 'Waiting_Period', label: 'Waiting Period' },
  { id: 'Deductible_Accumulation', label: 'Deductible Accumulation' },
  { id: 'Previous_Carrier', label: 'Previous Carrier' },
  { id: 'Cobra_Carrier', label: 'Cobra Carrier' },
  { id: 'Dental_Effective_Date', label: 'Dental Effective Date' },
  { id: 'Dental_Carrier', label: 'Dental Carrier' },
  { id: 'Vision_Effective_Date', label: 'Vision Effective Date' },
  { id: 'Vision_Carrier', label: 'Vision Carrier' },
  { id: 'Life_And_ADND_Effective_Date', label: 'Life & AD&D Effective Date' },
  { id: 'Life_And_ADND_Carrier', label: 'Life & AD&D Carrier' },
  { id: 'LTD_Effective_Date', label: 'LTD Effective Date' },
  { id: 'LTD_Carrier', label: 'LTD Carrier' },
  { id: 'STD_Effective_Date', label: 'STD Effective Date' },
  { id: 'STD_Carrier', label: 'STD Carrier' },
  { id: 'Effective_Date_401K', label: '401K Effective Date' },
  { id: 'Carrier_401K', label: '401K Carrier' },
  { id: 'Employer', label: 'Employer Contribution %' },
  { id: 'Employee', label: 'Employee Contribution %' },
];

const CustomerModal = ({
  isOpen,
  onRequestClose,
  currentCustomer,
  setCurrentCustomer,
  saveCustomer,
}) => {
  if (!currentCustomer) return null;

  const handleChange = (field) => (event) => {
    setCurrentCustomer({
      ...currentCustomer,
      [field]: event.target.value,
    });
  };

  const handleDateChange = (field) => (date) => {
    setCurrentCustomer({
      ...currentCustomer,
      [field]: date ? date.toISOString().slice(0, 10) : '',
    });
  };

  const getDateValue = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  };

  return (
    <Dialog open={isOpen} onClose={onRequestClose} maxWidth="xl" fullWidth>
      <DialogTitle>Edit Client Information</DialogTitle>
      <DialogContent dividers>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Grid container spacing={2} alignItems="flex-start">
            {fields.map((field, idx) => (
              <Grid
                item
                xs={12}
                sm={6}
                md={3}
                key={field.id}
                style={{ display: 'flex', flexDirection: 'column' }}
              >
                {dateFieldIds.includes(field.id) ? (
                  <DatePicker
                    label={field.label}
                    value={getDateValue(currentCustomer[field.id])}
                    onChange={handleDateChange(field.id)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: 'small',
                        variant: 'outlined',
                        margin: 'dense',
                        InputLabelProps: { style: { left: 0 } },
                        inputProps: { style: { textAlign: 'left' } },
                      }
                    }}
                  />
                ) : (
                  <TextField
                    label={field.label}
                    value={currentCustomer[field.id] || ''}
                    onChange={handleChange(field.id)}
                    fullWidth
                    size="small"
                    variant="outlined"
                    margin="dense"
                    InputLabelProps={{ style: { left: 0 } }}
                    inputProps={{ style: { textAlign: 'left' } }}
                  />
                )}
              </Grid>
            ))}
          </Grid>
        </LocalizationProvider>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="primary"
          onClick={() => saveCustomer(currentCustomer)}
        >
          Save
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          onClick={onRequestClose}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomerModal;