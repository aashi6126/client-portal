import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Toolbar,
  Typography,
  Tabs,
  Tab,
  Paper,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import MenuItem from '@mui/material/MenuItem';

// Import new components
import Dashboard from './components/Dashboard';
import ClientTable from './components/ClientTable';
import ClientModal from './components/ClientModal';
import BenefitsTable from './components/BenefitsTable';
import BenefitsModal from './components/BenefitsModal';
import CommercialTable from './components/CommercialTable';
import CommercialModal from './components/CommercialModal';

// API URLs
const API_CLIENTS = '/api/clients';
const API_BENEFITS = '/api/benefits';
const API_COMMERCIAL = '/api/commercial';
const API_FEEDBACK = '/api/feedback';

function NewApp() {
  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Data states
  const [clients, setClients] = useState([]);
  const [benefits, setBenefits] = useState([]);
  const [commercial, setCommercial] = useState([]);

  // Backend health state
  const [apiStatus, setApiStatus] = useState('checking'); // 'up', 'down', 'checking'

  useEffect(() => {
    const checkHealth = () => {
      axios.get('/api/health', { timeout: 5000 })
        .then(() => setApiStatus('up'))
        .catch(() => setApiStatus('down'));
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Modal states for Clients
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [currentClient, setCurrentClient] = useState(null);

  // Modal states for Benefits
  const [benefitsModalOpen, setBenefitsModalOpen] = useState(false);
  const [currentBenefit, setCurrentBenefit] = useState(null);

  // Modal states for Commercial
  const [commercialModalOpen, setCommercialModalOpen] = useState(false);
  const [currentCommercial, setCurrentCommercial] = useState(null);

  // Delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    type: null,
    item: null
  });

  // Search states
  const [clientSearch, setClientSearch] = useState('');
  const [benefitsSearch, setBenefitsSearch] = useState('');
  const [commercialSearch, setCommercialSearch] = useState('');

  // Import/Export states
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  // Data version counter — incremented on every data change to trigger Dashboard refresh
  const [dataVersion, setDataVersion] = useState(0);

  // Feedback state
  const [feedback, setFeedback] = useState([]);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackData, setFeedbackData] = useState({ type: 'Bug', subject: '', description: '' });

  // Fetch data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch all data
  const fetchAllData = () => {
    fetchClients();
    fetchBenefits();
    fetchCommercial();
    fetchFeedback();
  };

  // ========== CLIENT OPERATIONS ==========

  const fetchClients = () => {
    axios.get(API_CLIENTS)
      .then(response => {
        setClients(response.data.clients || []);
      })
      .catch(error => console.error('Error fetching clients:', error));
  };

  const openClientModal = (client = null) => {
    setCurrentClient(client);
    setClientModalOpen(true);
  };

  const saveClient = (clientData) => {
    if (clientData.id) {
      // Update existing client
      axios.put(`${API_CLIENTS}/${clientData.id}`, clientData)
        .then(() => {
          setClientModalOpen(false);
          fetchClients();
          setDataVersion(v => v + 1);
        })
        .catch(error => console.error('Error updating client:', error));
    } else {
      // Create new client
      axios.post(API_CLIENTS, clientData)
        .then(() => {
          setClientModalOpen(false);
          fetchClients();
          setDataVersion(v => v + 1);
        })
        .catch(error => console.error('Error creating client:', error));
    }
  };

  const deleteClient = (client) => {
    setDeleteDialog({ open: true, type: 'client', item: client });
  };

  const cloneClient = (client) => {
    axios.post(`${API_CLIENTS}/${client.id}/clone`)
      .then(() => {
        fetchClients();
        setDataVersion(v => v + 1);
      })
      .catch(error => console.error('Error cloning client:', error));
  };

  // ========== BENEFITS OPERATIONS ==========

  const fetchBenefits = () => {
    axios.get(API_BENEFITS)
      .then(response => {
        setBenefits(response.data.benefits || []);
      })
      .catch(error => console.error('Error fetching benefits:', error));
  };

  const openBenefitsModal = (benefit = null) => {
    setCurrentBenefit(benefit);
    setBenefitsModalOpen(true);
  };

  const saveBenefit = (benefitData) => {
    if (benefitData.id) {
      // Update existing benefit
      axios.put(`${API_BENEFITS}/${benefitData.id}`, benefitData)
        .then(() => {
          setBenefitsModalOpen(false);
          fetchBenefits();
          setDataVersion(v => v + 1);
        })
        .catch(error => {
          console.error('Error updating benefit:', error);
          alert('Error updating benefit: ' + (error.response?.data?.error || error.message));
        });
    } else {
      // Create new benefit
      axios.post(API_BENEFITS, benefitData)
        .then(() => {
          setBenefitsModalOpen(false);
          fetchBenefits();
          setDataVersion(v => v + 1);
        })
        .catch(error => {
          console.error('Error creating benefit:', error);
          alert('Error creating benefit: ' + (error.response?.data?.error || error.message));
        });
    }
  };

  const deleteBenefit = (benefit) => {
    setDeleteDialog({ open: true, type: 'benefit', item: benefit });
  };

  const cloneBenefit = (benefit) => {
    axios.post(`${API_BENEFITS}/${benefit.id}/clone`)
      .then(() => {
        fetchBenefits();
        setDataVersion(v => v + 1);
      })
      .catch(error => console.error('Error cloning benefit:', error));
  };

  // ========== COMMERCIAL OPERATIONS ==========

  const fetchCommercial = () => {
    axios.get(API_COMMERCIAL)
      .then(response => {
        setCommercial(response.data.commercial || []);
      })
      .catch(error => console.error('Error fetching commercial:', error));
  };

  const openCommercialModal = (commercialRecord = null) => {
    setCurrentCommercial(commercialRecord);
    setCommercialModalOpen(true);
  };

  const saveCommercial = (commercialData) => {
    if (commercialData.id) {
      // Update existing commercial
      axios.put(`${API_COMMERCIAL}/${commercialData.id}`, commercialData)
        .then(() => {
          setCommercialModalOpen(false);
          fetchCommercial();
          setDataVersion(v => v + 1);
        })
        .catch(error => console.error('Error updating commercial:', error));
    } else {
      // Create new commercial
      axios.post(API_COMMERCIAL, commercialData)
        .then(() => {
          setCommercialModalOpen(false);
          fetchCommercial();
          setDataVersion(v => v + 1);
        })
        .catch(error => console.error('Error creating commercial:', error));
    }
  };

  const deleteCommercial = (commercialRecord) => {
    setDeleteDialog({ open: true, type: 'commercial', item: commercialRecord });
  };

  const cloneCommercial = (commercialRecord) => {
    axios.post(`${API_COMMERCIAL}/${commercialRecord.id}/clone`)
      .then(() => {
        fetchCommercial();
        setDataVersion(v => v + 1);
      })
      .catch(error => console.error('Error cloning commercial:', error));
  };

  // ========== DELETE CONFIRMATION ==========

  const confirmDelete = () => {
    const { type, item } = deleteDialog;

    if (type === 'client') {
      axios.delete(`${API_CLIENTS}/${item.id}`)
        .then(() => {
          fetchClients();
          // Also refresh benefits and commercial as they may cascade delete
          fetchBenefits();
          fetchCommercial();
          setDataVersion(v => v + 1);
        })
        .catch(error => console.error('Error deleting client:', error));
    } else if (type === 'benefit') {
      axios.delete(`${API_BENEFITS}/${item.id}`)
        .then(() => {
          fetchBenefits();
          setDataVersion(v => v + 1);
        })
        .catch(error => console.error('Error deleting benefit:', error));
    } else if (type === 'commercial') {
      axios.delete(`${API_COMMERCIAL}/${item.id}`)
        .then(() => {
          fetchCommercial();
          setDataVersion(v => v + 1);
        })
        .catch(error => console.error('Error deleting commercial:', error));
    } else if (type === 'feedback') {
      axios.delete(`${API_FEEDBACK}/${item.id}`)
        .then(() => {
          fetchFeedback();
        })
        .catch(error => console.error('Error deleting feedback:', error));
    }

    setDeleteDialog({ open: false, type: null, item: null });
  };

  const cancelDelete = () => {
    setDeleteDialog({ open: false, type: null, item: null });
  };

  // ========== TAB CHANGE ==========

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // ========== SEARCH FILTERS ==========

  const filterClients = () => {
    if (!clientSearch) return clients;
    return clients.filter(client =>
      Object.values(client).some(val =>
        val && val.toString().toLowerCase().includes(clientSearch.toLowerCase())
      )
    );
  };

  const filterBenefits = () => {
    if (!benefitsSearch) return benefits;
    return benefits.filter(benefit =>
      Object.values(benefit).some(val =>
        val && val.toString().toLowerCase().includes(benefitsSearch.toLowerCase())
      )
    );
  };

  const filterCommercial = () => {
    if (!commercialSearch) return commercial;
    return commercial.filter(comm =>
      Object.values(comm).some(val =>
        val && val.toString().toLowerCase().includes(commercialSearch.toLowerCase())
      )
    );
  };

  // ========== IMPORT/EXPORT OPERATIONS ==========

  const handleExport = async () => {
    try {
      const response = await axios.get('/api/export', {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // Get filename from response headers or use default
      const contentDisposition = response.headers['content-disposition'];
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `Client_Data_Export_${new Date().toISOString().slice(0,10)}.xlsx`;

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const { stats, errors_file, errors_filename } = response.data;
      let message = 'Import completed!\n\n';
      message += `Clients: ${stats.clients_created} created, ${stats.clients_updated} updated\n`;
      message += `Benefits: ${stats.benefits_created} created, ${stats.benefits_updated} updated\n`;
      message += `Commercial: ${stats.commercial_created} created, ${stats.commercial_updated} updated`;

      if (stats.errors && stats.errors.length > 0) {
        message += `\n\n${stats.errors.length} row(s) had errors.`;
        if (errors_file) {
          message += '\nAn errors file has been downloaded with details.';
        }
      }

      // Download errors file if present
      if (errors_file) {
        const byteCharacters = atob(errors_file);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = errors_filename || 'Import_Errors.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      alert(message);
      fetchAllData();
      setDataVersion(v => v + 1);
    } catch (error) {
      console.error('Import error:', error);
      alert('Import failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setImporting(false);
      event.target.value = '';  // Reset file input
    }
  };

  // ========== FEEDBACK OPERATIONS ==========

  const fetchFeedback = () => {
    axios.get(API_FEEDBACK)
      .then(response => {
        setFeedback(response.data.feedback || []);
      })
      .catch(error => console.error('Error fetching feedback:', error));
  };

  const handleFeedbackSubmit = () => {
    axios.post(API_FEEDBACK, feedbackData)
      .then(() => {
        setFeedbackModalOpen(false);
        setFeedbackData({ type: 'Bug', subject: '', description: '' });
        fetchFeedback();
      })
      .catch(error => console.error('Error creating feedback:', error));
  };

  const updateFeedbackStatus = (id, status) => {
    axios.put(`${API_FEEDBACK}/${id}`, { status })
      .then(() => fetchFeedback())
      .catch(error => console.error('Error updating feedback:', error));
  };

  const deleteFeedbackItem = (item) => {
    setDeleteDialog({ open: true, type: 'feedback', item });
  };

  return (
    <Box>
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
      />

      {/* Header */}
      <AppBar position="static" sx={{ background: 'linear-gradient(to left, #000000, #434343)' }}>
        <Container maxWidth="xl">
          <Toolbar sx={{ minHeight: '48px', py: 1, px: 0 }}>
            <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              Client Hub
              <Tooltip title={apiStatus === 'up' ? 'API Connected' : apiStatus === 'down' ? 'API Disconnected' : 'Checking...'}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: apiStatus === 'up' ? '#4caf50' : apiStatus === 'down' ? '#f44336' : '#ff9800',
                    boxShadow: apiStatus === 'up' ? '0 0 6px #4caf50' : apiStatus === 'down' ? '0 0 6px #f44336' : 'none',
                  }}
                />
              </Tooltip>
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<FileUploadIcon />}
                onClick={handleImportClick}
                disabled={importing}
                size="small"
              >
                {importing ? 'Importing...' : 'Import'}
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<FileDownloadIcon />}
                onClick={handleExport}
                size="small"
              >
                Export
              </Button>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Container maxWidth="xl">
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Dashboard" />
            <Tab label="Clients" />
            <Tab label="Employee Benefits" />
            <Tab label="Commercial Insurance" />
            <Tab label="Feedback" />
          </Tabs>
        </Box>

        {/* Tab 0: Dashboard */}
        {activeTab === 0 && (
          <Dashboard
            onOpenBenefitsModal={openBenefitsModal}
            onOpenCommercialModal={openCommercialModal}
            onNavigateToTab={setActiveTab}
            dataVersion={dataVersion}
          />
        )}

        {/* Tab 1: Clients */}
        {activeTab === 1 && (
          <Box mt={2}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6">
                  Clients ({filterClients().length} of {clients.length})
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => openClientModal()}
                >
                  Add Client
                </Button>
              </Stack>
              <TextField
                label="Search clients..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                variant="outlined"
                size="small"
                fullWidth
              />
            </Paper>
            <ClientTable
              clients={filterClients()}
              onEdit={openClientModal}
              onDelete={deleteClient}
            />
          </Box>
        )}

        {/* Tab 2: Employee Benefits */}
        {activeTab === 2 && (
          <Box mt={2}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6">
                  Employee Benefits ({filterBenefits().length} of {benefits.length})
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => openBenefitsModal()}
                >
                  Add New Benefits
                </Button>
              </Stack>
              <TextField
                label="Search benefits..."
                value={benefitsSearch}
                onChange={(e) => setBenefitsSearch(e.target.value)}
                variant="outlined"
                size="small"
                fullWidth
              />
            </Paper>
            <BenefitsTable
              benefits={filterBenefits()}
              onEdit={openBenefitsModal}
              onDelete={deleteBenefit}
            />
          </Box>
        )}

        {/* Tab 3: Commercial Insurance */}
        {activeTab === 3 && (
          <Box mt={2}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6">
                  Commercial Insurance ({filterCommercial().length} of {commercial.length})
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => openCommercialModal()}
                >
                  Add New Commercial
                </Button>
              </Stack>
              <TextField
                label="Search commercial..."
                value={commercialSearch}
                onChange={(e) => setCommercialSearch(e.target.value)}
                variant="outlined"
                size="small"
                fullWidth
              />
            </Paper>
            <CommercialTable
              commercial={filterCommercial()}
              onEdit={openCommercialModal}
              onDelete={deleteCommercial}
            />
          </Box>
        )}

        {/* Tab 4: Feedback */}
        {activeTab === 4 && (
          <Box mt={2}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                <Typography variant="h6">
                  Feedback ({feedback.length})
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => setFeedbackModalOpen(true)}
                >
                  Add Feedback
                </Button>
              </Stack>
            </Paper>
            <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 250px)' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: 80 }}>Actions</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: 100 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: 200 }}>Subject</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: 300 }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: 130 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: 130 }}>Created</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {feedback.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No feedback items yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    feedback.map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => deleteFeedbackItem(item)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.type}
                            size="small"
                            color={item.type === 'Bug' ? 'error' : 'info'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{item.subject}</TableCell>
                        <TableCell>
                          {item.description && item.description.length > 80 ? (
                            <Tooltip title={item.description} arrow>
                              <span>{item.description.substring(0, 77)}...</span>
                            </Tooltip>
                          ) : (
                            item.description || <span style={{ color: '#999' }}>--</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <TextField
                            select
                            value={item.status}
                            onChange={(e) => updateFeedbackStatus(item.id, e.target.value)}
                            size="small"
                            sx={{ minWidth: 120 }}
                          >
                            <MenuItem value="New">New</MenuItem>
                            <MenuItem value="In Progress">In Progress</MenuItem>
                            <MenuItem value="Fixed">Fixed</MenuItem>
                          </TextField>
                        </TableCell>
                        <TableCell>
                          {item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', {
                            month: '2-digit', day: '2-digit', year: 'numeric'
                          }) : '--'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Container>

      {/* Modals */}
      <ClientModal
        open={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        client={currentClient}
        onSave={saveClient}
      />

      <BenefitsModal
        open={benefitsModalOpen}
        onClose={() => setBenefitsModalOpen(false)}
        benefit={currentBenefit}
        onSave={saveBenefit}
        clients={currentBenefit ? clients : clients.filter(c => !benefits.some(b => b.tax_id === c.tax_id))}
      />

      <CommercialModal
        open={commercialModalOpen}
        onClose={() => setCommercialModalOpen(false)}
        commercial={currentCommercial}
        onSave={saveCommercial}
        clients={currentCommercial ? clients : clients.filter(c => !commercial.some(cm => cm.tax_id === c.tax_id))}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={cancelDelete}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this {deleteDialog.type}?
            {deleteDialog.type === 'client' && (
              <Box sx={{ mt: 2, p: 1, backgroundColor: '#fff3cd', borderRadius: 1 }}>
                <Typography variant="body2" color="warning.dark">
                  <strong>Warning:</strong> Deleting this client will also delete all associated Employee Benefits and Commercial Insurance records.
                </Typography>
              </Box>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} color="inherit">
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Feedback Dialog */}
      <Dialog
        open={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Feedback</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Report a bug or request a feature.
          </DialogContentText>
          <TextField
            label="Type"
            select
            value={feedbackData.type}
            onChange={(e) => setFeedbackData({ ...feedbackData, type: e.target.value })}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
          >
            <MenuItem value="Bug">Bug Report</MenuItem>
            <MenuItem value="Feature Request">Feature Request</MenuItem>
          </TextField>
          <TextField
            label="Subject"
            value={feedbackData.subject}
            onChange={(e) => setFeedbackData({ ...feedbackData, subject: e.target.value })}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
          />
          <TextField
            label="Description"
            value={feedbackData.description}
            onChange={(e) => setFeedbackData({ ...feedbackData, description: e.target.value })}
            fullWidth
            size="small"
            multiline
            rows={4}
            placeholder="Please describe the bug or feature in detail..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setFeedbackModalOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleFeedbackSubmit}
            variant="contained"
            color="primary"
            disabled={!feedbackData.subject.trim()}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default NewApp;
