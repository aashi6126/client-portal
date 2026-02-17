import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
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

const API_CLIENTS = '/api/clients';
const API_BENEFITS = '/api/benefits';
const API_COMMERCIAL = '/api/commercial';
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
const NewDashboard = ({ onOpenBenefitsModal, onOpenCommercialModal, onNavigateToTab, dataVersion }) => {
  const [clients, setClients] = useState([]);
  const [benefits, setBenefits] = useState([]);
  const [commercial, setCommercial] = useState([]);
  const [renewals, setRenewals] = useState([]);
  const [crossSell, setCrossSell] = useState({ benefits_only: [], commercial_only: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [renewalTab, setRenewalTab] = useState(0);

  // Fetch all dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [clientsRes, benefitsRes, commercialRes, renewalsRes, crossSellRes] = await Promise.all([
          axios.get(API_CLIENTS),
          axios.get(API_BENEFITS),
          axios.get(API_COMMERCIAL),
          axios.get(API_DASHBOARD_RENEWALS),
          axios.get(API_DASHBOARD_CROSS_SELL)
        ]);

        setClients(clientsRes.data.clients || []);
        setBenefits(benefitsRes.data.benefits || []);
        setCommercial(commercialRes.data.commercial || []);
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
  }, [dataVersion]);

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
          total: 0
        };
      }

      if (renewal.type === 'benefits') {
        grouped[monthKey].benefits += 1;
      } else {
        grouped[monthKey].commercial += 1;
      }
      grouped[monthKey].total += 1;
    });

    return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
  }, [renewals]);

  // Helper to filter renewals by month offset (0 = next month, 1 = month after, 2 = month after that)
  const filterRenewalsByMonth = (monthOffset) => {
    const today = new Date();
    const targetMonth = new Date(today.getFullYear(), today.getMonth() + 1 + monthOffset, 1);
    const targetYear = targetMonth.getFullYear();
    const targetMon = targetMonth.getMonth();

    return renewals
      .filter(renewal => {
        const renewalDate = parseDate(renewal.renewal_date);
        return renewalDate.getFullYear() === targetYear && renewalDate.getMonth() === targetMon;
      })
      .sort((a, b) => parseDate(a.renewal_date) - parseDate(b.renewal_date));
  };

  // Get month name for tab labels
  const getMonthLabel = (monthOffset) => {
    const today = new Date();
    const targetMonth = new Date(today.getFullYear(), today.getMonth() + 1 + monthOffset, 1);
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
  }, [renewals]);

  // Get current tab's renewals
  const currentRenewals = useMemo(() => {
    switch (renewalTab) {
      case 0: return renewalsByRange.month1;
      case 1: return renewalsByRange.month2;
      case 2: return renewalsByRange.month3;
      default: return renewalsByRange.month1;
    }
  }, [renewalTab, renewalsByRange]);

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
      { key: 'fiduciary_carrier', name: 'Fiduciary' },
      { key: 'inland_marine_carrier', name: 'Marine' }
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
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Left: Summary Cards in a row */}
        <Grid item xs={12} md={4}>
          <Grid container spacing={2} sx={{ height: 220 }}>
            <Grid item xs={12} sm={4}>
              <Card
                sx={{ backgroundColor: '#e8f4f8', border: '1px solid #b3d9e6', cursor: 'pointer', '&:hover': { boxShadow: 4 }, height: '100%' }}
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
                    <BusinessIcon sx={{ fontSize: 60, color: '#5c9bb5', opacity: 0.6 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card
                sx={{ backgroundColor: '#f0e8f4', border: '1px solid #d4b8e0', cursor: 'pointer', '&:hover': { boxShadow: 4 }, height: '100%' }}
                onClick={() => onNavigateToTab && onNavigateToTab(2)}
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
                    <HealthAndSafetyIcon sx={{ fontSize: 60, color: '#8e7ba3', opacity: 0.6 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card
                sx={{ backgroundColor: '#e8f5e9', border: '1px solid #b8d9ba', cursor: 'pointer', '&:hover': { boxShadow: 4 }, height: '100%' }}
                onClick={() => onNavigateToTab && onNavigateToTab(3)}
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
                    <SecurityIcon sx={{ fontSize: 60, color: '#6b9b6e', opacity: 0.6 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Right: Renewals Chart (compact) */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: 220, display: 'flex', flexDirection: 'column' }}>
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
                      formatter={(value, name) => [value, name === 'benefits' ? 'Benefits' : 'Commercial']}
                    />
                    <Bar dataKey="benefits" stackId="a" fill="#8e7ba3" />
                    <Bar dataKey="commercial" stackId="a" fill="#6b9b6e" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No upcoming renewals
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Section 3: Upcoming Renewals with Time Range Tabs */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          Upcoming Renewals
        </Typography>
        <Tabs
          value={renewalTab}
          onChange={(_, newValue) => setRenewalTab(newValue)}
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`${getMonthLabel(0)} (${renewalsByRange.month1.length})`} />
          <Tab label={`${getMonthLabel(1)} (${renewalsByRange.month2.length})`} />
          <Tab label={`${getMonthLabel(2)} (${renewalsByRange.month3.length})`} />
        </Tabs>
        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
          {currentRenewals.length} renewal{currentRenewals.length !== 1 ? 's' : ''} coming up
        </Typography>
        {currentRenewals.length > 0 ? (
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Client</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Policies Renewing</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Earliest Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentRenewals.map((client, idx) => (
                  <TableRow
                    key={idx}
                    sx={{
                      backgroundColor: isUrgent(client.earliest_date) ? '#fff3cd' : 'transparent'
                    }}
                  >
                    <TableCell>
                      <strong>{client.client_name}</strong>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={client.type === 'benefits' ? 'Benefits' : 'Commercial'}
                        size="small"
                        color={client.type === 'benefits' ? 'secondary' : 'success'}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {client.policies.map((policy, pIdx) => (
                          <Chip
                            key={pIdx}
                            label={`${policy.policy_type}${policy.carrier ? ` (${policy.carrier})` : ''}`}
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

      {/* Section 4: Cross-Sell & Within-Product Opportunities (side by side) */}
      <Grid container spacing={3}>
        {/* Left: Cross-Sell Opportunities */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
              Cross-Sell Opportunities
            </Typography>

            {/* Benefits Only */}
            <Box sx={{ p: 2, backgroundColor: '#f0e8f4', borderRadius: 1, border: '1px solid #d4b8e0', mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Benefits Only ({crossSell.benefits_only.length})
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                Clients with Employee Benefits but no Commercial Insurance
              </Typography>
              {crossSell.benefits_only.length > 0 ? (
                <Box sx={{ maxHeight: 250, overflowY: 'auto' }}>
                  {crossSell.benefits_only.map((client, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        p: 1.5,
                        mb: 1,
                        backgroundColor: 'white',
                        borderRadius: 1,
                        border: '1px solid #d4b8e0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {client.client_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {client.email || client.tax_id}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: '#8e7ba3', color: '#8e7ba3', '&:hover': { borderColor: '#6d5f7f', backgroundColor: '#f0e8f4' } }}
                        onClick={() => onOpenCommercialModal && onOpenCommercialModal(client)}
                      >
                        Add Commercial
                      </Button>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No opportunities
                </Typography>
              )}
            </Box>

            {/* Commercial Only */}
            <Box sx={{ p: 2, backgroundColor: '#e8f5e9', borderRadius: 1, border: '1px solid #b8d9ba' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Commercial Only ({crossSell.commercial_only.length})
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                Clients with Commercial Insurance but no Employee Benefits
              </Typography>
              {crossSell.commercial_only.length > 0 ? (
                <Box sx={{ maxHeight: 250, overflowY: 'auto' }}>
                  {crossSell.commercial_only.map((client, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        p: 1.5,
                        mb: 1,
                        backgroundColor: 'white',
                        borderRadius: 1,
                        border: '1px solid #b8d9ba',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {client.client_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {client.email || client.tax_id}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: '#6b9b6e', color: '#6b9b6e', '&:hover': { borderColor: '#5a8060', backgroundColor: '#e8f5e9' } }}
                        onClick={() => onOpenBenefitsModal && onOpenBenefitsModal(client)}
                      >
                        Add Benefits
                      </Button>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No opportunities
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Right: Within-Product Sell Opportunities */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
              Within-Product Sell Opportunities
            </Typography>

            {/* Benefits Gaps */}
            <Box sx={{ p: 2, backgroundColor: '#f0e8f4', borderRadius: 1, border: '1px solid #d4b8e0', mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Employee Benefits Gaps ({withinProductOpportunities.benefitGaps.length})
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                Clients with some benefit plans — missing others
              </Typography>
              {withinProductOpportunities.benefitGaps.length > 0 ? (
                <Box sx={{ maxHeight: 250, overflowY: 'auto' }}>
                  {withinProductOpportunities.benefitGaps.map((client, idx) => {
                    const benefitRecord = benefits.find(b => b.tax_id === client.tax_id);
                    return (
                    <Box
                      key={idx}
                      sx={{
                        p: 1.5,
                        mb: 1,
                        backgroundColor: 'white',
                        borderRadius: 1,
                        border: '1px solid #d4b8e0'
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {client.client_name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={`${client.active} / 11 active`}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                          {benefitRecord && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<EditIcon />}
                              sx={{ fontSize: '0.7rem', py: 0.25, borderColor: '#8e7ba3', color: '#8e7ba3', '&:hover': { borderColor: '#6d5f7f', backgroundColor: '#f0e8f4' } }}
                              onClick={() => onOpenBenefitsModal && onOpenBenefitsModal(benefitRecord)}
                            >
                              Edit
                            </Button>
                          )}
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {client.missing.map((plan, pIdx) => (
                          <Chip
                            key={pIdx}
                            label={plan}
                            size="small"
                            sx={{ fontSize: '0.7rem', height: '22px', backgroundColor: '#f3e5f5', color: '#6a1b9a' }}
                          />
                        ))}
                      </Box>
                    </Box>
                    );
                  })}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  All benefits clients have full coverage
                </Typography>
              )}
            </Box>

            {/* Commercial Gaps */}
            <Box sx={{ p: 2, backgroundColor: '#e8f5e9', borderRadius: 1, border: '1px solid #b8d9ba' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Commercial Insurance Gaps ({withinProductOpportunities.commercialGaps.length})
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                Clients with some commercial products — missing others
              </Typography>
              {withinProductOpportunities.commercialGaps.length > 0 ? (
                <Box sx={{ maxHeight: 250, overflowY: 'auto' }}>
                  {withinProductOpportunities.commercialGaps.map((client, idx) => {
                    const commercialRecord = commercial.find(c => c.tax_id === client.tax_id);
                    return (
                    <Box
                      key={idx}
                      sx={{
                        p: 1.5,
                        mb: 1,
                        backgroundColor: 'white',
                        borderRadius: 1,
                        border: '1px solid #b8d9ba'
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {client.client_name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={`${client.active} / 17 active`}
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                          {commercialRecord && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<EditIcon />}
                              sx={{ fontSize: '0.7rem', py: 0.25, borderColor: '#6b9b6e', color: '#6b9b6e', '&:hover': { borderColor: '#5a8060', backgroundColor: '#e8f5e9' } }}
                              onClick={() => onOpenCommercialModal && onOpenCommercialModal(commercialRecord)}
                            >
                              Edit
                            </Button>
                          )}
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {client.missing.map((product, pIdx) => (
                          <Chip
                            key={pIdx}
                            label={product}
                            size="small"
                            sx={{ fontSize: '0.7rem', height: '22px', backgroundColor: '#e8f5e9', color: '#2e7d32' }}
                          />
                        ))}
                      </Box>
                    </Box>
                    );
                  })}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  All commercial clients have full coverage
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default NewDashboard;
