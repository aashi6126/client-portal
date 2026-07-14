import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
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
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import SecurityIcon from '@mui/icons-material/Security';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import FeedbackIcon from '@mui/icons-material/Feedback';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ChatIcon from '@mui/icons-material/Chat';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import LogoutIcon from '@mui/icons-material/Logout';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';

import { useAuth } from './AuthContext';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import TaxIdRemap from './components/TaxIdRemap';
import ChangePasswordDialog from './components/ChangePasswordDialog';
import ForcedPasswordChange from './components/ForcedPasswordChange';
import AcceptInvitePage from './components/AcceptInvitePage';

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
import ChatPanel from './components/ChatPanel';
import Invoices from './components/Invoices';
import CobraManagement from './components/CobraManagement';

// API URLs
const API_CLIENTS = '/api/clients';
const API_INDIVIDUALS = '/api/individuals';
const API_BENEFITS = '/api/benefits';
const API_COMMERCIAL = '/api/commercial';
const API_PERSONAL = '/api/personal';
const API_FEEDBACK = '/api/feedback';

const theme = createTheme({
  palette: {
    primary: { main: '#3b5bdb', light: '#5c7cfa', dark: '#364fc7' },
    secondary: { main: '#845ef7', light: '#9775fa', dark: '#7048e8' },
    success: { main: '#2f9e44', light: '#40c057' },
    warning: { main: '#e67700', light: '#f59f00' },
    error: { main: '#e03131', light: '#f03e3e' },
    info: { main: '#1c7ed6', light: '#339af0' },
    background: { default: '#f1f3f9', paper: '#ffffff' },
    text: { primary: '#1a1a2e', secondary: '#6b7280' },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 13,
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700, letterSpacing: -0.5 },
    h5: { fontWeight: 700, letterSpacing: -0.3 },
    h6: { fontWeight: 600, letterSpacing: -0.2 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    body2: { fontSize: '0.8125rem' },
    caption: { fontSize: '0.7rem', color: '#6b7280' },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  shape: { borderRadius: 10 },
  shadows: [
    'none',
    '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
    '0 2px 6px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.08)',
    '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.06)',
    '0 6px 16px rgba(0,0,0,0.1), 0 3px 6px rgba(0,0,0,0.06)',
    ...Array(20).fill('0 8px 24px rgba(0,0,0,0.12)')
  ],
  components: {
    MuiTableCell: {
      styleOverrides: {
        root: { fontSize: '0.8125rem', borderColor: '#f0f0f5' },
        head: { fontWeight: 600, backgroundColor: '#f8f9fc', color: '#4a5568', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: 8, fontWeight: 600 },
        contained: { boxShadow: '0 1px 3px rgba(0,0,0,0.12)' },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 1 },
      styleOverrides: {
        root: { borderRadius: 12, border: '1px solid #eef0f6' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 12, border: '1px solid #eef0f6' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 },
        sizeSmall: { height: 24, fontSize: '0.72rem' },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 500, fontSize: '0.85rem', minHeight: 40 },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 40 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 14 },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: { '& .MuiOutlinedInput-root': { borderRadius: 8 } },
      },
    },
  },
});

function AppShell() {
  const { user, isAdmin, logout, loginEnabled, authDisabled } = useAuth();

  // Change-password dialog
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

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
    <ThemeProvider theme={theme}>
    <CssBaseline />
    <Box sx={{ backgroundColor: '#0f1629', minHeight: '100vh' }}>
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
      />

      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ background: 'linear-gradient(135deg, #0f1629 0%, #1a1f3a 100%)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {authDisabled ? (
          <Box sx={{ backgroundColor: '#b54708', color: '#fff', textAlign: 'center', py: 0.3, fontSize: '0.72rem', fontWeight: 600 }}>
            Authentication is disabled at the server (AUTH_DISABLED=true) — everyone has admin access.
          </Box>
        ) : !loginEnabled ? (
          <Box sx={{ backgroundColor: '#b54708', color: '#fff', textAlign: 'center', py: 0.3, fontSize: '0.72rem', fontWeight: 600 }}>
            Login is disabled — non-admin users are blocked.
          </Box>
        ) : null}
        <Toolbar sx={{ minHeight: 52, px: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.3, mr: 3 }}>
            Client Hub
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title={apiStatus === 'up' ? 'API Connected' : apiStatus === 'down' ? 'API Disconnected' : 'Checking...'}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: apiStatus === 'up' ? '#4caf50' : apiStatus === 'down' ? '#f44336' : '#ff9800' }} />
                <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.7 }}>API</Typography>
              </Box>
            </Tooltip>
            <Tooltip title={
              backupStatus.status === 'ok'
                ? `Backup scheduler running (last heartbeat: ${backupStatus.last_heartbeat ? new Date(backupStatus.last_heartbeat).toLocaleString() : 'unknown'})`
                : backupStatus.status === 'down'
                  ? `Backup scheduler down — ${backupStatus.reason || 'no recent heartbeat'}`
                  : 'Checking backup scheduler...'
            }>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: backupStatus.status === 'ok' ? '#4caf50' : backupStatus.status === 'down' ? '#f44336' : '#ff9800' }} />
                <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.7 }}>Backup</Typography>
              </Box>
            </Tooltip>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Stack direction="row" spacing={0.5}>
            <Button
              variant="text"
              color="inherit"
              startIcon={<FileUploadIcon sx={{ fontSize: '1rem' }} />}
              onClick={handleImportClick}
              disabled={!isAdmin || importing}
              size="small"
              sx={{ fontSize: '0.75rem', textTransform: 'none', opacity: 0.85, '&:hover': { opacity: 1, backgroundColor: 'rgba(255,255,255,0.08)' } }}
            >
              {importing ? 'Importing...' : 'Import'}
            </Button>
            <Button
              variant="text"
              color="inherit"
              startIcon={<FileDownloadIcon sx={{ fontSize: '1rem' }} />}
              onClick={handleExport}
              disabled={!isAdmin}
              size="small"
              sx={{ fontSize: '0.75rem', textTransform: 'none', opacity: 0.85, '&:hover': { opacity: 1, backgroundColor: 'rgba(255,255,255,0.08)' } }}
            >
              Export
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1, pl: 1.5, borderLeft: '1px solid rgba(255,255,255,0.12)' }}>
              <Chip
                label={`${user?.username || ''}${user?.role === 'admin' ? ' • admin' : ''}`}
                size="small"
                sx={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.7rem' }}
              />
              {!authDisabled && (
                <>
                  <Tooltip title="Change password">
                    <IconButton size="small" color="inherit" onClick={() => setChangePasswordOpen(true)} sx={{ opacity: 0.8 }}>
                      <VpnKeyIcon sx={{ fontSize: '1rem' }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Sign out">
                    <IconButton size="small" color="inherit" onClick={logout} sx={{ opacity: 0.8 }}>
                      <LogoutIcon sx={{ fontSize: '1rem' }} />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Box>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex' }}>
        {/* Left Navigation */}
        <Drawer
          variant="permanent"
          sx={{
            width: 200,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 200,
              boxSizing: 'border-box',
              top: 'auto',
              position: 'relative',
              border: 'none',
              backgroundColor: '#0f1629',
              height: 'calc(100vh - 52px)',
              overflow: 'auto',
            },
          }}
        >
          {(() => {
            const navItems = [
              { label: 'Dashboard', icon: <DashboardIcon fontSize="small" />, index: 0 },
              { type: 'divider', label: 'CLIENTS' },
              { label: 'Clients', icon: <BusinessIcon fontSize="small" />, index: 1 },
              { label: 'Benefits', icon: <HealthAndSafetyIcon fontSize="small" />, index: 3 },
              { label: 'Commercial', icon: <SecurityIcon fontSize="small" />, index: 4 },
              { label: 'Invoices', icon: <ReceiptLongIcon fontSize="small" />, index: 8 },
              { type: 'divider', label: 'INDIVIDUALS' },
              { label: 'Individuals', icon: <PeopleIcon fontSize="small" />, index: 2 },
              { label: 'Personal', icon: <PersonIcon fontSize="small" />, index: 5 },
              { label: 'Cobra', icon: <LocalHospitalIcon fontSize="small" />, index: 10 },
              { type: 'divider', label: 'ADMIN' },
              { label: 'PoC Mgmt', icon: <AssignmentIndIcon fontSize="small" />, index: 6 },
              { label: 'Feedback', icon: <FeedbackIcon fontSize="small" />, index: 7 },
              ...(isAdmin ? [{ label: 'Users', icon: <ManageAccountsIcon fontSize="small" />, index: 11 }] : []),
              ...(isAdmin ? [{ label: 'Tax ID Remap', icon: <ManageAccountsIcon fontSize="small" />, index: 12 }] : []),
              { type: 'divider' },
              { label: 'Chat', icon: <ChatIcon fontSize="small" />, index: 9 },
            ];
            return (
              <List sx={{ pt: 0.5, px: 0.5 }}>
                {navItems.map((item, i) =>
                  item.type === 'divider' ? (
                    <Box key={`div-${i}`}>
                      {item.label ? (
                        <Typography variant="caption" sx={{ px: 1.5, pt: 1.5, pb: 0.5, display: 'block', color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: 1 }}>
                          {item.label}
                        </Typography>
                      ) : (
                        <Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.08)' }} />
                      )}
                    </Box>
                  ) : (
                    <ListItemButton
                      key={item.label}
                      selected={activeTab === item.index}
                      onClick={() => setActiveTab(item.index)}
                      sx={{
                        py: 0.7,
                        my: 0.2,
                        borderRadius: 1,
                        '&:hover': { backgroundColor: 'rgba(92,124,250,0.1)' },
                        '&.Mui-selected': {
                          backgroundColor: 'rgba(92,124,250,0.15)',
                          borderLeft: '3px solid #5c7cfa',
                          '&:hover': { backgroundColor: 'rgba(92,124,250,0.22)' },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32, color: activeTab === item.index ? '#5c7cfa' : 'rgba(255,255,255,0.45)' }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontSize: '0.8rem',
                          fontWeight: activeTab === item.index ? 600 : 400,
                          color: activeTab === item.index ? '#fff' : 'rgba(255,255,255,0.7)',
                        }}
                      />
                    </ListItemButton>
                  )
                )}
              </List>
            );
          })()}
        </Drawer>

        {/* Main Content */}
        <Box sx={{ flexGrow: 1, px: 3, py: 1.5, overflow: 'auto', height: 'calc(100vh - 58px)', mt: 0.75, backgroundColor: '#f1f3f9', borderTopLeftRadius: 14, borderTopRightRadius: 14 }}>
        <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >

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

        {/* Tab 8: Invoices */}
        {activeTab === 8 && (
          <Invoices isAdmin={isAdmin} />
        )}

        {/* Tab 10: Cobra */}
        {activeTab === 10 && (
          <CobraManagement clients={clients} isAdmin={isAdmin} />
        )}

        {/* Tab 11: User Management (admin only) */}
        {activeTab === 11 && isAdmin && (
          <UserManagement />
        )}

        {/* Tab 12: Tax ID Remap (admin only) */}
        {activeTab === 12 && isAdmin && (
          <TaxIdRemap onApplied={() => { fetchAllData(); setDataVersion(v => v + 1); }} />
        )}

        {/* Tab 9: Chat */}
        {activeTab === 9 && (
          <ChatPanel />
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

        </motion.div>
        </AnimatePresence>
        </Box>
      </Box>

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

      <ChangePasswordDialog
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </Box>
    </ThemeProvider>
  );
}

function NewApp() {
  const { loading: authLoading, isAuthenticated, mustChangePassword, authDisabled, refresh } = useAuth();
  const inviteToken = new URLSearchParams(window.location.search).get('invite');

  // If any API call returns 401, treat the session as gone and re-bootstrap auth.
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (resp) => resp,
      (err) => {
        if (err.response?.status === 401) {
          refresh();
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(id);
  }, [refresh]);

  if (authLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f1629' }}>
          <CircularProgress sx={{ color: '#5c7cfa' }} />
        </Box>
      </ThemeProvider>
    );
  }

  // An invite link takes precedence over the login screen — anyone clicking
  // their invite goes straight to the signup flow even if they were already
  // logged in as someone else (they need to be signed out first, see screen).
  if (inviteToken && !isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AcceptInvitePage token={inviteToken} />
      </ThemeProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Login />
      </ThemeProvider>
    );
  }

  if (mustChangePassword && !authDisabled) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ForcedPasswordChange />
      </ThemeProvider>
    );
  }

  return <AppShell />;
}

export default NewApp;
