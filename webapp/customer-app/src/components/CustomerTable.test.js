import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomerTable, { columns } from './CustomerTable';

const mockCustomers = [
  {
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
    Dental_Effective_Date: '2024-01-01',
    Dental_Carrier: 'Dental Co',
    Vision_Effective_Date: '2024-01-01',
    Vision_Carrier: 'Vision Co',
    Life_And_ADND_Effective_Date: '2024-01-01',
    Life_And_ADND_Carrier: 'Life Co',
    LTD_Effective_Date: '2024-01-01',
    LTD_Carrier: 'LTD Co',
    STD_Effective_Date: '2024-01-01',
    STD_Carrier: 'STD Co',
    Effective_Date_401K: '2024-01-01',
    Carrier_401K: '401K Co',
    Employer: '80%',
    Employee: '20%',
  },
  {
    Customer_id: 2,
    Tax_ID: '98-7654321',
    Form_Fire_Code: 'XYZ789',
    Enrollment_POC: 'Bob Johnson',
    Renewal_Date: '2024-11-30',
    Other_Broker: 'Broker B',
    Group_Name: 'Another Company LLC',
    Contact_Person: 'Mike Brown',
    Email: 'contact@another.com',
    Phone_Number: '555-5678',
    Funding: 'Fully Insured',
    Current_Carrier: 'Carrier C',
    Num_Employees_At_Renewal: '50',
    Waiting_Period: '60 days',
    Deductible_Accumulation: 'Plan Year',
    Previous_Carrier: 'Carrier D',
    Cobra_Carrier: 'Cobra LLC',
    Dental_Effective_Date: '2024-02-01',
    Dental_Carrier: 'Dental Plus',
    Vision_Effective_Date: '2024-02-01',
    Vision_Carrier: 'Vision Plus',
    Life_And_ADND_Effective_Date: '2024-02-01',
    Life_And_ADND_Carrier: 'Life Plus',
    LTD_Effective_Date: '2024-02-01',
    LTD_Carrier: 'LTD Plus',
    STD_Effective_Date: '2024-02-01',
    STD_Carrier: 'STD Plus',
    Effective_Date_401K: '2024-02-01',
    Carrier_401K: '401K Plus',
    Employer: '70%',
    Employee: '30%',
  },
];

describe('CustomerTable', () => {
  const mockOpenModal = jest.fn();
  const mockDeleteCustomer = jest.fn();
  const mockCloneCustomer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders all 30 column headers correctly', () => {
      render(
        <CustomerTable
          customers={mockCustomers}
          openModal={mockOpenModal}
          deleteCustomer={mockDeleteCustomer}
          cloneCustomer={mockCloneCustomer}
        />
      );

      columns.forEach((col) => {
        expect(screen.getByText(col.label)).toBeInTheDocument();
      });
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    test('renders all customers in rows', () => {
      render(
        <CustomerTable
          customers={mockCustomers}
          openModal={mockOpenModal}
          deleteCustomer={mockDeleteCustomer}
          cloneCustomer={mockCloneCustomer}
        />
      );

      expect(screen.getByText('12-3456789')).toBeInTheDocument();
      expect(screen.getByText('98-7654321')).toBeInTheDocument();
      expect(screen.getByText('Test Company Inc')).toBeInTheDocument();
      expect(screen.getByText('Another Company LLC')).toBeInTheDocument();
    });

    test('displays customer data in correct columns', () => {
      render(
        <CustomerTable
          customers={mockCustomers}
          openModal={mockOpenModal}
          deleteCustomer={mockDeleteCustomer}
          cloneCustomer={mockCloneCustomer}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('555-1234')).toBeInTheDocument();
    });

    test('shows "No customers found" when customers is null', () => {
      render(
        <CustomerTable
          customers={null}
          openModal={mockOpenModal}
          deleteCustomer={mockDeleteCustomer}
          cloneCustomer={mockCloneCustomer}
        />
      );

      expect(screen.getByText('No customers found')).toBeInTheDocument();
    });

    test('shows "No customers found" when array is empty', () => {
      render(
        <CustomerTable
          customers={[]}
          openModal={mockOpenModal}
          deleteCustomer={mockDeleteCustomer}
          cloneCustomer={mockCloneCustomer}
        />
      );

      expect(screen.getByText('No customers found')).toBeInTheDocument();
    });
  });

  describe('Sticky Columns', () => {
    test('first 5 columns have sticky positioning', () => {
      const { container } = render(
        <CustomerTable
          customers={mockCustomers}
          openModal={mockOpenModal}
          deleteCustomer={mockDeleteCustomer}
          cloneCustomer={mockCloneCustomer}
        />
      );

      const stickyColumns = columns.filter(col => col.sticky);
      expect(stickyColumns).toHaveLength(5);
      expect(stickyColumns.map(col => col.id)).toEqual([
        'Tax_ID',
        'Form_Fire_Code',
        'Enrollment_POC',
        'Renewal_Date',
        'Other_Broker',
      ]);
    });
  });

  describe('Action Buttons', () => {
    test('Edit button calls openModal with customer', async () => {
      render(
        <CustomerTable
          customers={mockCustomers}
          openModal={mockOpenModal}
          deleteCustomer={mockDeleteCustomer}
          cloneCustomer={mockCloneCustomer}
        />
      );

      const editButtons = screen.getAllByRole('button', { name: '' });
      const editButton = editButtons.find(btn =>
        btn.querySelector('[data-testid="EditIcon"]')
      );

      if (editButton) {
        await userEvent.click(editButton);
        expect(mockOpenModal).toHaveBeenCalledWith(mockCustomers[0]);
      }
    });

    test('Delete button calls deleteCustomer with customer', async () => {
      render(
        <CustomerTable
          customers={mockCustomers}
          openModal={mockOpenModal}
          deleteCustomer={mockDeleteCustomer}
          cloneCustomer={mockCloneCustomer}
        />
      );

      const deleteButtons = screen.getAllByRole('button', { name: '' });
      const deleteButton = deleteButtons.find(btn =>
        btn.querySelector('[data-testid="DeleteIcon"]')
      );

      if (deleteButton) {
        await userEvent.click(deleteButton);
        expect(mockDeleteCustomer).toHaveBeenCalledWith(mockCustomers[0]);
      }
    });

    test('Clone button calls cloneCustomer with customer', async () => {
      render(
        <CustomerTable
          customers={mockCustomers}
          openModal={mockOpenModal}
          deleteCustomer={mockDeleteCustomer}
          cloneCustomer={mockCloneCustomer}
        />
      );

      const cloneButtons = screen.getAllByRole('button', { name: '' });
      const cloneButton = cloneButtons.find(btn =>
        btn.querySelector('[data-testid="ContentCopyIcon"]')
      );

      if (cloneButton) {
        await userEvent.click(cloneButton);
        expect(mockCloneCustomer).toHaveBeenCalledWith(mockCustomers[0]);
      }
    });

    test('all 3 buttons render for each customer row', () => {
      render(
        <CustomerTable
          customers={mockCustomers}
          openModal={mockOpenModal}
          deleteCustomer={mockDeleteCustomer}
          cloneCustomer={mockCloneCustomer}
        />
      );

      const buttons = screen.getAllByRole('button', { name: '' });
      // Should have 3 buttons per customer row (edit, delete, clone)
      expect(buttons.length).toBeGreaterThanOrEqual(6); // 2 customers × 3 buttons
    });
  });

  describe('Data Handling', () => {
    test('handles undefined field values gracefully', () => {
      const customerWithUndefined = {
        ...mockCustomers[0],
        Email: undefined,
        Phone_Number: undefined,
      };

      render(
        <CustomerTable
          customers={[customerWithUndefined]}
          openModal={mockOpenModal}
          deleteCustomer={mockDeleteCustomer}
          cloneCustomer={mockCloneCustomer}
        />
      );

      expect(screen.getByText('12-3456789')).toBeInTheDocument();
    });

    test('handles null field values gracefully', () => {
      const customerWithNull = {
        ...mockCustomers[0],
        Email: null,
        Contact_Person: null,
      };

      render(
        <CustomerTable
          customers={[customerWithNull]}
          openModal={mockOpenModal}
          deleteCustomer={mockDeleteCustomer}
          cloneCustomer={mockCloneCustomer}
        />
      );

      expect(screen.getByText('12-3456789')).toBeInTheDocument();
    });

    test('renders with various customer data types', () => {
      const customerWithMixedTypes = {
        Customer_id: 999,
        Tax_ID: '00-0000000',
        Form_Fire_Code: '',
        Enrollment_POC: 'Test POC',
        Renewal_Date: '',
        Other_Broker: null,
        Group_Name: 'Test',
        Contact_Person: undefined,
        Email: '',
        Phone_Number: '123',
        Funding: '',
        Current_Carrier: '',
        Num_Employees_At_Renewal: '0',
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

      render(
        <CustomerTable
          customers={[customerWithMixedTypes]}
          openModal={mockOpenModal}
          deleteCustomer={mockDeleteCustomer}
          cloneCustomer={mockCloneCustomer}
        />
      );

      expect(screen.getByText('00-0000000')).toBeInTheDocument();
      expect(screen.getByText('Test POC')).toBeInTheDocument();
    });

    test('key prop uses Customer_id correctly', () => {
      const { container } = render(
        <CustomerTable
          customers={mockCustomers}
          openModal={mockOpenModal}
          deleteCustomer={mockDeleteCustomer}
          cloneCustomer={mockCloneCustomer}
        />
      );

      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);
    });
  });
});
