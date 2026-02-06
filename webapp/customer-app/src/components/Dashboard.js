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
import axios from 'axios';

const API_CLIENTS = '/api/clients';
const API_BENEFITS = '/api/benefits';
const API_COMMERCIAL = '/api/commercial';
const API_DASHBOARD_RENEWALS = '/api/dashboard/renewals';
const API_DASHBOARD_CROSS_SELL = '/api/dashboard/cross-sell';

/**
 * NewDashboard - Complete rebuild with 4 sections:
 * 1. Summary Cards
 * 2. Renewals Chart (12 months)
 * 3. Next Month Focus
 * 4. Cross-Sell Opportunities
 */
const NewDashboard = ({ onOpenBenefitsModal, onOpenCommercialModal }) => {
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
        setError('Failed to load dashboard data');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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

  // Helper to filter renewals by day range
  const filterRenewalsByRange = (startDays, endDays) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(today.getTime() + startDays * 24 * 60 * 60 * 1000);
    const endDate = new Date(today.getTime() + endDays * 24 * 60 * 60 * 1000);

    return renewals
      .filter(renewal => {
        const renewalDate = new Date(renewal.renewal_date);
        return renewalDate >= startDate && renewalDate <= endDate;
      })
      .sort((a, b) => new Date(a.renewal_date) - new Date(b.renewal_date));
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
      if (new Date(renewal.renewal_date) < new Date(grouped[key].earliest_date)) {
        grouped[key].earliest_date = renewal.renewal_date;
      }
    });

    return Object.values(grouped).sort((a, b) =>
      new Date(a.earliest_date) - new Date(b.earliest_date)
    );
  };

  // Get renewals for each time range, grouped by client and type
  const renewalsByRange = useMemo(() => {
    return {
      next30: groupRenewalsByClientAndType(filterRenewalsByRange(0, 30)),
      next30to60: groupRenewalsByClientAndType(filterRenewalsByRange(31, 60)),
      next60to90: groupRenewalsByClientAndType(filterRenewalsByRange(61, 90))
    };
  }, [renewals]);

  // Get current tab's renewals
  const currentRenewals = useMemo(() => {
    switch (renewalTab) {
      case 0: return renewalsByRange.next30;
      case 1: return renewalsByRange.next30to60;
      case 2: return renewalsByRange.next60to90;
      default: return renewalsByRange.next30;
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
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  // Check if renewal is urgent (< 7 days)
  const isUrgent = (dateString) => {
    const today = new Date();
    const renewalDate = new Date(dateString);
    const daysUntil = Math.ceil((renewalDate - today) / (1000 * 60 * 60 * 24));
    return daysUntil <= 7 && daysUntil >= 0;
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

      {/* Section 1: Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ backgroundColor: '#e8f4f8', border: '1px solid #b3d9e6' }}>
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
          <Card sx={{ backgroundColor: '#f0e8f4', border: '1px solid #d4b8e0' }}>
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
          <Card sx={{ backgroundColor: '#e8f5e9', border: '1px solid #b8d9ba' }}>
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

      {/* Section 2: Renewals Chart */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Renewals Overview (Next 12 Months)
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
          Total Renewals: <strong>{renewals.length}</strong>
        </Typography>
        {monthlyRenewals.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyRenewals}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonth}
                angle={0}
                textAnchor="middle"
                height={50}
                tick={{ fontSize: 11 }}
              />
              <YAxis label={{ value: 'Renewals', angle: 0, position: 'top', offset: 10 }} />
              <Tooltip
                labelFormatter={formatMonth}
                formatter={(value, name) => [value, name === 'benefits' ? 'Employee Benefits' : 'Commercial']}
              />
              <Legend
                formatter={(value) => (value === 'benefits' ? 'Employee Benefits' : 'Commercial')}
              />
              <Bar dataKey="benefits" stackId="a" fill="#8e7ba3" />
              <Bar dataKey="commercial" stackId="a" fill="#6b9b6e" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No upcoming renewals
          </Typography>
        )}
      </Paper>

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
          <Tab label={`Next 30 Days (${renewalsByRange.next30.length})`} />
          <Tab label={`30-60 Days (${renewalsByRange.next30to60.length})`} />
          <Tab label={`60-90 Days (${renewalsByRange.next60to90.length})`} />
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

      {/* Section 4: Cross-Sell Opportunities */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          Cross-Sell Opportunities
        </Typography>
        <Grid container spacing={3}>
          {/* Clients with Benefits but no Commercial */}
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, backgroundColor: '#f0e8f4', borderRadius: 1, border: '1px solid #d4b8e0' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Benefits Only ({crossSell.benefits_only.length})
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                Clients with Employee Benefits but no Commercial Insurance
              </Typography>
              {crossSell.benefits_only.length > 0 ? (
                <Box>
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
          </Grid>

          {/* Clients with Commercial but no Benefits */}
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, backgroundColor: '#e8f5e9', borderRadius: 1, border: '1px solid #b8d9ba' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Commercial Only ({crossSell.commercial_only.length})
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                Clients with Commercial Insurance but no Employee Benefits
              </Typography>
              {crossSell.commercial_only.length > 0 ? (
                <Box>
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
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default NewDashboard;
