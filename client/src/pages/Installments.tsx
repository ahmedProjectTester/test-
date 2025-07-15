import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Chip, Grid, Button, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { Edit, Payment, Schedule, Warning, Search } from '@mui/icons-material';
import { installmentsService } from '../services/apiService';
import { useApp } from '../context/AppContext';

interface Installment {
  id: number;
  installment_number: number;
  contract_number: string;
  customer_name: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  status: string;
  days_overdue?: number;
  total_payments?: number;
}

const Installments: React.FC = () => {
  const { showNotification } = useApp();
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const [rowCount, setRowCount] = useState(0);

  useEffect(() => {
    loadInstallments();
  }, [paginationModel, searchQuery, statusFilter]);

  const loadInstallments = async () => {
    try {
      setLoading(true);
      const params = {
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        status: statusFilter,
      };
      const response = await installmentsService.getInstallments(params);
      setInstallments(response.installments);
      setRowCount(response.pagination.total);
    } catch (error) {
      showNotification('Failed to load installments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (id: number) => {
    try {
      await installmentsService.updateInstallmentStatus(id, {
        status: 'paid',
        paid_amount: installments.find(i => i.id === id)?.amount,
        paid_date: new Date().toISOString().split('T')[0],
      });
      showNotification('Installment marked as paid', 'success');
      loadInstallments();
    } catch (error) {
      showNotification('Failed to update installment', 'error');
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
      case 'partial':
        return 'warning';
      case 'pending':
        return 'default';
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
      field: 'paid_amount',
      headerName: 'Paid',
      width: 120,
      renderCell: (params) => formatCurrency(params.value || 0),
    },
    {
      field: 'due_date',
      headerName: 'Due Date',
      width: 120,
      renderCell: (params) => new Date(params.value).toLocaleDateString(),
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
      getActions: (params) => {
        const actions = [];
        if (params.row.status !== 'paid') {
          actions.push(
            <GridActionsCellItem
              icon={<Payment />}
              label="Mark as Paid"
              onClick={() => handleMarkAsPaid(params.row.id)}
            />
          );
        }
        return actions;
      },
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Installments
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Search installments..."
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
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="partial">Partial</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
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
            rows={installments}
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
    </Box>
  );
};

export default Installments;