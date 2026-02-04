// Mock axios for testing
const axios = {
  get: jest.fn(() => Promise.resolve({ data: { customers: [] } })),
  post: jest.fn(() => Promise.resolve({ data: { success: true } })),
  put: jest.fn(() => Promise.resolve({ data: { success: true } })),
  delete: jest.fn(() => Promise.resolve({ data: { success: true } })),
};

export default axios;
