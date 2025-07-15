import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Button, Grid, FormControl, InputLabel, Select, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Download, Assessment, TrendingUp, Warning } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { reportsService } from '../services/apiService';
import { useApp } from '../context/AppContext';
import dayjs from 'dayjs';

const Reports: React.FC = () => {
  const { showNotification } = useApp();
  const [activeReport, setActiveReport] = useState('overview');
  const [dateFrom, setDateFrom] = useState(dayjs().subtract(30, 'day'));
  const [dateTo, setDateTo] = useState(dayjs());
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReportData();
  }, [activeReport, dateFrom, dateTo]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      let data: any[] = [];
      
      switch (activeReport) {
        case 'monthly-payments':
          data = await reportsService.getMonthlyPayments({
            year: dateTo.year(),
            month: dateTo.month() + 1,
          });
          break;
        case 'overdue':
          data = await reportsService.getOverdueReport();
          break;
        case 'income':
          data = await reportsService.getIncomeReport({
            date_from: dateFrom.format('YYYY-MM-DD'),
            date_to: dateTo.format('YYYY-MM-DD'),
            period: 'daily',
          });
          break;
        case 'collection':
          data = await reportsService.getCollectionPerformance({
            year: dateTo.year(),
          });
          break;
        case 'top-customers':
          data = await reportsService.getTopCustomers({ limit: 10 });
          break;
        default:
          data = [];
      }
      
      setReportData(data);
    } catch (error) {
      showNotification('Failed to load report data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: string) => {
    try {
      const params = {
        date_from: dateFrom.format('YYYY-MM-DD'),
        date_to: dateTo.format('YYYY-MM-DD'),
      };
      
      const blob = await reportsService.exportReport(type, params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_report_${dateFrom.format('YYYY-MM-DD')}_to_${dateTo.format('YYYY-MM-DD')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      showNotification('Report exported successfully', 'success');
    } catch (error) {
      showNotification('Failed to export report', 'error');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const renderOverdueReport = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Customer</TableCell>
            <TableCell>Contract #</TableCell>
            <TableCell>Installment #</TableCell>
            <TableCell>Amount</TableCell>
            <TableCell>Due Date</TableCell>
            <TableCell>Days Overdue</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {reportData.map((row, index) => (
            <TableRow key={index}>
              <TableCell>{row.customer_name}</TableCell>
              <TableCell>{row.contract_number}</TableCell>
              <TableCell>{row.installment_number}</TableCell>
              <TableCell>{formatCurrency(row.amount)}</TableCell>
              <TableCell>{new Date(row.due_date).toLocaleDateString()}</TableCell>
              <TableCell>{Math.floor(row.days_overdue)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderIncomeChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={reportData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="period" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="total_income" stroke="#8884d8" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderCollectionChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={reportData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="collection_rate" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderTopCustomers = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Customer</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell>Total Payments</TableCell>
            <TableCell>Total Amount</TableCell>
            <TableCell>Average Payment</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {reportData.map((row, index) => (
            <TableRow key={index}>
              <TableCell>{row.customer_name}</TableCell>
              <TableCell>{row.phone}</TableCell>
              <TableCell>{row.total_payments}</TableCell>
              <TableCell>{formatCurrency(row.total_amount_paid)}</TableCell>
              <TableCell>{formatCurrency(row.average_payment)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderReportContent = () => {
    switch (activeReport) {
      case 'overdue':
        return renderOverdueReport();
      case 'income':
        return renderIncomeChart();
      case 'collection':
        return renderCollectionChart();
      case 'top-customers':
        return renderTopCustomers();
      default:
        return (
          <Box textAlign="center" py={4}>
            <Typography variant="h6" color="text.secondary">
              Select a report type to view data
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Reports
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Report Types
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <Button
                  variant={activeReport === 'overdue' ? 'contained' : 'outlined'}
                  startIcon={<Warning />}
                  onClick={() => setActiveReport('overdue')}
                  fullWidth
                >
                  Overdue Report
                </Button>
                <Button
                  variant={activeReport === 'income' ? 'contained' : 'outlined'}
                  startIcon={<TrendingUp />}
                  onClick={() => setActiveReport('income')}
                  fullWidth
                >
                  Income Report
                </Button>
                <Button
                  variant={activeReport === 'collection' ? 'contained' : 'outlined'}
                  startIcon={<Assessment />}
                  onClick={() => setActiveReport('collection')}
                  fullWidth
                >
                  Collection Performance
                </Button>
                <Button
                  variant={activeReport === 'top-customers' ? 'contained' : 'outlined'}
                  startIcon={<Assessment />}
                  onClick={() => setActiveReport('top-customers')}
                  fullWidth
                >
                  Top Customers
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={9}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                  {activeReport === 'overdue' && 'Overdue Installments'}
                  {activeReport === 'income' && 'Income Report'}
                  {activeReport === 'collection' && 'Collection Performance'}
                  {activeReport === 'top-customers' && 'Top Customers'}
                </Typography>
                <Box display="flex" gap={2}>
                  <DatePicker
                    label="From"
                    value={dateFrom}
                    onChange={(newValue) => setDateFrom(newValue || dayjs())}
                    format="YYYY-MM-DD"
                  />
                  <DatePicker
                    label="To"
                    value={dateTo}
                    onChange={(newValue) => setDateTo(newValue || dayjs())}
                    format="YYYY-MM-DD"
                  />
                  <Button
                    variant="contained"
                    startIcon={<Download />}
                    onClick={() => handleExport(activeReport)}
                    disabled={!activeReport || activeReport === 'overview'}
                  >
                    Export
                  </Button>
                </Box>
              </Box>

              {renderReportContent()}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Reports;