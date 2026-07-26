import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Button,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const STATUS_COLOR = {
  'Open': 'default',
  'In Progress': 'info',
  'Blocked': 'warning',
  'Done': 'success',
};

function formatWhen(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: '2-digit', day: '2-digit', year: '2-digit',
    hour: 'numeric', minute: '2-digit',
  });
}

export default function TaskReports() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Drill-down state: null = summary view; { user_id, label } = detail view.
  const [drill, setDrill] = useState(null);
  const [drillTasks, setDrillTasks] = useState([]);
  const [drillLoading, setDrillLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get('/api/tasks/reports/by-user');
      setRows(data.rows || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const openDrill = async (row) => {
    setDrill({ user_id: row.user_id, label: row.full_name || row.username });
    setDrillLoading(true);
    try {
      const params = { include_done: 'true' };
      if (row.user_id != null) params.assignee_id = row.user_id;
      const { data } = await axios.get('/api/tasks', { params });
      let list = data.tasks || [];
      if (row.user_id == null) {
        // "Unassigned" bucket — filter locally because the API doesn't have
        // an explicit "no assignee" filter.
        list = list.filter(t => t.assignee_id == null);
      }
      setDrillTasks(list);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to load user tasks');
      setDrill(null);
    } finally {
      setDrillLoading(false);
    }
  };

  const closeDrill = () => {
    setDrill(null);
    setDrillTasks([]);
    // Refresh in case counts changed while drilled in.
    fetchReport();
  };

  if (drill) {
    return (
      <Box mt={2}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={closeDrill}
                variant="text"
                size="small"
              >
                Back to report
              </Button>
              <Divider orientation="vertical" flexItem />
              <Box>
                <span className="page-eyebrow">Tasks for</span>
                <Typography variant="h6">{drill.label}</Typography>
              </Box>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {drillTasks.length} task{drillTasks.length === 1 ? '' : 's'}
            </Typography>
          </Stack>
        </Paper>

        {drillLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 260 }}>Title</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>Status</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>Priority</TableCell>
                  <TableCell sx={{ minWidth: 80 }}>Updates</TableCell>
                  <TableCell sx={{ minWidth: 140 }}>Updated</TableCell>
                  <TableCell sx={{ minWidth: 140 }}>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {drillTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No tasks.
                    </TableCell>
                  </TableRow>
                ) : (
                  drillTasks.map((t) => (
                    <TableRow key={t.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.title}</Typography>
                        {t.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {t.description.length > 90 ? t.description.slice(0, 87) + '…' : t.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={t.status}
                          size="small"
                          color={STATUS_COLOR[t.status] || 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={t.priority}
                          size="small"
                          color={t.priority === 'High' ? 'error' : t.priority === 'Medium' ? 'info' : 'default'}
                          variant={t.priority === 'High' ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell>{t.comment_count || 0}</TableCell>
                      <TableCell>{formatWhen(t.updated_at)}</TableCell>
                      <TableCell>{formatWhen(t.created_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    );
  }

  return (
    <Box mt={2}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Box>
            <span className="page-eyebrow">Admin · Reports</span>
            <Typography variant="h6">Task report by user</Typography>
          </Box>
          <Button onClick={fetchReport} size="small" variant="outlined">
            Refresh
          </Button>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : rows.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
          No active users to report on.
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {rows.map((row) => {
            const active = (row.open || 0) + (row.in_progress || 0) + (row.blocked || 0);
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={row.user_id ?? 'unassigned'}>
                <Card>
                  <CardActionArea onClick={() => openDrill(row)}>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
                        {row.full_name || row.username}
                      </Typography>
                      {row.full_name && row.username && row.full_name !== row.username && (
                        <Typography variant="caption" color="text.secondary">
                          @{row.username}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={2} sx={{ mt: 1.5, mb: 1 }}>
                        <Box>
                          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1 }}>
                            {active}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            active
                          </Typography>
                        </Box>
                        <Divider orientation="vertical" flexItem />
                        <Box>
                          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1, color: 'success.main' }}>
                            {row.done || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            done
                          </Typography>
                        </Box>
                        <Divider orientation="vertical" flexItem />
                        <Box>
                          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1, color: 'text.secondary' }}>
                            {row.total || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            total
                          </Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {row.open > 0 && (
                          <Chip label={`${row.open} open`} size="small" variant="outlined" />
                        )}
                        {row.in_progress > 0 && (
                          <Chip label={`${row.in_progress} in progress`} size="small" color="info" variant="outlined" />
                        )}
                        {row.blocked > 0 && (
                          <Chip label={`${row.blocked} blocked`} size="small" color="warning" variant="outlined" />
                        )}
                        {row.done > 0 && (
                          <Chip label={`${row.done} done`} size="small" color="success" variant="outlined" />
                        )}
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
