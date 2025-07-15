import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Autocomplete,
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Add, Edit, Delete, Visibility, Search } from '@mui/icons-material';
import { contractsService, customersService } from '../services/apiService';
import { useApp } from '../context/AppContext';
import dayjs from 'dayjs';

interface Contract {
  id: number;
  customer_id: number;
  customer_name: string;
  contract_number: string;
  total_amount: number;
  installment_amount: number;
  number_of_installments: number;
  start_date: string;
  end_date: string;
  interest_rate: number;
  status: string;
  description: string;
  employee_name: string;
  total_installments: number;
  paid_installments: number;
  overdue_installments: number;
  total_paid: number;
  created_at: string;
}

interface Customer {
  id: number;
  name: string;
}

const Contracts: React.FC = () => {
  const { showNotification } = useApp();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const [rowCount, setRowCount] = useState(0);

  const [formData, setFormData] = useState({
    customer_id: '',
    total_amount: '',
    number_of_installments: '',
    start_date: dayjs(),
    interest_rate: '0',
    description: '',
    responsible_employee: '',
    status: 'active',
  });

  useEffect(() => {
    loadContracts();
    loadCustomers();
  }, [paginationModel, searchQuery, statusFilter]);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const params = {
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        search: searchQuery,
        status: statusFilter,
      };
      const response = await contractsService.getContracts(params);
      setContracts(response.contracts);
      setRowCount(response.pagination.total);
    } catch (error) {
      showNotification('Failed to load contracts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await customersService.getCustomers({ limit: 1000 });
      setCustomers(response.customers);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const handleAdd = () => {
    setEditingContract(null);
    setFormData({
      customer_id: '',
      total_amount: '',
      number_of_installments: '',
      start_date: dayjs(),
      interest_rate: '0',
      description: '',
      responsible_employee: '',
      status: 'active',
    });
    setOpen(true);
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    setFormData({
      customer_id: contract.customer_id.toString(),
      total_amount: contract.total_amount.toString(),
      number_of_installments: contract.number_of_installments.toString(),
      start_date: dayjs(contract.start_date),
      interest_rate: contract.interest_rate.toString(),
      description: contract.description,
      responsible_employee: contract.employee_name || '',
      status: contract.status,
    });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this contract?')) {
      try {
        await contractsService.deleteContract(id);
        showNotification('Contract deleted successfully', 'success');
        loadContracts();
      } catch (error) {
        showNotification('Failed to delete contract', 'error');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        customer_id: parseInt(formData.customer_id),
        total_amount: parseFloat(formData.total_amount),
        number_of_installments: parseInt(formData.number_of_installments),
        start_date: formData.start_date.format('YYYY-MM-DD'),
        interest_rate: parseFloat(formData.interest_rate),
        description: formData.description,
        responsible_employee: formData.responsible_employee || null,
        status: formData.status,
      };

      if (editingContract) {
        await contractsService.updateContract(editingContract.id, submitData);
        showNotification('Contract updated successfully', 'success');
      } else {
        await contractsService.createContract(submitData);
        showNotification('Contract created successfully', 'success');
      }
      setOpen(false);
      loadContracts();
    } catch (error) {
      showNotification('Failed to save contract', 'error');
    }
  };

  const handleClose = () => {
    setOpen(false);
    setEditingContract(null);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'completed':
        return 'info';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const columns: GridColDef[] = [
    { field: 'contract_number', headerName: 'Contract #', width: 130 },
    { field: 'customer_name', headerName: 'Customer', flex: 1 },
    {
      field: 'total_amount',
      headerName: 'Total Amount',
      width: 120,
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: 'installment_amount',
      headerName: 'Installment',
      width: 120,
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: 'number_of_installments',
      headerName: 'Installments',
      width: 100,
      type: 'number',
    },
    {
      field: 'paid_installments',
      headerName: 'Paid',
      width: 80,
      type: 'number',
    },
    {
      field: 'overdue_installments',
      headerName: 'Overdue',
      width: 80,
      type: 'number',
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value > 0 ? 'error' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getStatusColor(params.value)}
          size="small"
        />
      ),
    },
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
        <Typography variant="h4">Contracts</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAdd}
        >
          Add Contract
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Search contracts..."
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
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('');
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
            rows={contracts}
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
          {editingContract ? 'Edit Contract' : 'Add New Contract'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Customer</InputLabel>
                  <Select
                    name="customer_id"
                    value={formData.customer_id}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      customer_id: e.target.value
                    }))}
                    label="Customer"
                    required
                  >
                    {customers.map((customer) => (
                      <MenuItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Total Amount"
                  name="total_amount"
                  type="number"
                  value={formData.total_amount}
                  onChange={handleInputChange}
                  required
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Number of Installments"
                  name="number_of_installments"
                  type="number"
                  value={formData.number_of_installments}
                  onChange={handleInputChange}
                  required
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Start Date"
                  value={formData.start_date}
                  onChange={(newValue) => setFormData(prev => ({
                    ...prev,
                    start_date: newValue || dayjs()
                  }))}
                  sx={{ width: '100%', mt: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Interest Rate (%)"
                  name="interest_rate"
                  type="number"
                  value={formData.interest_rate}
                  onChange={handleInputChange}
                  margin="normal"
                  inputProps={{ step: 0.1 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      status: e.target.value
                    }))}
                    label="Status"
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={formData.description}
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
              {editingContract ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Contracts;