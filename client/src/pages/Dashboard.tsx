import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  People,
  Description,
  Payment,
  Warning,
  TrendingUp,
  MonetizationOn,
  Schedule,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { dashboardService } from '../services/apiService';
import { useApp } from '../context/AppContext';

interface DashboardStats {
  total_customers: number;
  total_contracts: number;
  paid_installments: number;
  late_installments: number;
  monthly_revenue: number;
  pending_amount: number;
  unread_alerts: number;
}

const Dashboard: React.FC = () => {
  const { showNotification } = useApp();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [paymentTrends, setPaymentTrends] = useState<any[]>([]);
  const [installmentStatus, setInstallmentStatus] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [upcomingDues, setUpcomingDues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [
        statsResult,
        trendsResult,
        statusResult,
        activitiesResult,
        duesResult
      ] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getPaymentTrends(),
        dashboardService.getInstallmentStatus(),
        dashboardService.getRecentActivities(),
        dashboardService.getUpcomingDues()
      ]);

      setStats(statsResult);
      setPaymentTrends(trendsResult);
      setInstallmentStatus(statusResult);
      setRecentActivities(activitiesResult);
      setUpcomingDues(duesResult);
    } catch (error) {
      showNotification('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'late':
        return 'error';
      default:
        return 'default';
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <People color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Customers
                  </Typography>
                  <Typography variant="h4">
                    {stats?.total_customers || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Description color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Active Contracts
                  </Typography>
                  <Typography variant="h4">
                    {stats?.total_contracts || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <MonetizationOn color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Monthly Revenue
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(stats?.monthly_revenue || 0)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Warning color="error" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Late Installments
                  </Typography>
                  <Typography variant="h4">
                    {stats?.late_installments || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Payment Trends (Last 30 Days)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={paymentTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="total_amount" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Installment Status
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={installmentStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {installmentStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Activities and Upcoming Dues */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activities
              </Typography>
              <List>
                {recentActivities.slice(0, 5).map((activity, index) => (
                  <ListItem key={index} divider>
                    <ListItemIcon>
                      {activity.type === 'payment' ? <Payment /> : <Description />}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        activity.type === 'payment'
                          ? `Payment of ${formatCurrency(activity.amount)}`
                          : `New contract ${activity.contract_number}`
                      }
                      secondary={`${activity.customer_name} - ${new Date(activity.date).toLocaleDateString()}`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upcoming Dues (Next 7 Days)
              </Typography>
              <List>
                {upcomingDues.slice(0, 5).map((due, index) => (
                  <ListItem key={index} divider>
                    <ListItemIcon>
                      <Schedule />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${due.customer_name} - ${due.contract_number}`}
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            Installment #{due.installment_number} - {formatCurrency(due.amount)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Due: {new Date(due.due_date).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alerts */}
      {stats && stats.unread_alerts > 0 && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          You have {stats.unread_alerts} unread alerts. Check the Alerts page for more details.
        </Alert>
      )}
    </Box>
  );
};

export default Dashboard;