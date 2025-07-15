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
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { Add, Edit, Delete, Visibility, Search } from '@mui/icons-material';
import { customersService } from '../services/apiService';
import { useApp } from '../context/AppContext';

interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  national_id: string;
  status: string;
  notes: string;
  total_contracts: number;
  active_contracts: number;
  overdue_installments: number;
  created_at: string;
}

const Customers: React.FC = () => {
  const { showNotification } = useApp();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const [rowCount, setRowCount] = useState(0);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    national_id: '',
    status: 'regular',
    notes: '',
  });

  useEffect(() => {
    loadCustomers();
  }, [paginationModel, searchQuery, statusFilter]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const params = {
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        search: searchQuery,
        status: statusFilter,
      };
      const response = await customersService.getCustomers(params);
      setCustomers(response.customers);
      setRowCount(response.pagination.total);
    } catch (error) {
      showNotification('Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      national_id: '',
      status: 'regular',
      notes: '',
    });
    setOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      national_id: customer.national_id,
      status: customer.status,
      notes: customer.notes,
    });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await customersService.deleteCustomer(id);
        showNotification('Customer deleted successfully', 'success');
        loadCustomers();
      } catch (error) {
        showNotification('Failed to delete customer', 'error');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await customersService.updateCustomer(editingCustomer.id, formData);
        showNotification('Customer updated successfully', 'success');
      } else {
        await customersService.createCustomer(formData);
        showNotification('Customer created successfully', 'success');
      }
      setOpen(false);
      loadCustomers();
    } catch (error) {
      showNotification('Failed to save customer', 'error');
    }
  };

  const handleClose = () => {
    setOpen(false);
    setEditingCustomer(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'regular':
        return 'success';
      case 'late':
        return 'warning';
      case 'expired':
        return 'error';
      default:
        return 'default';
    }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'phone', headerName: 'Phone', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getStatusColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: 'total_contracts',
      headerName: 'Contracts',
      width: 100,
      type: 'number',
    },
    {
      field: 'overdue_installments',
      headerName: 'Overdue',
      width: 100,
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
        <Typography variant="h4">Customers</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAdd}
        >
          Add Customer
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Search customers..."
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
                  <MenuItem value="regular">Regular</MenuItem>
                  <MenuItem value="late">Late</MenuItem>
                  <MenuItem value="expired">Expired</MenuItem>
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
            rows={customers}
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
          {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="National ID"
                  name="national_id"
                  value={formData.national_id}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  margin="normal"
                  multiline
                  rows={2}
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
                    <MenuItem value="regular">Regular</MenuItem>
                    <MenuItem value="late">Late</MenuItem>
                    <MenuItem value="expired">Expired</MenuItem>
                  </Select>
                </FormControl>
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
              {editingCustomer ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Customers;