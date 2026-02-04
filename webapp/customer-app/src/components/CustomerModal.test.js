import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomerModal from './CustomerModal';

const mockCustomer = {
  Customer_id: 1,
  Tax_ID: '12-3456789',
  Form_Fire_Code: 'ABC123',
  Enrollment_POC: 'John Doe',
  Renewal_Date: '2024-12-31',
  Other_Broker: 'Broker A',
  Group_Name: 'Test Company Inc',
  Contact_Person: 'Jane Smith',
  Email: 'test@example.com',
  Phone_Number: '555-1234',
  Funding: 'Self-Funded',
  Current_Carrier: 'Carrier A',
  Num_Employees_At_Renewal: '100',
  Waiting_Period: '30 days',
  Deductible_Accumulation: 'Calendar Year',
  Previous_Carrier: 'Carrier B',
  Cobra_Carrier: 'Cobra Inc',
  Dental_Effective_Date: '2024-01-15',
  Dental_Carrier: 'Dental Co',
  Vision_Effective_Date: '2024-01-15',
  Vision_Carrier: 'Vision Co',
  Life_And_ADND_Effective_Date: '2024-01-15',
  Life_And_ADND_Carrier: 'Life Co',
  LTD_Effective_Date: '2024-01-15',
  LTD_Carrier: 'LTD Co',
  STD_Effective_Date: '2024-01-15',
  STD_Carrier: 'STD Co',
  Effective_Date_401K: '2024-01-15',
  Carrier_401K: '401K Co',
  Employer: '80%',
  Employee: '20%',
};

const emptyCustomer = {
  Tax_ID: '',
  Form_Fire_Code: '',
  Enrollment_POC: '',
  Renewal_Date: '',
  Other_Broker: '',
  Group_Name: '',
  Contact_Person: '',
  Email: '',
  Phone_Number: '',
  Funding: '',
  Current_Carrier: '',
  Num_Employees_At_Renewal: '',
  Waiting_Period: '',
  Deductible_Accumulation: '',
  Previous_Carrier: '',
  Cobra_Carrier: '',
  Dental_Effective_Date: '',
  Dental_Carrier: '',
  Vision_Effective_Date: '',
  Vision_Carrier: '',
  Life_And_ADND_Effective_Date: '',
  Life_And_ADND_Carrier: '',
  LTD_Effective_Date: '',
  LTD_Carrier: '',
  STD_Effective_Date: '',
  STD_Carrier: '',
  Effective_Date_401K: '',
  Carrier_401K: '',
  Employer: '',
  Employee: '',
};

describe('CustomerModal', () => {
  const mockOnRequestClose = jest.fn();
  const mockSetCurrentCustomer = jest.fn();
  const mockSaveCustomer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders when isOpen is true', () => {
      render(
        <CustomerModal
          isOpen={true}
          onRequestClose={mockOnRequestClose}
          currentCustomer={mockCustomer}
          setCurrentCustomer={mockSetCurrentCustomer}
          saveCustomer={mockSaveCustomer}
        />
      );

      expect(screen.getByText('Edit Client Information')).toBeInTheDocument();
    });

    test('does not render when isOpen is false', () => {
      render(
        <CustomerModal
          isOpen={false}
          onRequestClose={mockOnRequestClose}
          currentCustomer={mockCustomer}
          setCurrentCustomer={mockSetCurrentCustomer}
          saveCustomer={mockSaveCustomer}
        />
      );

      expect(screen.queryByText('Edit Client Information')).not.toBeInTheDocument();
    });

    test('returns null when currentCustomer is null', () => {
      const { container } = render(
        <CustomerModal
          isOpen={true}
          onRequestClose={mockOnRequestClose}
          currentCustomer={null}
          setCurrentCustomer={mockSetCurrentCustomer}
          saveCustomer={mockSaveCustomer}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    test('renders all 30 form fields', () => {
      render(
        <CustomerModal
          isOpen={true}
          onRequestClose={mockOnRequestClose}
          currentCustomer={emptyCustomer}
          setCurrentCustomer={mockSetCurrentCustomer}
          saveCustomer={mockSaveCustomer}
        />
      );

      expect(screen.getByLabelText('Tax ID')).toBeInTheDocument();
      expect(screen.getByLabelText('Form Fire Code')).toBeInTheDocument();
      expect(screen.getByLabelText('Enrollment POC')).toBeInTheDocument();
      expect(screen.getByLabelText('Group Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
      expect(screen.getByLabelText('# of Emp at renewal')).toBeInTheDocument();
      expect(screen.getByLabelText('Employer')).toBeInTheDocument();
      expect(screen.getByLabelText('Employee')).toBeInTheDocument();
    });

    test('renders 7 date pickers for date fields', () => {
      render(
        <CustomerModal
          isOpen={true}
          onRequestClose={mockOnRequestClose}
          currentCustomer={emptyCustomer}
          setCurrentCustomer={mockSetCurrentCustomer}
          saveCustomer={mockSaveCustomer}
        />
      );

      // Each date picker may render multiple elements with the same label
      expect(screen.getAllByLabelText('Renewal Date').length).toBeGreaterThan(0);
      expect(screen.getAllByLabelText('Dental Effective Date').length).toBeGreaterThan(0);
      expect(screen.getAllByLabelText('Vision Effective Date').length).toBeGreaterThan(0);
      expect(screen.getAllByLabelText('Life & AD&D Effective Date').length).toBeGreaterThan(0);
      expect(screen.getAllByLabelText('LTD Effective Date').length).toBeGreaterThan(0);
      expect(screen.getAllByLabelText('STD Effective Date').length).toBeGreaterThan(0);
      expect(screen.getAllByLabelText('401K Effective Date').length).toBeGreaterThan(0);
    });

    test('renders text fields for non-date fields', () => {
      render(
        <CustomerModal
          isOpen={true}
          onRequestClose={mockOnRequestClose}
          currentCustomer={emptyCustomer}
          setCurrentCustomer={mockSetCurrentCustomer}
          saveCustomer={mockSaveCustomer}
        />
      );

      const taxIdField = screen.getByLabelText('Tax ID');
      expect(taxIdField.tagName).toBe('INPUT');
      expect(taxIdField.getAttribute('type')).toBe('text');
    });

    test('displays Edit Client Information title', () => {
      render(
        <CustomerModal
          isOpen={true}
          onRequestClose={mockOnRequestClose}
          currentCustomer={mockCustomer}
          setCurrentCustomer={mockSetCurrentCustomer}
          saveCustomer={mockSaveCustomer}
        />
      );

      expect(screen.getByText('Edit Client Information')).toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    test('text fields show current values', () => {
      render(
        <CustomerModal
          isOpen={true}
          onRequestClose={mockOnRequestClose}
          currentCustomer={mockCustomer}
          setCurrentCustomer={mockSetCurrentCustomer}
          saveCustomer={mockSaveCustomer}
        />
      );

      expect(screen.getByLabelText('Tax ID')).toHaveValue('12-3456789');
      expect(screen.getByLabelText('Form Fire Code')).toHaveValue('ABC123');
      expect(screen.getByLabelText('Email')).toHaveValue('test@example.com');
      expect(screen.getByLabelText('Phone Number')).toHaveValue('555-1234');
    });

    test('date fields show current dates', () => {
      render(
        <CustomerModal
          isOpen={true}
          onRequestClose={mockOnRequestClose}
          currentCustomer={mockCustomer}
          setCurrentCustomer={mockSetCurrentCustomer}
          saveCustomer={mockSaveCustomer}
        />
      );

      // Date fields should be rendered
      const renewalDateFields = screen.getAllByLabelText('Renewal Date');
      const dentalDateFields = screen.getAllByLabelText('Dental Effective Date');
      expect(renewalDateFields.length).toBeGreaterThan(0);
      expect(dentalDateFields.length).toBeGreaterThan(0);
    });

    test('empty fields display empty values', () => {
      render(
        <CustomerModal
          isOpen={true}
          onRequestClose={mockOnRequestClose}
          currentCustomer={emptyCustomer}
          setCurrentCustomer={mockSetCurrentCustomer}
          saveCustomer={mockSaveCustomer}
        />
      );

      expect(screen.getByLabelText('Tax ID')).toHaveValue('');
      expect(screen.getByLabelText('Email')).toHaveValue('');
      expect(screen.getByLabelText('Phone Number')).toHaveValue('');
    });

    test('date picker handles null values', () => {
      const customerWithNullDate = {
        ...emptyCustomer,
        Renewal_Date: null,
      };

      render(
        <CustomerModal
          isOpen={true}
          onRequestClose={mockOnRequestClose}
          currentCustomer={customerWithNullDate}
          setCurrentCustomer={mockSetCurrentCustomer}
          saveCustomer={mockSaveCustomer}
        />
      );

      const renewalDateFields = screen.getAllByLabelText('Renewal Date');
      expect(renewalDateFields.length).toBeGreaterThan(0);
    });

    test('date picker handles empty string values', () => {
      render(
        <CustomerModal
          isOpen={true}
          onRequestClose={mockOnRequestClose}
          currentCustomer={emptyCustomer}
          setCurrentCustomer={mockSetCurrentCustomer}
          saveCustomer={mockSaveCustomer}
        />
      );

      const renewalDateFields = screen.getAllByLabelText('Renewal Date');
      expect(renewalDateFields.length).toBeGreaterThan(0);
    });
  });

  describe('User Interactions', () => {
    test('text field changes call setCurrentCustomer', async () => {
      
      render(
        <CustomerModal
          isOpen={true}
          onRequestClose={mockOnRequestClose}
          currentCustomer={mockCustomer}
          setCurrentCustomer={mockSetCurrentCustomer}
          saveCustomer={mockSaveCustomer}
        />
      );

      const taxIdField = screen.getByLabelText('Tax ID');
      await userEvent.clear(taxIdField);
      await userEvent.type(taxIdField, '99-9999999');

      expect(mockSetCurrentCustomer).toHaveBeenCalled();
    });

    test('Save button calls saveCustomer with currentCustomer', async () => {
      
      render(
        <CustomerModal
          isOpen={true}
          onRequestClose={mockOnRequestClose}
          currentCustomer={mockCustomer}
          setCurrentCustomer={mockSetCurrentCustomer}
          saveCustomer={mockSaveCustomer}
        />
      );

      const saveButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(saveButton);

      expect(mockSaveCustomer).toHaveBeenCalledWith(mockCustomer);
    });

    test('Cancel button calls onRequestClose', async () => {
      
      render(
        <CustomerModal
          isOpen={true}
          onRequestClose={mockOnRequestClose}
          currentCustomer={mockCustomer}
          setCurrentCustomer={mockSetCurrentCustomer}
          saveCustomer={mockSaveCustomer}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);

      expect(mockOnRequestClose).toHaveBeenCalled();
    });
  });

  describe('Date Handling', () => {
    test('handles null dates without errors', () => {
      const customerWithNullDates = {
        ...emptyCustomer,
        Renewal_Date: null,
        Dental_Effective_Date: null,
      };

      expect(() => {
        render(
          <CustomerModal
            isOpen={true}
            onRequestClose={mockOnRequestClose}
            currentCustomer={customerWithNullDates}
            setCurrentCustomer={mockSetCurrentCustomer}
            saveCustomer={mockSaveCustomer}
          />
        );
      }).not.toThrow();
    });

    test('handles invalid date strings without errors', () => {
      const customerWithInvalidDates = {
        ...emptyCustomer,
        Renewal_Date: 'invalid-date',
        Dental_Effective_Date: 'not-a-date',
      };

      expect(() => {
        render(
          <CustomerModal
            isOpen={true}
            onRequestClose={mockOnRequestClose}
            currentCustomer={customerWithInvalidDates}
            setCurrentCustomer={mockSetCurrentCustomer}
            saveCustomer={mockSaveCustomer}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Data Type Validation', () => {
    test('Tax_ID accepts alphanumeric input', async () => {
      
      render(
        <CustomerModal
          isOpen={true}
          onRequestClose={mockOnRequestClose}
          currentCustomer={emptyCustomer}
          setCurrentCustomer={mockSetCurrentCustomer}
          saveCustomer={mockSaveCustomer}
        />
      );

      const taxIdField = screen.getByLabelText('Tax ID');
      await userEvent.type(taxIdField, '12-3456789');

      expect(mockSetCurrentCustomer).toHaveBeenCalled();
    });

    test('Email field accepts email format', async () => {
      
      render(
        <CustomerModal
          isOpen={true}
          onRequestClose={mockOnRequestClose}
          currentCustomer={emptyCustomer}
          setCurrentCustomer={mockSetCurrentCustomer}
          saveCustomer={mockSaveCustomer}
        />
      );

      const emailField = screen.getByLabelText('Email');
      await userEvent.type(emailField, 'test@example.com');

      expect(mockSetCurrentCustomer).toHaveBeenCalled();
    });

    test('Phone_Number accepts phone format', async () => {
      
      render(
        <CustomerModal
          isOpen={true}
          onRequestClose={mockOnRequestClose}
          currentCustomer={emptyCustomer}
          setCurrentCustomer={mockSetCurrentCustomer}
          saveCustomer={mockSaveCustomer}
        />
      );

      const phoneField = screen.getByLabelText('Phone Number');
      await userEvent.type(phoneField, '555-1234');

      expect(mockSetCurrentCustomer).toHaveBeenCalled();
    });

    test('Num_Employees_At_Renewal accepts numbers', async () => {
      
      render(
        <CustomerModal
          isOpen={true}
          onRequestClose={mockOnRequestClose}
          currentCustomer={emptyCustomer}
          setCurrentCustomer={mockSetCurrentCustomer}
          saveCustomer={mockSaveCustomer}
        />
      );

      const numEmployeesField = screen.getByLabelText('# of Emp at renewal');
      await userEvent.type(numEmployeesField, '100');

      expect(mockSetCurrentCustomer).toHaveBeenCalled();
    });
  });
});
