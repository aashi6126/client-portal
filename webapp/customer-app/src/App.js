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
import PersonalTable from './components/PersonalTable';
import PersonalModal from './components/PersonalModal';
import IndividualTable from './components/IndividualTable';
import IndividualModal from './components/IndividualModal';
import PocManagement from './components/PocManagement';
import ChatBubble from './components/ChatBubble';

// API URLs
const API_CLIENTS = '/api/clients';
const API_INDIVIDUALS = '/api/individuals';
const API_BENEFITS = '/api/benefits';
const API_COMMERCIAL = '/api/commercial';
const API_PERSONAL = '/api/personal';
const API_FEEDBACK = '/api/feedback';

function NewApp() {
  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Data states
  const [clients, setClients] = useState([]);
  const [individuals, setIndividuals] = useState([]);
  const [benefits, setBenefits] = useState([]);
  const [commercial, setCommercial] = useState([]);
  const [personal, setPersonal] = useState([]);

  // Backend health state
  const [apiStatus, setApiStatus] = useState('checking'); // 'up', 'down', 'checking'
  const [backupStatus, setBackupStatus] = useState({ status: 'checking', last_heartbeat: null });

  useEffect(() => {
    const checkHealth = () => {
      axios.get('/api/health', { timeout: 5000 })
        .then(() => setApiStatus('up'))
        .catch(() => setApiStatus('down'));
      axios.get('/api/backup/status', { timeout: 5000 })
        .then(res => setBackupStatus(res.data))
        .catch(() => setBackupStatus({ status: 'down', last_heartbeat: null }));
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Modal states for Clients
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [currentClient, setCurrentClient] = useState(null);

  // Modal states for Individuals
  const [individualModalOpen, setIndividualModalOpen] = useState(false);
  const [currentIndividual, setCurrentIndividual] = useState(null);

  // Modal states for Benefits
  const [benefitsModalOpen, setBenefitsModalOpen] = useState(false);
  const [currentBenefit, setCurrentBenefit] = useState(null);
  const [benefitInitialTab, setBenefitInitialTab] = useState(null);

  // Modal states for Commercial
  const [commercialModalOpen, setCommercialModalOpen] = useState(false);
  const [currentCommercial, setCurrentCommercial] = useState(null);
  const [commercialInitialTab, setCommercialInitialTab] = useState(null);

  // Modal states for Personal
  const [personalModalOpen, setPersonalModalOpen] = useState(false);
  const [currentPersonal, setCurrentPersonal] = useState(null);
  const [personalInitialTab, setPersonalInitialTab] = useState(null);

  // Delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    type: null,
    item: null
  });

  // Search states
  const [clientSearch, setClientSearch] = useState('');
  const [individualSearch, setIndividualSearch] = useState('');
  const [benefitsSearch, setBenefitsSearch] = useState('');
  const [commercialSearch, setCommercialSearch] = useState('');
  const [personalSearch, setPersonalSearch] = useState('');

  // Admin mode — enable via ?admin=true in URL
  const isAdmin = new URLSearchParams(window.location.search).get('admin') === 'true';

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
    fetchIndividuals();
    fetchBenefits();
    fetchCommercial();
    fetchPersonal();
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
          fetchBenefits();
          fetchCommercial();
          fetchPersonal();
          setDataVersion(v => v + 1);
        })
        .catch(error => {
          console.error('Error updating client:', error);
          alert('Error updating client: ' + (error.response?.data?.error || error.message));
        });
    } else {
      // Create new client
      axios.post(API_CLIENTS, clientData)
        .then(() => {
          setClientModalOpen(false);
          fetchClients();
          setDataVersion(v => v + 1);
        })
        .catch(error => {
          console.error('Error creating client:', error);
          alert('Error creating client: ' + (error.response?.data?.error || error.message));
        });
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

  // ========== INDIVIDUAL OPERATIONS ==========

  const fetchIndividuals = () => {
    axios.get(API_INDIVIDUALS)
      .then(response => {
        setIndividuals(response.data.individuals || []);
      })
      .catch(error => console.error('Error fetching individuals:', error));
  };

  const openIndividualModal = (individual = null) => {
    setCurrentIndividual(individual);
    setIndividualModalOpen(true);
  };

  const saveIndividual = (individualData) => {
    if (individualData.id) {
      axios.put(`${API_INDIVIDUALS}/${individualData.id}`, individualData)
        .then(() => {
          setIndividualModalOpen(false);
          fetchIndividuals();
          setDataVersion(v => v + 1);
        })
        .catch(error => console.error('Error updating individual:', error));
    } else {
      axios.post(API_INDIVIDUALS, individualData)
        .then(() => {
          setIndividualModalOpen(false);
          fetchIndividuals();
          setDataVersion(v => v + 1);
        })
        .catch(error => console.error('Error creating individual:', error));
    }
  };

  const deleteIndividual = (individual) => {
    setDeleteDialog({ open: true, type: 'individual', item: individual });
  };

  // ========== BENEFITS OPERATIONS ==========

  const fetchBenefits = () => {
    axios.get(API_BENEFITS)
      .then(response => {
        setBenefits(response.data.benefits || []);
      })
      .catch(error => console.error('Error fetching benefits:', error));
  };

  const openBenefitsModal = (benefit = null, coveragePrefix = null) => {
    setCurrentBenefit(benefit);
    setBenefitInitialTab(coveragePrefix);
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

  const openCommercialModal = (commercialRecord = null, coveragePrefix = null) => {
    setCurrentCommercial(commercialRecord);
    setCommercialInitialTab(coveragePrefix);
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
        .catch(error => {
          console.error('Error updating commercial:', error);
          alert('Error updating commercial: ' + (error.response?.data?.error || error.message));
        });
    } else {
      // Create new commercial
      axios.post(API_COMMERCIAL, commercialData)
        .then(() => {
          setCommercialModalOpen(false);
          fetchCommercial();
          setDataVersion(v => v + 1);
        })
        .catch(error => {
          console.error('Error creating commercial:', error);
          alert('Error creating commercial: ' + (error.response?.data?.error || error.message));
        });
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

  // ========== PERSONAL OPERATIONS ==========

  const fetchPersonal = () => {
    axios.get(API_PERSONAL)
      .then(response => {
        setPersonal(response.data.personal || []);
      })
      .catch(error => console.error('Error fetching personal:', error));
  };

  const openPersonalModal = (personalRecord = null, coveragePrefix = null) => {
    setCurrentPersonal(personalRecord);
    setPersonalInitialTab(coveragePrefix);
    setPersonalModalOpen(true);
  };

  const savePersonal = (personalData) => {
    if (personalData.id) {
      axios.put(`${API_PERSONAL}/${personalData.id}`, personalData)
        .then(() => {
          setPersonalModalOpen(false);
          fetchPersonal();
          setDataVersion(v => v + 1);
        })
        .catch(error => {
          console.error('Error updating personal:', error);
          alert('Error updating personal: ' + (error.response?.data?.error || error.message));
        });
    } else {
      axios.post(API_PERSONAL, personalData)
        .then(() => {
          setPersonalModalOpen(false);
          fetchPersonal();
          setDataVersion(v => v + 1);
        })
        .catch(error => {
          console.error('Error creating personal:', error);
          alert('Error creating personal: ' + (error.response?.data?.error || error.message));
        });
    }
  };

  const deletePersonal = (personalRecord) => {
    setDeleteDialog({ open: true, type: 'personal', item: personalRecord });
  };

  const clonePersonal = (personalRecord) => {
    axios.post(`${API_PERSONAL}/${personalRecord.id}/clone`)
      .then(() => {
        fetchPersonal();
        setDataVersion(v => v + 1);
      })
      .catch(error => console.error('Error cloning personal:', error));
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
          fetchPersonal();
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
    } else if (type === 'individual') {
      axios.delete(`${API_INDIVIDUALS}/${item.id}`)
        .then(() => {
          fetchIndividuals();
          fetchPersonal();
          setDataVersion(v => v + 1);
        })
        .catch(error => console.error('Error deleting individual:', error));
    } else if (type === 'personal') {
      axios.delete(`${API_PERSONAL}/${item.id}`)
        .then(() => {
          fetchPersonal();
          setDataVersion(v => v + 1);
        })
        .catch(error => console.error('Error deleting personal:', error));
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

  const filterIndividuals = () => {
    if (!individualSearch) return individuals;
    return individuals.filter(ind =>
      Object.values(ind).some(val =>
        val && val.toString().toLowerCase().includes(individualSearch.toLowerCase())
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

  const filterPersonal = () => {
    if (!personalSearch) return personal;
    return personal.filter(pers =>
      Object.values(pers).some(val =>
        val && val.toString().toLowerCase().includes(personalSearch.toLowerCase())
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

    const confirmed = window.confirm(
      'Warning: Importing will replace ALL current data with the data from the spreadsheet. This action cannot be undone.\n\nDo you want to continue?'
    );
    if (!confirmed) {
      event.target.value = '';
      return;
    }

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
      message += `Clients: ${stats.clients_created} created\n`;
      message += `Individuals: ${stats.individuals_created} created\n`;
      message += `Benefits: ${stats.benefits_created} created\n`;
      message += `Commercial: ${stats.commercial_created} created\n`;
      message += `Personal: ${stats.personal_created} created`;

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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: apiStatus === 'up' ? '#4caf50' : apiStatus === 'down' ? '#f44336' : '#ff9800',
                      boxShadow: apiStatus === 'up' ? '0 0 6px #4caf50' : apiStatus === 'down' ? '0 0 6px #f44336' : 'none',
                    }}
                  />
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', opacity: 0.85 }}>API</Typography>
                </Box>
              </Tooltip>
              <Tooltip title={
                backupStatus.status === 'ok'
                  ? `Backup scheduler running (last heartbeat: ${backupStatus.last_heartbeat ? new Date(backupStatus.last_heartbeat).toLocaleString() : 'unknown'})`
                  : backupStatus.status === 'down'
                    ? `Backup scheduler down — ${backupStatus.reason || 'no recent heartbeat'}`
                    : 'Checking backup scheduler...'
              }>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: backupStatus.status === 'ok' ? '#4caf50' : backupStatus.status === 'down' ? '#f44336' : '#ff9800',
                      boxShadow: backupStatus.status === 'ok' ? '0 0 6px #4caf50' : backupStatus.status === 'down' ? '0 0 6px #f44336' : 'none',
                    }}
                  />
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', opacity: 0.85 }}>Backup</Typography>
                </Box>
              </Tooltip>
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<FileUploadIcon />}
                onClick={handleImportClick}
                disabled={!isAdmin || importing}
                size="small"
              >
                {importing ? 'Importing...' : 'Import'}
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<FileDownloadIcon />}
                onClick={handleExport}
                disabled={!isAdmin}
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
            <Tab label="Individuals" />
            <Tab label="Employee Benefits" />
            <Tab label="Commercial Insurance" />
            <Tab label="Personal Insurance" />
            <Tab label="PoC Management" />
            <Tab label="Feedback" />
          </Tabs>
        </Box>

        {/* Tab 0: Dashboard */}
        {activeTab === 0 && (
          <Dashboard
            clients={clients}
            benefits={benefits}
            commercial={commercial}
            personal={personal}
            onOpenBenefitsModal={openBenefitsModal}
            onOpenCommercialModal={openCommercialModal}
            onOpenPersonalModal={openPersonalModal}
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

        {/* Tab 2: Individuals */}
        {activeTab === 2 && (
          <Box mt={2}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6">
                  Individuals ({filterIndividuals().length} of {individuals.length})
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => openIndividualModal()}
                >
                  Add Individual
                </Button>
              </Stack>
              <TextField
                label="Search individuals..."
                value={individualSearch}
                onChange={(e) => setIndividualSearch(e.target.value)}
                variant="outlined"
                size="small"
                fullWidth
              />
            </Paper>
            <IndividualTable
              individuals={filterIndividuals()}
              onEdit={openIndividualModal}
              onDelete={deleteIndividual}
            />
          </Box>
        )}

        {/* Tab 3: Employee Benefits */}
        {activeTab === 3 && (
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

        {/* Tab 4: Commercial Insurance */}
        {activeTab === 4 && (
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

        {/* Tab 5: Personal Insurance */}
        {activeTab === 5 && (
          <Box mt={2}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6">
                  Personal Insurance ({filterPersonal().length} of {personal.length})
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => openPersonalModal()}
                >
                  Add New Personal
                </Button>
              </Stack>
              <TextField
                label="Search personal..."
                value={personalSearch}
                onChange={(e) => setPersonalSearch(e.target.value)}
                variant="outlined"
                size="small"
                fullWidth
              />
            </Paper>
            <PersonalTable
              personal={filterPersonal()}
              onEdit={openPersonalModal}
              onDelete={deletePersonal}
            />
          </Box>
        )}

        {/* Tab 6: PoC Management */}
        {activeTab === 6 && (
          <PocManagement dataVersion={dataVersion} />
        )}

        {/* Tab 7: Feedback */}
        {activeTab === 7 && (
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
        initialCoverageTab={benefitInitialTab}
      />

      <CommercialModal
        open={commercialModalOpen}
        onClose={() => setCommercialModalOpen(false)}
        commercial={currentCommercial}
        onSave={saveCommercial}
        clients={currentCommercial ? clients : clients.filter(c => !commercial.some(cm => cm.tax_id === c.tax_id))}
        initialCoverageTab={commercialInitialTab}
      />

      <PersonalModal
        open={personalModalOpen}
        onClose={() => setPersonalModalOpen(false)}
        personal={currentPersonal}
        onSave={savePersonal}
        individuals={currentPersonal ? individuals : individuals.filter(i => !personal.some(p => p.individual_id === i.individual_id))}
        initialCoverageTab={personalInitialTab}
      />

      <IndividualModal
        open={individualModalOpen}
        onClose={() => setIndividualModalOpen(false)}
        individual={currentIndividual}
        onSave={saveIndividual}
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
            {deleteDialog.type === 'individual' && (
              <Box sx={{ mt: 2, p: 1, backgroundColor: '#fff3cd', borderRadius: 1 }}>
                <Typography variant="body2" color="warning.dark">
                  <strong>Warning:</strong> Deleting this individual will also delete all associated Personal Insurance records.
                </Typography>
              </Box>
            )}
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
      <ChatBubble />
    </Box>
  );
}

export default NewApp;
