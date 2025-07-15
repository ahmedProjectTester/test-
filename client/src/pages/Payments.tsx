import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Grid, FormControl, InputLabel, Select, MenuItem, Chip } from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Add, Edit, Delete, Search, Receipt } from '@mui/icons-material';
import { paymentsService, installmentsService } from '../services/apiService';
import { useApp } from '../context/AppContext';
import dayjs from 'dayjs';

interface Payment {
  id: number;
  installment_id: number;
  installment_number: number;
  contract_number: string;
  customer_name: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string;
  notes: string;
  created_by_name: string;
}

const Payments: React.FC = () => {
  const { showNotification } = useApp();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const [rowCount, setRowCount] = useState(0);

  const [formData, setFormData] = useState({
    installment_id: '',
    amount: '',
    payment_date: dayjs(),
    payment_method: 'cash',
    reference_number: '',
    notes: '',
  });

  useEffect(() => {
    loadPayments();
  }, [paginationModel, searchQuery, methodFilter]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const params = {
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        payment_method: methodFilter,
      };
      const response = await paymentsService.getPayments(params);
      setPayments(response.payments);
      setRowCount(response.pagination.total);
    } catch (error) {
      showNotification('Failed to load payments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingPayment(null);
    setFormData({
      installment_id: '',
      amount: '',
      payment_date: dayjs(),
      payment_method: 'cash',
      reference_number: '',
      notes: '',
    });
    setOpen(true);
  };

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setFormData({
      installment_id: payment.installment_id.toString(),
      amount: payment.amount.toString(),
      payment_date: dayjs(payment.payment_date),
      payment_method: payment.payment_method,
      reference_number: payment.reference_number,
      notes: payment.notes,
    });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this payment?')) {
      try {
        await paymentsService.deletePayment(id);
        showNotification('Payment deleted successfully', 'success');
        loadPayments();
      } catch (error) {
        showNotification('Failed to delete payment', 'error');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        installment_id: parseInt(formData.installment_id),
        amount: parseFloat(formData.amount),
        payment_date: formData.payment_date.format('YYYY-MM-DD'),
        payment_method: formData.payment_method,
        reference_number: formData.reference_number,
        notes: formData.notes,
      };

      if (editingPayment) {
        await paymentsService.updatePayment(editingPayment.id, submitData);
        showNotification('Payment updated successfully', 'success');
      } else {
        await paymentsService.createPayment(submitData);
        showNotification('Payment created successfully', 'success');
      }
      setOpen(false);
      loadPayments();
    } catch (error) {
      showNotification('Failed to save payment', 'error');
    }
  };

  const handleClose = () => {
    setOpen(false);
    setEditingPayment(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'cash':
        return 'success';
      case 'bank_transfer':
        return 'info';
      case 'credit_card':
        return 'warning';
      default:
        return 'default';
    }
  };

  const columns: GridColDef[] = [
    { field: 'contract_number', headerName: 'Contract #', width: 130 },
    { field: 'customer_name', headerName: 'Customer', flex: 1 },
    {
      field: 'installment_number',
      headerName: 'Installment #',
      width: 120,
      type: 'number',
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 120,
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: 'payment_date',
      headerName: 'Payment Date',
      width: 120,
      renderCell: (params) => new Date(params.value).toLocaleDateString(),
    },
    {
      field: 'payment_method',
      headerName: 'Method',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getMethodColor(params.value)}
          size="small"
        />
      ),
    },
    { field: 'reference_number', headerName: 'Reference', width: 120 },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<Edit />}
          label="Edit"
          onClick={() => handleEdit(params.row)}
        />,
        <GridActionsCellItem
          icon={<Delete />}
          label="Delete"
          onClick={() => handleDelete(params.row.id)}
        />,
      ],
    },
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Payments</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAdd}
        >
          Add Payment
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Search payments..."
                variant="outlined"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1 }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Method</InputLabel>
                <Select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                  label="Method"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="credit_card">Credit Card</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setSearchQuery('');
                  setMethodFilter('');
                }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <DataGrid
            rows={payments}
            columns={columns}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            rowCount={rowCount}
            paginationMode="server"
            loading={loading}
            pageSizeOptions={[5, 10, 25]}
            disableRowSelectionOnClick
            autoHeight
          />
        </CardContent>
      </Card>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPayment ? 'Edit Payment' : 'Add New Payment'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Installment ID"
                  name="installment_id"
                  type="number"
                  value={formData.installment_id}
                  onChange={handleInputChange}
                  required
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Amount"
                  name="amount"
                  type="number"
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Payment Date"
                  value={formData.payment_date}
                  onChange={(newValue) => setFormData(prev => ({
                    ...prev,
                    payment_date: newValue || dayjs()
                  }))}
                  sx={{ width: '100%', mt: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      payment_method: e.target.value
                    }))}
                    label="Payment Method"
                  >
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                    <MenuItem value="credit_card">Credit Card</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Reference Number"
                  name="reference_number"
                  value={formData.reference_number}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  margin="normal"
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingPayment ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Payments;