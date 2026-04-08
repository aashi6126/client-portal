import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import BusinessIcon from '@mui/icons-material/Business';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import SecurityIcon from '@mui/icons-material/Security';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EditIcon from '@mui/icons-material/Edit';
import axios from 'axios';

const API_DASHBOARD_RENEWALS = '/api/dashboard/renewals';
const API_DASHBOARD_CROSS_SELL = '/api/dashboard/cross-sell';

// Parse date string as local time (avoids UTC timezone shift)
const parseDate = (d) => {
  if (!d) return null;
  const str = String(d);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return new Date(str + 'T00:00:00');
  }
  return new Date(str);
};

/**
 * NewDashboard - Complete rebuild with 4 sections:
 * 1. Summary Cards
 * 2. Renewals Chart (12 months)
 * 3. Next Month Focus
 * 4. Cross-Sell Opportunities
 */
const NewDashboard = ({ clients = [], benefits = [], commercial = [], personal = [], onOpenBenefitsModal, onOpenCommercialModal, onOpenPersonalModal, onNavigateToTab, dataVersion }) => {
  const [renewals, setRenewals] = useState([]);
  const [crossSell, setCrossSell] = useState({ benefits_only: [], commercial_only: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [renewalTab, setRenewalTab] = useState(0);
  const [renewalTypeFilter, setRenewalTypeFilter] = useState('all');
  const [outstandingTab, setOutstandingTab] = useState(0);
  const [crossSellTab, setCrossSellTab] = useState(0);

  // Base month for the renewals view: defaults to next month (YYYY-MM)
  const getDefaultBaseMonth = () => {
    const d = new Date();
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
  };
  const [baseMonth, setBaseMonth] = useState(getDefaultBaseMonth());

  // Fetch dashboard-specific data (renewals and cross-sell only)
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Compute date range: from baseMonth start to baseMonth + 2 months end
        const [year, month] = baseMonth.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month + 2, 0); // last day of (month + 2)
        const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        const [renewalsRes, crossSellRes] = await Promise.all([
          axios.get(API_DASHBOARD_RENEWALS, { params: { start_date: fmt(startDate), end_date: fmt(endDate) } }),
          axios.get(API_DASHBOARD_CROSS_SELL)
        ]);

        setRenewals(renewalsRes.data.renewals || []);
        setCrossSell(crossSellRes.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        let msg = 'Failed to load dashboard data';
        if (err.response) {
          msg += ` (${err.response.status}: ${err.response.data?.error || err.response.statusText})`;
        } else if (err.request) {
          msg += ' — API server is not responding. Check that the API service is running.';
        } else {
          msg += `: ${err.message}`;
        }
        setError(msg);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [dataVersion, baseMonth]);

  // Group renewals by month for chart
  const monthlyRenewals = useMemo(() => {
    const grouped = {};

    renewals.forEach(renewal => {
      const monthKey = renewal.renewal_date.substring(0, 7); // YYYY-MM
      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          month: monthKey,
          benefits: 0,
          commercial: 0,
          personal: 0,
          total: 0
        };
      }

      if (renewal.type === 'benefits') {
        grouped[monthKey].benefits += 1;
      } else if (renewal.type === 'personal') {
        grouped[monthKey].personal += 1;
      } else {
        grouped[monthKey].commercial += 1;
      }
      grouped[monthKey].total += 1;
    });

    return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
  }, [renewals]);

  // Helper to filter renewals by month offset relative to baseMonth (0 = baseMonth, 1 = next, 2 = month after)
  const filterRenewalsByMonth = (monthOffset) => {
    const [bYear, bMonth] = baseMonth.split('-').map(Number);
    const targetMonth = new Date(bYear, bMonth - 1 + monthOffset, 1);
    const targetYear = targetMonth.getFullYear();
    const targetMon = targetMonth.getMonth();

    return renewals
      .filter(renewal => {
        const renewalDate = parseDate(renewal.renewal_date);
        return renewalDate.getFullYear() === targetYear && renewalDate.getMonth() === targetMon;
      })
      .sort((a, b) => parseDate(a.renewal_date) - parseDate(b.renewal_date));
  };

  // Get month name for tab labels (offset relative to baseMonth)
  const getMonthLabel = (monthOffset) => {
    const [bYear, bMonth] = baseMonth.split('-').map(Number);
    const targetMonth = new Date(bYear, bMonth - 1 + monthOffset, 1);
    return targetMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // Group renewals by client AND type (benefits/commercial), combining policy types
  const groupRenewalsByClientAndType = (renewalsList) => {
    const grouped = {};

    renewalsList.forEach(renewal => {
      // Key by client name + type to keep benefits and commercial separate
      const key = `${renewal.client_name}|${renewal.type}`;
      if (!grouped[key]) {
        grouped[key] = {
          client_name: renewal.client_name,
          tax_id: renewal.tax_id,
          type: renewal.type,
          policies: [],
          earliest_date: renewal.renewal_date
        };
      }
      grouped[key].policies.push({
        policy_type: renewal.policy_type,
        carrier: renewal.carrier,
        renewal_date: renewal.renewal_date
      });
      // Track earliest renewal date for this client/type combo
      if (parseDate(renewal.renewal_date) < parseDate(grouped[key].earliest_date)) {
        grouped[key].earliest_date = renewal.renewal_date;
      }
    });

    return Object.values(grouped).sort((a, b) =>
      parseDate(a.earliest_date) - parseDate(b.earliest_date)
    );
  };

  // Get renewals for each month, grouped by client and type
  const renewalsByRange = useMemo(() => {
    return {
      month1: groupRenewalsByClientAndType(filterRenewalsByMonth(0)),
      month2: groupRenewalsByClientAndType(filterRenewalsByMonth(1)),
      month3: groupRenewalsByClientAndType(filterRenewalsByMonth(2))
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renewals, baseMonth]);

  // Get current tab's renewals, filtered by type
  const currentRenewals = useMemo(() => {
    let list;
    switch (renewalTab) {
      case 0: list = renewalsByRange.month1; break;
      case 1: list = renewalsByRange.month2; break;
      case 2: list = renewalsByRange.month3; break;
      default: list = renewalsByRange.month1;
    }
    if (renewalTypeFilter === 'all') return list;
    return list.filter(r => r.type === renewalTypeFilter);
  }, [renewalTab, renewalsByRange, renewalTypeFilter]);

  // Format month for display
  const formatMonth = (monthKey) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = parseDate(dateString);
      return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  // Check if renewal is urgent (< 7 days)
  const isUrgent = (dateString) => {
    const today = new Date();
    const renewalDate = parseDate(dateString);
    const daysUntil = Math.ceil((renewalDate - today) / (1000 * 60 * 60 * 24));
    return daysUntil <= 7 && daysUntil >= 0;
  };

  // Within-product sell opportunities
  const withinProductOpportunities = useMemo(() => {
    // Multi-plan types: check plans nested object
    const multiPlanDefs = [
      { planType: 'medical', name: 'Medical' },
      { planType: 'dental', name: 'Dental' },
      { planType: 'vision', name: 'Vision' },
      { planType: 'life_adnd', name: 'Life & AD&D' }
    ];
    // Single-plan types: check flat carrier field
    const singlePlanDefs = [
      { key: 'ltd_carrier', name: 'LTD' },
      { key: 'std_carrier', name: 'STD' },
      { key: 'k401_carrier', name: '401K' },
      { key: 'critical_illness_carrier', name: 'Critical Illness' },
      { key: 'accident_carrier', name: 'Accident' },
      { key: 'hospital_carrier', name: 'Hospital' },
      { key: 'voluntary_life_carrier', name: 'Vol Life' }
    ];

    const totalBenefitTypes = multiPlanDefs.length + singlePlanDefs.length; // 11

    // Commercial: multi-plan types checked via plans nested object
    const commercialMultiPlanDefs = [
      { planType: 'umbrella', name: 'Umbrella' },
      { planType: 'professional_eo', name: 'E&O' },
      { planType: 'cyber', name: 'Cyber' },
      { planType: 'crime', name: 'Crime' }
    ];
    // Commercial: single-plan types checked via flat carrier field
    const commercialSinglePlanDefs = [
      { key: 'general_liability_carrier', name: 'GL' },
      { key: 'property_carrier', name: 'Property' },
      { key: 'bop_carrier', name: 'BOP' },
      { key: 'workers_comp_carrier', name: 'WC' },
      { key: 'auto_carrier', name: 'Auto' },
      { key: 'epli_carrier', name: 'EPLI' },
      { key: 'nydbl_carrier', name: 'NYDBL' },
      { key: 'surety_carrier', name: 'Surety' },
      { key: 'product_liability_carrier', name: 'Product' },
      { key: 'flood_carrier', name: 'Flood' },
      { key: 'directors_officers_carrier', name: 'D&O' },
      { key: 'fiduciary_carrier', name: 'Fiduciary' }
    ];
    const totalCommercialTypes = commercialMultiPlanDefs.length + commercialSinglePlanDefs.length; // 17

    const benefitGaps = benefits
      .map(b => {
        const missing = [];
        // Check multi-plan types via plans nested object
        multiPlanDefs.forEach(p => {
          const hasPlans = b.plans && b.plans[p.planType] && b.plans[p.planType].length > 0;
          if (!hasPlans) missing.push(p.name);
        });
        // Check single-plan types via flat fields
        singlePlanDefs.forEach(p => {
          if (!b[p.key]) missing.push(p.name);
        });
        const active = totalBenefitTypes - missing.length;
        return { client_name: b.client_name, tax_id: b.tax_id, missing, active };
      })
      .filter(b => b.missing.length > 0 && b.active > 0)
      .sort((a, b) => a.missing.length - b.missing.length);

    const commercialGaps = commercial
      .map(c => {
        const missing = [];
        // Check multi-plan types via plans nested object
        commercialMultiPlanDefs.forEach(p => {
          const hasPlans = c.plans && c.plans[p.planType] && c.plans[p.planType].length > 0;
          if (!hasPlans) missing.push(p.name);
        });
        // Check single-plan types via flat carrier field
        commercialSinglePlanDefs.forEach(p => {
          if (!c[p.key]) missing.push(p.name);
        });
        const active = totalCommercialTypes - missing.length;
        return { client_name: c.client_name, tax_id: c.tax_id, missing, active };
      })
      .filter(c => c.missing.length > 0 && c.active > 0)
      .sort((a, b) => a.missing.length - b.missing.length);

    return { benefitGaps, commercialGaps };
  }, [benefits, commercial]);

  // Policies grouped by outstanding item status (Cancel Due, Premium Due, In Audit)
  const outstandingPolicies = useMemo(() => {
    const BENEFIT_MULTI_PLAN_TYPES = ['medical', 'dental', 'vision', 'life_adnd'];
    const BENEFIT_MULTI_LABELS = { medical: 'Medical', dental: 'Dental', vision: 'Vision', life_adnd: 'Life & AD&D' };
    const BENEFIT_SINGLE_TYPES = [
      { prefix: 'ltd', name: 'LTD' }, { prefix: 'std', name: 'STD' },
      { prefix: 'k401', name: '401K' }, { prefix: 'critical_illness', name: 'Critical Illness' },
      { prefix: 'accident', name: 'Accident' }, { prefix: 'hospital', name: 'Hospital' },
      { prefix: 'voluntary_life', name: 'Vol Life' }
    ];
    const COMMERCIAL_MULTI_PLAN_TYPES = ['umbrella', 'professional_eo', 'cyber', 'crime'];
    const COMMERCIAL_MULTI_LABELS = { umbrella: 'Umbrella', professional_eo: 'E&O', cyber: 'Cyber', crime: 'Crime' };
    const COMMERCIAL_SINGLE_TYPES = [
      { prefix: 'general_liability', name: 'GL' }, { prefix: 'property', name: 'Property' },
      { prefix: 'bop', name: 'BOP' }, { prefix: 'workers_comp', name: 'WC' },
      { prefix: 'auto', name: 'Auto' }, { prefix: 'epli', name: 'EPLI' },
      { prefix: 'nydbl', name: 'NYDBL' }, { prefix: 'surety', name: 'Surety' },
      { prefix: 'product_liability', name: 'Product' }, { prefix: 'flood', name: 'Flood' },
      { prefix: 'directors_officers', name: 'D&O' }, { prefix: 'fiduciary', name: 'Fiduciary' }
    ];

    const result = [];

    // Extract from benefits
    benefits.forEach(b => {
      // Multi-plan types
      BENEFIT_MULTI_PLAN_TYPES.forEach(pt => {
        const typePlans = (b.plans && b.plans[pt]) || [];
        typePlans.forEach((plan, idx) => {
          if (plan.outstanding_item) {
            result.push({
              client_name: b.client_name, tax_id: b.tax_id, source: 'Benefits',
              prefix: pt,
              policy: typePlans.length > 1 ? `${BENEFIT_MULTI_LABELS[pt]} ${idx + 1}` : BENEFIT_MULTI_LABELS[pt],
              assigned_to: b.enrollment_poc, renewal_date: plan.renewal_date,
              outstanding_item: plan.outstanding_item,
              due_date: plan.outstanding_item_due_date
            });
          }
        });
      });
      // Single-plan types
      BENEFIT_SINGLE_TYPES.forEach(({ prefix, name }) => {
        const item = b[`${prefix}_outstanding_item`];
        if (item) {
          result.push({
            client_name: b.client_name, tax_id: b.tax_id, source: 'Benefits',
            prefix,
            policy: name, assigned_to: b.enrollment_poc, renewal_date: b[`${prefix}_renewal_date`],
            outstanding_item: item,
            due_date: b[`${prefix}_outstanding_item_due_date`]
          });
        }
      });
    });

    // Extract from commercial
    commercial.forEach(c => {
      // Multi-plan types
      COMMERCIAL_MULTI_PLAN_TYPES.forEach(pt => {
        const typePlans = (c.plans && c.plans[pt]) || [];
        typePlans.forEach((plan, idx) => {
          if (plan.outstanding_item) {
            result.push({
              client_name: c.client_name, tax_id: c.tax_id, source: 'Commercial',
              prefix: pt,
              policy: typePlans.length > 1 ? `${COMMERCIAL_MULTI_LABELS[pt]} ${idx + 1}` : COMMERCIAL_MULTI_LABELS[pt],
              assigned_to: c.assigned_to, renewal_date: plan.renewal_date,
              outstanding_item: plan.outstanding_item,
              due_date: plan.outstanding_item_due_date
            });
          }
        });
      });
      // Single-plan types
      COMMERCIAL_SINGLE_TYPES.forEach(({ prefix, name }) => {
        const item = c[`${prefix}_outstanding_item`];
        if (item) {
          result.push({
            client_name: c.client_name, tax_id: c.tax_id, source: 'Commercial',
            prefix,
            policy: name, assigned_to: c.assigned_to, renewal_date: c[`${prefix}_renewal_date`],
            outstanding_item: item,
            due_date: c[`${prefix}_outstanding_item_due_date`]
          });
        }
      });
    });

    // Extract from personal
    const PERSONAL_TYPES = [
      { prefix: 'personal_auto', name: 'Personal Auto' },
      { prefix: 'homeowners', name: 'Homeowners' },
      { prefix: 'personal_umbrella', name: 'Personal Umbrella' },
      { prefix: 'event', name: 'Event Insurance' },
      { prefix: 'visitors_medical', name: 'Visitors Medical' }
    ];
    personal.forEach(p => {
      PERSONAL_TYPES.forEach(({ prefix, name }) => {
        const item = p[`${prefix}_outstanding_item`];
        if (item) {
          const renewalField = ['event', 'visitors_medical'].includes(prefix) ? `${prefix}_start_date` : `${prefix}_renewal_date`;
          result.push({
            client_name: p.client_name, tax_id: p.tax_id, source: 'Personal',
            prefix,
            policy: name, assigned_to: '', renewal_date: p[renewalField],
            outstanding_item: item,
            due_date: p[`${prefix}_outstanding_item_due_date`]
          });
        }
      });
    });

    // Sort by due date (soonest first, then items without due date)
    result.sort((a, b) => {
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    });

    return result;
  }, [benefits, commercial, personal]);

  // Prospect (quoting) clients
  const prospectClients = useMemo(() => {
    return clients.filter(c => c.status === 'Prospect');
  }, [clients]);

  // Open edit modal for a policy item (used by action items and renewals)
  const handleEditItem = (taxId, source, prefix) => {
    if (source === 'Benefits') {
      const record = benefits.find(b => b.tax_id === taxId);
      if (record && onOpenBenefitsModal) onOpenBenefitsModal(record, prefix || null);
    } else if (source === 'Personal') {
      const record = personal.find(p => p.tax_id === taxId);
      if (record && onOpenPersonalModal) onOpenPersonalModal(record, prefix || null);
    } else {
      const record = commercial.find(c => c.tax_id === taxId);
      if (record && onOpenCommercialModal) onOpenCommercialModal(record, prefix || null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading dashboard...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Dashboard Overview
      </Typography>

      {/* Section 1: Summary Cards + Renewals Chart */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4 }}>
        {/* Left: Summary Cards side by side */}
        <Box sx={{ display: 'flex', gap: 2, flex: '0 0 33.33%' }}>
          <Card
            sx={{ backgroundColor: '#e8f5e9', border: '1px solid #a5d6a7', cursor: 'pointer', '&:hover': { boxShadow: 4 }, flex: 1 }}
            onClick={() => onNavigateToTab && onNavigateToTab(1)}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Clients
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#37474f' }}>
                    {clients.length}
                  </Typography>
                </Box>
                <BusinessIcon sx={{ fontSize: 60, color: '#4caf50', opacity: 0.6 }} />
              </Box>
            </CardContent>
          </Card>

          <Card
            sx={{ backgroundColor: '#fff3e0', border: '1px solid #ffcc80', cursor: 'pointer', '&:hover': { boxShadow: 4 }, flex: 1 }}
            onClick={() => onNavigateToTab && onNavigateToTab(3)}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Employee Benefits
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#37474f' }}>
                    {benefits.length}
                  </Typography>
                </Box>
                <HealthAndSafetyIcon sx={{ fontSize: 60, color: '#fb8c00', opacity: 0.6 }} />
              </Box>
            </CardContent>
          </Card>

          <Card
            sx={{ backgroundColor: '#e3f2fd', border: '1px solid #90caf9', cursor: 'pointer', '&:hover': { boxShadow: 4 }, flex: 1 }}
            onClick={() => onNavigateToTab && onNavigateToTab(4)}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Commercial Policies
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#37474f' }}>
                    {commercial.length}
                  </Typography>
                </Box>
                <SecurityIcon sx={{ fontSize: 60, color: '#1976d2', opacity: 0.6 }} />
              </Box>
            </CardContent>
          </Card>

          <Card
            sx={{ backgroundColor: '#f3e5f5', border: '1px solid #ce93d8', cursor: 'pointer', '&:hover': { boxShadow: 4 }, flex: 1 }}
            onClick={() => onNavigateToTab && onNavigateToTab(5)}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Personal Policies
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#37474f' }}>
                    {personal.length}
                  </Typography>
                </Box>
                <SecurityIcon sx={{ fontSize: 60, color: '#9c27b0', opacity: 0.6 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Right: Renewals Chart */}
        <Box sx={{ flex: 1 }}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 0.5 }}>
              <TrendingUpIcon sx={{ mr: 0.5, verticalAlign: 'middle', fontSize: '1.1rem' }} />
              Renewals (Next 12 Months)
            </Typography>
            <Typography variant="caption" color="text.secondary" gutterBottom sx={{ mb: 1 }}>
              Total: <strong>{renewals.length}</strong>
            </Typography>
            {monthlyRenewals.length > 0 ? (
              <Box sx={{ flex: 1, minHeight: 100 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyRenewals} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(m) => m.split('-')[1]}
                      tick={{ fontSize: 9 }}
                      height={25}
                    />
                    <YAxis tick={{ fontSize: 9 }} width={25} />
                    <Tooltip
                      labelFormatter={formatMonth}
                      formatter={(value, name) => [value, name === 'benefits' ? 'Benefits' : name === 'personal' ? 'Personal' : 'Commercial']}
                    />
                    <Bar dataKey="benefits" stackId="a" fill="#fb8c00" />
                    <Bar dataKey="commercial" stackId="a" fill="#1976d2" />
                    <Bar dataKey="personal" stackId="a" fill="#9c27b0" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No upcoming renewals
              </Typography>
            )}
          </Paper>
        </Box>
      </Box>

      {/* Section 3: Upcoming Renewals with Time Range Tabs */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Renewals
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">Starting from:</Typography>
            <input
              type="month"
              value={baseMonth}
              onChange={(e) => { setBaseMonth(e.target.value); setRenewalTab(0); }}
              style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4, fontSize: '0.875rem' }}
            />
            <Button
              size="small"
              variant="outlined"
              onClick={() => { setBaseMonth(getDefaultBaseMonth()); setRenewalTab(0); }}
              sx={{ textTransform: 'none' }}
            >
              Reset
            </Button>
          </Box>
        </Box>
        <Tabs
          value={renewalTab}
          onChange={(_, newValue) => setRenewalTab(newValue)}
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`${getMonthLabel(0)} (${renewalsByRange.month1.length})`} />
          <Tab label={`${getMonthLabel(1)} (${renewalsByRange.month2.length})`} />
          <Tab label={`${getMonthLabel(2)} (${renewalsByRange.month3.length})`} />
        </Tabs>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          {[
            { value: 'all', label: 'All' },
            { value: 'benefits', label: 'Benefits', color: 'warning' },
            { value: 'commercial', label: 'Commercial', color: 'info' },
            { value: 'personal', label: 'Personal', color: 'secondary' }
          ].map(({ value, label, color }) => (
            <Chip
              key={value}
              label={label}
              size="small"
              color={renewalTypeFilter === value ? (color || 'default') : 'default'}
              variant={renewalTypeFilter === value ? 'filled' : 'outlined'}
              onClick={() => setRenewalTypeFilter(value)}
              sx={{ cursor: 'pointer' }}
            />
          ))}
          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            {currentRenewals.length} renewal{currentRenewals.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        {currentRenewals.length > 0 ? (
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Client</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Policies Renewing</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Earliest Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: 60 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentRenewals.map((client, idx) => (
                  <TableRow
                    key={idx}
                    sx={{
                      backgroundColor: isUrgent(client.earliest_date) ? '#fff3cd' : 'transparent',
                      cursor: 'pointer', '&:hover': { backgroundColor: isUrgent(client.earliest_date) ? '#ffecb3' : '#f5f5f5' }
                    }}
                    onClick={() => handleEditItem(client.tax_id, client.type === 'benefits' ? 'Benefits' : client.type === 'personal' ? 'Personal' : 'Commercial')}
                  >
                    <TableCell>
                      <strong>{client.client_name}</strong>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={client.type === 'benefits' ? 'Benefits' : client.type === 'personal' ? 'Personal' : 'Commercial'}
                        size="small"
                        color={client.type === 'benefits' ? 'warning' : client.type === 'personal' ? 'secondary' : 'info'}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {client.policies.map((policy, pIdx) => (
                          <Chip
                            key={pIdx}
                            label={policy.policy_type}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.75rem' }}
                            title={`Renews: ${formatDate(policy.renewal_date)}`}
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <strong>{formatDate(client.earliest_date)}</strong>
                      {isUrgent(client.earliest_date) && (
                        <Chip label="Urgent" size="small" color="warning" sx={{ ml: 1 }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Button size="small" startIcon={<EditIcon />} sx={{ fontSize: '0.75rem', minWidth: 0 }}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No renewals in this period
          </Typography>
        )}
      </Paper>

      {/* Section 4: Outstanding Items & Prospect Clients (tabbed) */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          Action Items
        </Typography>
        <Tabs
          value={outstandingTab}
          onChange={(_, newValue) => setOutstandingTab(newValue)}
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`Outstanding Items (${outstandingPolicies.length})`} />
          <Tab label={`Prospects (${prospectClients.length})`} />
        </Tabs>

        {/* Outstanding Items tab */}
        {outstandingTab === 0 && (() => {
          const items = outstandingPolicies;
          return items.length > 0 ? (
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Client</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Policy</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Outstanding Item</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Due Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Assigned To</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: 60 }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item, idx) => {
                    const isOverdue = item.due_date && new Date(item.due_date + 'T00:00:00') < new Date();
                    return (
                    <TableRow
                      key={idx}
                      sx={{ backgroundColor: isOverdue ? '#ffebee' : item.due_date ? '#fff3e0' : 'inherit', cursor: 'pointer', '&:hover': { opacity: 0.85 } }}
                      onClick={() => handleEditItem(item.tax_id, item.source, item.prefix)}
                    >
                      <TableCell><strong>{item.client_name}</strong></TableCell>
                      <TableCell>{item.policy}</TableCell>
                      <TableCell>
                        <Chip label={item.source} size="small" color={item.source === 'Benefits' ? 'warning' : item.source === 'Commercial' ? 'info' : 'default'} sx={{ fontSize: '0.75rem' }} />
                      </TableCell>
                      <TableCell>{item.outstanding_item}</TableCell>
                      <TableCell sx={{ color: isOverdue ? '#d32f2f' : 'inherit', fontWeight: isOverdue ? 700 : 400 }}>
                        {item.due_date ? formatDate(item.due_date) : '—'}
                      </TableCell>
                      <TableCell>{item.assigned_to || '—'}</TableCell>
                      <TableCell>
                        <Button size="small" startIcon={<EditIcon />} sx={{ fontSize: '0.75rem', minWidth: 0 }}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No outstanding items
            </Typography>
          );
        })()}

        {/* Prospects tab */}
        {outstandingTab === 1 && (
          prospectClients.length > 0 ? (
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Client Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Tax ID</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Phone</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {prospectClients.map((client, idx) => (
                    <TableRow
                      key={idx}
                      sx={{ cursor: 'pointer', '&:hover': { backgroundColor: '#f5f5f5' } }}
                      onClick={() => onNavigateToTab && onNavigateToTab(1)}
                    >
                      <TableCell><strong>{client.client_name}</strong></TableCell>
                      <TableCell>{client.tax_id}</TableCell>
                      <TableCell>{client.email || '—'}</TableCell>
                      <TableCell>{client.phone || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No prospect clients
            </Typography>
          )
        )}
      </Paper>

      {/* Section 6: Cross-Sell & Within-Product Opportunities (tabbed) */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          Opportunities
        </Typography>
        <Tabs
          value={crossSellTab}
          onChange={(_, newValue) => setCrossSellTab(newValue)}
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`Benefits Only (${crossSell.benefits_only.length})`} />
          <Tab label={`Commercial Only (${crossSell.commercial_only.length})`} />
          <Tab label={`Benefits Gaps (${withinProductOpportunities.benefitGaps.length})`} />
          <Tab label={`Commercial Gaps (${withinProductOpportunities.commercialGaps.length})`} />
        </Tabs>

        {/* Benefits Only tab — clients with benefits but no commercial */}
        {crossSellTab === 0 && (
          crossSell.benefits_only.length > 0 ? (
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Client</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Tax ID</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: 140 }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {crossSell.benefits_only.map((client, idx) => (
                    <TableRow
                      key={idx}
                      sx={{ backgroundColor: '#fff3e0', cursor: 'pointer', '&:hover': { opacity: 0.85 } }}
                      onClick={() => onOpenCommercialModal && onOpenCommercialModal(client)}
                    >
                      <TableCell><strong>{client.client_name}</strong></TableCell>
                      <TableCell>{client.tax_id}</TableCell>
                      <TableCell>{client.email || '—'}</TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined" sx={{ fontSize: '0.75rem', borderColor: '#fb8c00', color: '#fb8c00', '&:hover': { borderColor: '#e65100', backgroundColor: '#fff3e0' } }}>
                          Add Commercial
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No cross-sell opportunities — all benefits clients also have commercial
            </Typography>
          )
        )}

        {/* Commercial Only tab — clients with commercial but no benefits */}
        {crossSellTab === 1 && (
          crossSell.commercial_only.length > 0 ? (
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Client</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Tax ID</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: 140 }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {crossSell.commercial_only.map((client, idx) => (
                    <TableRow
                      key={idx}
                      sx={{ backgroundColor: '#e3f2fd', cursor: 'pointer', '&:hover': { opacity: 0.85 } }}
                      onClick={() => onOpenBenefitsModal && onOpenBenefitsModal(client)}
                    >
                      <TableCell><strong>{client.client_name}</strong></TableCell>
                      <TableCell>{client.tax_id}</TableCell>
                      <TableCell>{client.email || '—'}</TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined" sx={{ fontSize: '0.75rem', borderColor: '#1976d2', color: '#1976d2', '&:hover': { borderColor: '#1565c0', backgroundColor: '#e3f2fd' } }}>
                          Add Benefits
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No cross-sell opportunities — all commercial clients also have benefits
            </Typography>
          )
        )}

        {/* Benefits Gaps tab — clients with some benefit plans missing others */}
        {crossSellTab === 2 && (
          withinProductOpportunities.benefitGaps.length > 0 ? (
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Client</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Coverage</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Missing Plans</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: 60 }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {withinProductOpportunities.benefitGaps.map((client, idx) => {
                    const benefitRecord = benefits.find(b => b.tax_id === client.tax_id);
                    return (
                      <TableRow
                        key={idx}
                        sx={{ backgroundColor: '#fff3e0', cursor: 'pointer', '&:hover': { opacity: 0.85 } }}
                        onClick={() => benefitRecord && onOpenBenefitsModal && onOpenBenefitsModal(benefitRecord)}
                      >
                        <TableCell><strong>{client.client_name}</strong></TableCell>
                        <TableCell>
                          <Chip label={`${client.active} / 11`} size="small" color="primary" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {client.missing.map((plan, pIdx) => (
                              <Chip key={pIdx} label={plan} size="small" sx={{ fontSize: '0.7rem', height: '22px', backgroundColor: '#fff3e0', color: '#e65100' }} />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Button size="small" startIcon={<EditIcon />} sx={{ fontSize: '0.75rem', minWidth: 0 }}>
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              All benefits clients have full coverage
            </Typography>
          )
        )}

        {/* Commercial Gaps tab — clients with some commercial products missing others */}
        {crossSellTab === 3 && (
          withinProductOpportunities.commercialGaps.length > 0 ? (
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Client</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Coverage</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Missing Products</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: 60 }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {withinProductOpportunities.commercialGaps.map((client, idx) => {
                    const commercialRecord = commercial.find(c => c.tax_id === client.tax_id);
                    return (
                      <TableRow
                        key={idx}
                        sx={{ backgroundColor: '#e3f2fd', cursor: 'pointer', '&:hover': { opacity: 0.85 } }}
                        onClick={() => commercialRecord && onOpenCommercialModal && onOpenCommercialModal(commercialRecord)}
                      >
                        <TableCell><strong>{client.client_name}</strong></TableCell>
                        <TableCell>
                          <Chip label={`${client.active} / 17`} size="small" color="info" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {client.missing.map((product, pIdx) => (
                              <Chip key={pIdx} label={product} size="small" sx={{ fontSize: '0.7rem', height: '22px', backgroundColor: '#e3f2fd', color: '#1565c0' }} />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Button size="small" startIcon={<EditIcon />} sx={{ fontSize: '0.75rem', minWidth: 0 }}>
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              All commercial clients have full coverage
            </Typography>
          )
        )}
      </Paper>
    </Box>
  );
};

export default NewDashboard;
