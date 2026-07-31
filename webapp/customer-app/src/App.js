import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Tooltip,
  Checkbox,
  FormControlLabel
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
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import BarChartIcon from '@mui/icons-material/BarChart';
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
import Tasks from './components/Tasks';
import TaskReports from './components/TaskReports';

// API URLs
const API_CLIENTS = '/api/clients';
const API_INDIVIDUALS = '/api/individuals';
const API_BENEFITS = '/api/benefits';
const API_COMMERCIAL = '/api/commercial';
const API_PERSONAL = '/api/personal';
const API_FEEDBACK = '/api/feedback';

// =====================================================================
// ROTHSCHILD NAVY — formal, structured, unmistakably firm.
//
// Deep navy nav rail + warm parchment content + brushed-gold accents.
// DM Sans for headings (structured geometric grotesque), Inter Tight
// for body (clean, tight, professional), DM Mono for numbers and IDs.
// 6px radius on cards; brass hairline dividers between sections. Feels
// like a wealth-management firm's internal tool: serious, dense,
// authoritative.
//
// Tokens defined here so they're the single source of truth; the raw
// hex constants exported from src/theme/tokens.js should match this
// block for data-driven color lookups.
// =====================================================================
const ROTHSCHILD = {
  navy:         '#0e1e3a',   // nav rail, AppBar
  navyDeep:     '#0a1728',   // nav hover, borders on navy
  navyMid:      '#1a2c4a',   // subtle contrast on navy
  parchment:    '#f3ede1',   // page background
  parchmentSoft:'#ebe2d0',   // section subframe / muted panel
  ivory:        '#faf6ee',   // cards, tables, modals
  ink:          '#1a1e2a',   // primary text (near-black, cool)
  inkSoft:      '#4a4e5a',   // secondary text
  inkMuted:     '#767988',   // tertiary text
  inkFaded:     '#a8a9b3',   // disabled / placeholder
  gold:         '#b8892b',   // primary accent (brushed gold)
  goldSoft:     '#d6a442',   // gold hover, active state
  goldDeep:     '#8f6a21',   // gold pressed
  brass:        '#a68a4c',   // dividers, subtle accents, borders
  brassSoft:    '#c9b06d',   // hairline dividers on navy
  rust:         '#8a3323',   // error / attention (deep, formal)
  moss:         '#5e7d4e',   // success (formal dark green)
  amber:        '#a86e1f',   // warning (burnt sienna)
  border:       '#dcd2be',   // hairline warm border on parchment
  borderStrong: '#c9bda5',   // stronger delineation
  onNavy:       '#e8dfc8',   // parchment-tinted text on navy
};

const STATUS_COLORS  = {
  active:   ROTHSCHILD.moss,
  prospect: ROTHSCHILD.amber,
  inactive: ROTHSCHILD.inkFaded,
};
const OUTSTANDING_COLORS = {
  'Premium Due': ROTHSCHILD.amber,
  'In Audit':    '#3e5a7a',  // dusty navy-blue
  'Cancel Due':  ROTHSCHILD.rust,
  'Add Line':    '#6b4a8a',  // muted plum
  'Complete':    ROTHSCHILD.moss,
};
const RENEWAL_PILL = { bg: '#f0e2c8', fg: '#7a5518', border: ROTHSCHILD.brassSoft };
const FORM_SECTION = {
  border: `1px solid ${ROTHSCHILD.border}`,
  bgcolor: ROTHSCHILD.parchmentSoft,
  borderRadius: 1.5,
  p: 1.75,
};

// DM Sans is the formal structured voice - used for headings and any
// interface chrome that should read as "firm". Inter Tight is the every-
// day body voice, tight and legible at small sizes. DM Mono handles
// tabular numbers and IDs where alignment matters. Inter kept as final
// fallback so any component still asking for it renders.
const FONT_DISPLAY = '"DM Sans", "Inter Tight", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const FONT_BODY    = '"Inter Tight", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const FONT_MONO    = '"DM Mono", "SF Mono", Menlo, Monaco, Consolas, "Courier New", monospace';

const theme = createTheme({
  palette: {
    primary:   { main: ROTHSCHILD.navy,  light: ROTHSCHILD.navyMid, dark: ROTHSCHILD.navyDeep, contrastText: ROTHSCHILD.parchment },
    secondary: { main: ROTHSCHILD.gold,  light: ROTHSCHILD.goldSoft, dark: ROTHSCHILD.goldDeep, contrastText: ROTHSCHILD.navy },
    success:   { main: ROTHSCHILD.moss,  light: '#7a9968' },
    warning:   { main: ROTHSCHILD.amber, light: '#c68e3a' },
    error:     { main: ROTHSCHILD.rust,  light: '#a75042', dark: '#65241a' },
    info:      { main: '#3e5a7a',        light: '#5c7ba0' },
    background:{ default: ROTHSCHILD.parchment, paper: ROTHSCHILD.ivory },
    text:      { primary: ROTHSCHILD.ink, secondary: ROTHSCHILD.inkSoft, disabled: ROTHSCHILD.inkFaded },
    divider:   ROTHSCHILD.border,
    status: STATUS_COLORS,
    outstanding: OUTSTANDING_COLORS,
    renewalPill: RENEWAL_PILL,
    rothschild: ROTHSCHILD,
  },
  mixins: {
    formSection: FORM_SECTION,
  },
  typography: {
    fontFamily: FONT_BODY,
    fontSize: 13,
    // DM Sans for display / headings. Structured, formal, geometric.
    // Weights: 600 for headings gives that "firm plaque" feel without
    // going full-bold black.
    h1: { fontFamily: FONT_DISPLAY, fontWeight: 700, letterSpacing: '-0.025em' },
    h2: { fontFamily: FONT_DISPLAY, fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontFamily: FONT_DISPLAY, fontWeight: 600, letterSpacing: '-0.018em' },
    h4: { fontFamily: FONT_DISPLAY, fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.15 },
    h5: { fontFamily: FONT_DISPLAY, fontWeight: 600, letterSpacing: '-0.012em', lineHeight: 1.2  },
    h6: { fontFamily: FONT_DISPLAY, fontWeight: 600, letterSpacing: '-0.005em', lineHeight: 1.25, fontSize: '1.15rem' },
    subtitle1: { fontFamily: FONT_DISPLAY, fontWeight: 600 },
    subtitle2: { fontFamily: FONT_DISPLAY, fontWeight: 600 },
    body1:  { fontFamily: FONT_BODY },
    body2:  { fontFamily: FONT_BODY, fontSize: '0.8125rem' },
    caption:{ fontFamily: FONT_BODY, fontSize: '0.7rem', color: ROTHSCHILD.inkMuted },
    button: { fontFamily: FONT_DISPLAY, fontWeight: 600, textTransform: 'none', letterSpacing: '0.005em' },
    overline:{ fontFamily: FONT_DISPLAY, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: '0.68rem' },
  },
  // 6px base radius — sits between Nordic's near-square 4 and modern
  // 10-12. Formal but not stiff.
  shape: { borderRadius: 6 },
  // Very subtle inset-style shadows. Rothschild depth comes from color
  // (navy on parchment) and brass hairlines, not from drop shadow.
  shadows: [
    'none',
    '0 1px 2px rgba(14,30,58,0.04)',
    '0 1px 3px rgba(14,30,58,0.06)',
    '0 2px 4px rgba(14,30,58,0.06)',
    '0 2px 6px rgba(14,30,58,0.08)',
    ...Array(20).fill('0 4px 12px rgba(14,30,58,0.10)'),
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: ROTHSCHILD.parchment,
          fontFeatureSettings: '"kern", "ss01"',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { fontSize: '0.8125rem', borderColor: ROTHSCHILD.border },
        head: {
          fontFamily: FONT_DISPLAY,
          fontWeight: 600,
          backgroundColor: ROTHSCHILD.parchmentSoft,
          color: ROTHSCHILD.navy,
          fontSize: '0.68rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          borderBottom: `1.5px solid ${ROTHSCHILD.brass}`,
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: 6, fontWeight: 600, letterSpacing: '0.005em' },
        contained: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
        containedSecondary: {
          // Gold CTA on navy text: the signature Rothschild action look.
          color: ROTHSCHILD.navy,
          '&:hover': { backgroundColor: ROTHSCHILD.goldSoft },
        },
        outlined:  { borderWidth: '1.5px', '&:hover': { borderWidth: '1.5px' } },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 6,
          border: `1px solid ${ROTHSCHILD.border}`,
          backgroundImage: 'none',
          backgroundColor: ROTHSCHILD.ivory,
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 6,
          border: `1px solid ${ROTHSCHILD.border}`,
          backgroundColor: ROTHSCHILD.ivory,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500, borderRadius: 4, fontFamily: FONT_BODY },
        sizeSmall: { height: 22, fontSize: '0.7rem' },
        outlined: { borderWidth: '1.5px' },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.85rem',
          minHeight: 40,
          fontFamily: FONT_DISPLAY,
          letterSpacing: '0.005em',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 40 },
        // Gold indicator - the accent that signals "the firm chose this".
        indicator: { height: 2, backgroundColor: ROTHSCHILD.gold },
      },
    },
    MuiDialog: {
      defaultProps: { maxWidth: 'sm', fullWidth: true },
      styleOverrides: {
        paper: {
          borderRadius: 6,
          border: `1px solid ${ROTHSCHILD.borderStrong}`,
          backgroundColor: ROTHSCHILD.ivory,
        },
      },
    },
    MuiIconButton: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: { borderRadius: 4 },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: { color: ROTHSCHILD.brass, '&.Mui-checked': { color: ROTHSCHILD.navy } },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 6, border: `1px solid ${ROTHSCHILD.border}` },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: ROTHSCHILD.navy,
          color: ROTHSCHILD.onNavy,
          fontFamily: FONT_BODY,
          fontSize: '0.72rem',
          borderRadius: 4,
          padding: '6px 10px',
          border: `1px solid ${ROTHSCHILD.brass}`,
        },
        arrow: { color: ROTHSCHILD.navy },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 4,
            fontFamily: FONT_BODY,
            backgroundColor: ROTHSCHILD.ivory,
            '& fieldset': { borderColor: ROTHSCHILD.borderStrong, borderWidth: '1.5px' },
            '&:hover fieldset': { borderColor: ROTHSCHILD.inkMuted },
            '&.Mui-focused fieldset': { borderColor: ROTHSCHILD.navy, borderWidth: '1.5px' },
          },
          '& .MuiInputLabel-root': { fontFamily: FONT_BODY },
          '& .MuiInputLabel-root.Mui-focused': { color: ROTHSCHILD.navy },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: ROTHSCHILD.border },
      },
    },
  },
});

function AppShell() {
  const { user, isAdmin, canManageTasks, logout, loginEnabled, authDisabled } = useAuth();

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

  // Task-notification badge count. Polled every 60s; also refreshed
  // whenever the user opens the Tasks tab (which additionally marks all
  // their unseen tasks seen).
  const [unseenTaskCount, setUnseenTaskCount] = useState(0);
  useEffect(() => {
    const fetchUnseen = () => {
      axios.get('/api/me/notifications', { timeout: 5000 })
        .then(res => setUnseenTaskCount(res.data?.unseen_task_count || 0))
        .catch(() => { /* ignore — silent if endpoint fails */ });
    };
    fetchUnseen();
    const id = setInterval(fetchUnseen, 60000);
    return () => clearInterval(id);
  }, []);
  const markTasksSeen = () => {
    if (unseenTaskCount === 0) return;
    axios.post('/api/me/notifications/tasks/mark-seen').catch(() => {});
    setUnseenTaskCount(0);
  };

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
  const [benefitsOnlyOutstanding, setBenefitsOnlyOutstanding] = useState(false);
  const [commercialOnlyOutstanding, setCommercialOnlyOutstanding] = useState(false);
  const [personalOnlyOutstanding, setPersonalOnlyOutstanding] = useState(false);
  const [personalSearch, setPersonalSearch] = useState('');

  // Shared "renewals in month" filter, applied to Benefits, Commercial, Personal.
  // renewalMonth = 0 means "all months" (filter disabled). renewalYear defaults
  // to the current year and is required whenever a month is picked.
  const [renewalYear, setRenewalYear] = useState(new Date().getFullYear());
  const [renewalMonth, setRenewalMonth] = useState(0);

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

  // A record has an "outstanding" item if any wide-column ending in
  // `_outstanding_item`, or any plan.outstanding_item inside `plans[type]`,
  // is truthy and not one of the "cleared" values.
  const OUTSTANDING_CLEARED = new Set(['', 'None', 'Complete']);
  const recordHasOutstanding = (rec) => {
    if (!rec) return false;
    for (const [k, v] of Object.entries(rec)) {
      if (k.endsWith('outstanding_item') && v && !OUTSTANDING_CLEARED.has(v)) return true;
    }
    if (rec.plans && typeof rec.plans === 'object') {
      for (const arr of Object.values(rec.plans)) {
        if (!Array.isArray(arr)) continue;
        for (const p of arr) {
          if (p && p.outstanding_item && !OUTSTANDING_CLEARED.has(p.outstanding_item)) return true;
        }
      }
    }
    return false;
  };

  // True if any renewal date on `rec` falls in the given (year, month).
  // Scans every `*_renewal_date` scalar column, plus nested plan/policy
  // arrays inside `rec.plans` or `rec.policies`.
  const dateMatchesYearMonth = (dateStr, year, month) => {
    if (!dateStr) return false;
    // Parse yyyy-mm-dd portion directly to avoid TZ shift from `new Date(...)`.
    const [y, m] = String(dateStr).slice(0, 10).split('-').map(Number);
    return y === year && m === month;
  };
  const recordRenewsInMonth = (rec, year, month) => {
    if (!rec) return false;
    for (const [k, v] of Object.entries(rec)) {
      if (k.endsWith('_renewal_date') && dateMatchesYearMonth(v, year, month)) return true;
    }
    if (dateMatchesYearMonth(rec.renewal_date, year, month)) return true;
    const scanArrays = (obj) => {
      if (!obj) return false;
      if (Array.isArray(obj)) {
        return obj.some(item => item && dateMatchesYearMonth(item.renewal_date, year, month));
      }
      if (typeof obj === 'object') {
        return Object.values(obj).some(scanArrays);
      }
      return false;
    };
    return scanArrays(rec.plans) || scanArrays(rec.policies);
  };

  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  // Year options: union of years present in any renewal_date across the three
  // datasets, plus the current year (so it's always selectable even for empty
  // data), sorted descending.
  const availableYears = useMemo(() => {
    const years = new Set([new Date().getFullYear()]);
    const scan = (rec) => {
      if (!rec) return;
      for (const [k, v] of Object.entries(rec)) {
        if (k.endsWith('_renewal_date') && v) {
          const y = parseInt(String(v).slice(0, 4), 10);
          if (!Number.isNaN(y)) years.add(y);
        }
      }
      const scanArrays = (obj) => {
        if (!obj) return;
        if (Array.isArray(obj)) {
          obj.forEach(item => {
            if (item?.renewal_date) {
              const y = parseInt(String(item.renewal_date).slice(0, 4), 10);
              if (!Number.isNaN(y)) years.add(y);
            }
          });
        } else if (typeof obj === 'object') {
          Object.values(obj).forEach(scanArrays);
        }
      };
      scanArrays(rec.plans);
      scanArrays(rec.policies);
    };
    benefits.forEach(scan);
    commercial.forEach(scan);
    personal.forEach(scan);
    return [...years].sort((a, b) => b - a);
  }, [benefits, commercial, personal]);

  const filterBenefits = () => {
    let list = benefits;
    if (benefitsOnlyOutstanding) list = list.filter(recordHasOutstanding);
    if (renewalMonth) list = list.filter(b => recordRenewsInMonth(b, renewalYear, renewalMonth));
    if (benefitsSearch) {
      const q = benefitsSearch.toLowerCase();
      list = list.filter(b => Object.values(b).some(v => v && v.toString().toLowerCase().includes(q)));
    }
    return list;
  };

  const filterCommercial = () => {
    let list = commercial;
    if (commercialOnlyOutstanding) list = list.filter(recordHasOutstanding);
    if (renewalMonth) list = list.filter(c => recordRenewsInMonth(c, renewalYear, renewalMonth));
    if (commercialSearch) {
      const q = commercialSearch.toLowerCase();
      list = list.filter(c => Object.values(c).some(v => v && v.toString().toLowerCase().includes(q)));
    }
    return list;
  };

  const filterPersonal = () => {
    let list = personal;
    if (personalOnlyOutstanding) list = list.filter(recordHasOutstanding);
    if (renewalMonth) list = list.filter(p => recordRenewsInMonth(p, renewalYear, renewalMonth));
    if (personalSearch) {
      const q = personalSearch.toLowerCase();
      list = list.filter(p => Object.values(p).some(v => v && v.toString().toLowerCase().includes(q)));
    }
    return list;
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

  const renderRenewalMonthFilter = () => (
    <>
      <TextField
        select
        label="Renewal month"
        value={renewalMonth}
        onChange={(e) => setRenewalMonth(Number(e.target.value))}
        size="small"
        sx={{ minWidth: 150 }}
      >
        <MenuItem value={0}>All months</MenuItem>
        {MONTH_NAMES.map((name, i) => (
          <MenuItem key={i + 1} value={i + 1}>{name}</MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Year"
        value={renewalYear}
        onChange={(e) => setRenewalYear(Number(e.target.value))}
        size="small"
        disabled={!renewalMonth}
        sx={{ minWidth: 100 }}
      >
        {availableYears.map(y => (
          <MenuItem key={y} value={y}>{y}</MenuItem>
        ))}
      </TextField>
    </>
  );

  return (
    <ThemeProvider theme={theme}>
    <CssBaseline />
    <Box sx={{ backgroundColor: ROTHSCHILD.navy, minHeight: '100vh' }}>
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
      />

      {/* Header */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          backgroundColor: ROTHSCHILD.navy,
          borderBottom: `1px solid ${ROTHSCHILD.navyDeep}`,
          color: ROTHSCHILD.parchment,
        }}
      >
        {authDisabled ? (
          <Box sx={{ backgroundColor: ROTHSCHILD.rust, color: ROTHSCHILD.parchment, textAlign: 'center', py: 0.3, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.03em' }}>
            Authentication is disabled at the server (AUTH_DISABLED=true) — everyone has admin access.
          </Box>
        ) : !loginEnabled ? (
          <Box sx={{ backgroundColor: ROTHSCHILD.rust, color: ROTHSCHILD.parchment, textAlign: 'center', py: 0.3, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.03em' }}>
            Login is disabled — non-admin users are blocked.
          </Box>
        ) : null}
        <Toolbar sx={{ minHeight: 52, px: 2 }}>
          <Typography
            variant="h6"
            sx={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: '1.05rem',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              mr: 3,
              color: ROTHSCHILD.parchment,
              // Small gold accent line above the wordmark - the firm's
              // "signature stroke" without leaning on ornament.
              borderTop: `2px solid ${ROTHSCHILD.gold}`,
              paddingTop: '4px',
            }}
          >
            Client Hub
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title={apiStatus === 'up' ? 'API Connected' : apiStatus === 'down' ? 'API Disconnected' : 'Checking...'}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: apiStatus === 'up' ? ROTHSCHILD.moss : apiStatus === 'down' ? ROTHSCHILD.rust : ROTHSCHILD.amber }} />
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
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: backupStatus.status === 'ok' ? ROTHSCHILD.moss : backupStatus.status === 'down' ? ROTHSCHILD.rust : ROTHSCHILD.amber }} />
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
              backgroundColor: ROTHSCHILD.navy,
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
              { type: 'divider', label: 'WORK' },
              { label: 'Tasks', icon: <TaskAltIcon fontSize="small" />, index: 13 },
              ...(canManageTasks ? [{ label: 'Task Report', icon: <BarChartIcon fontSize="small" />, index: 14 }] : []),
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
                      onClick={() => {
                        setActiveTab(item.index);
                        if (item.index === 13) markTasksSeen();
                      }}
                      sx={{
                        py: 0.7,
                        my: 0.2,
                        borderRadius: 1,
                        '&:hover': { backgroundColor: 'rgba(201,168,117,0.06)' },
                        '&.Mui-selected': {
                          backgroundColor: 'rgba(201,168,117,0.10)',
                          borderLeft: `2px solid ${ROTHSCHILD.gold}`,
                          '&:hover': { backgroundColor: 'rgba(201,168,117,0.16)' },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32, color: activeTab === item.index ? ROTHSCHILD.gold : 'rgba(250,247,242,0.4)' }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          item.index === 13 && unseenTaskCount > 0 ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <span>{item.label}</span>
                              <Chip
                                label={unseenTaskCount}
                                size="small"
                                color="error"
                                sx={{ height: 16, minWidth: 18, fontSize: '0.6rem', px: 0.5 }}
                              />
                            </Box>
                          ) : (
                            item.label
                          )
                        }
                        primaryTypographyProps={{
                          fontSize: '0.8rem',
                          fontWeight: activeTab === item.index ? 600 : 400,
                          color: activeTab === item.index ? '#fff' : 'rgba(255,255,255,0.7)',
                          component: 'div',
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
        <Box sx={{ flexGrow: 1, px: 3, py: 1.5, overflow: 'auto', height: 'calc(100vh - 52px)', backgroundColor: ROTHSCHILD.parchment }}>
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
            onDataChanged={() => { fetchAllData(); setDataVersion(v => v + 1); }}
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
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <TextField
                  label="Search benefits..."
                  value={benefitsSearch}
                  onChange={(e) => setBenefitsSearch(e.target.value)}
                  variant="outlined"
                  size="small"
                  sx={{ flex: 1, minWidth: 200 }}
                />
                {renderRenewalMonthFilter()}
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={benefitsOnlyOutstanding}
                      onChange={(e) => setBenefitsOnlyOutstanding(e.target.checked)}
                    />
                  }
                  label="Only with outstanding items"
                  sx={{ whiteSpace: 'nowrap', mr: 0 }}
                />
              </Stack>
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
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <TextField
                  label="Search commercial..."
                  value={commercialSearch}
                  onChange={(e) => setCommercialSearch(e.target.value)}
                  variant="outlined"
                  size="small"
                  sx={{ flex: 1, minWidth: 200 }}
                />
                {renderRenewalMonthFilter()}
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={commercialOnlyOutstanding}
                      onChange={(e) => setCommercialOnlyOutstanding(e.target.checked)}
                    />
                  }
                  label="Only with outstanding items"
                  sx={{ whiteSpace: 'nowrap', mr: 0 }}
                />
              </Stack>
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
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <TextField
                  label="Search personal..."
                  value={personalSearch}
                  onChange={(e) => setPersonalSearch(e.target.value)}
                  variant="outlined"
                  size="small"
                  sx={{ flex: 1, minWidth: 200 }}
                />
                {renderRenewalMonthFilter()}
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={personalOnlyOutstanding}
                      onChange={(e) => setPersonalOnlyOutstanding(e.target.checked)}
                    />
                  }
                  label="Only with outstanding items"
                  sx={{ whiteSpace: 'nowrap', mr: 0 }}
                />
              </Stack>
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

        {/* Tab 13: Tasks */}
        {activeTab === 13 && (
          <Tasks />
        )}

        {/* Tab 14: Task Report (admin only) */}
        {activeTab === 14 && canManageTasks && (
          <TaskReports />
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
                    <TableCell sx={{ minWidth: 80 }}>Actions</TableCell>
                    <TableCell sx={{ minWidth: 100 }}>Type</TableCell>
                    <TableCell sx={{ minWidth: 200 }}>Subject</TableCell>
                    <TableCell sx={{ minWidth: 300 }}>Description</TableCell>
                    <TableCell sx={{ minWidth: 130 }}>Status</TableCell>
                    <TableCell sx={{ minWidth: 130 }}>Created</TableCell>
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
                            item.description || <span style={{ color: '#9ca3af' }}>--</span>
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
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: ROTHSCHILD.parchment }}>
          <CircularProgress sx={{ color: ROTHSCHILD.gold }} />
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
