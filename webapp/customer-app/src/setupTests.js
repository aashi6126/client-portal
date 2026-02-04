// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock window.confirm and window.alert
global.confirm = jest.fn(() => true);
global.alert = jest.fn();

// Mock XLSX library
jest.mock('xlsx', () => ({
  utils: {
    json_to_sheet: jest.fn(() => ({})),
    book_new: jest.fn(() => ({})),
    book_append_sheet: jest.fn(),
    sheet_to_json: jest.fn(() => []),
  },
  write: jest.fn(() => new ArrayBuffer(0)),
  read: jest.fn(() => ({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } })),
}));

// Mock file-saver library
jest.mock('file-saver', () => ({
  saveAs: jest.fn(),
}));
