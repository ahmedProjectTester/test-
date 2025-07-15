import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Button, Grid, FormControl, InputLabel, Select, MenuItem, Chip, List, ListItem, ListItemText, ListItemIcon, Badge, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { Notifications, Warning, Info, Error, CheckCircle, Add, MarkAsUnread, Delete } from '@mui/icons-material';
import { alertsService } from '../services/apiService';
import { useApp } from '../context/AppContext';

interface Alert {
  id: number;
  title: string;
  message: string;
  type: string;
  priority: string;
  is_read: boolean;
  customer_name?: string;
  contract_number?: string;
  installment_number?: number;
  created_at: string;
}

const Alerts: React.FC = () => {
  const { showNotification } = useApp();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [readFilter, setReadFilter] = useState('');
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const [rowCount, setRowCount] = useState(0);

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    priority: 'medium',
  });

  useEffect(() => {
    loadAlerts();
  }, [paginationModel, typeFilter, priorityFilter, readFilter]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const params = {
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        type: typeFilter,
        priority: priorityFilter,
        is_read: readFilter,
      };
      const response = await alertsService.getAlerts(params);
      setAlerts(response.alerts);
      setRowCount(response.pagination.total);
    } catch (error) {
      showNotification('Failed to load alerts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await alertsService.markAsRead(id);
      showNotification('Alert marked as read', 'success');
      loadAlerts();
    } catch (error) {
      showNotification('Failed to mark alert as read', 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await alertsService.markAllAsRead();
      showNotification('All alerts marked as read', 'success');
      loadAlerts();
    } catch (error) {
      showNotification('Failed to mark all alerts as read', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this alert?')) {
      try {
        await alertsService.deleteAlert(id);
        showNotification('Alert deleted successfully', 'success');
        loadAlerts();
      } catch (error) {
        showNotification('Failed to delete alert', 'error');
      }
    }
  };

  const handleAdd = () => {
    setFormData({
      title: '',
      message: '',
      type: 'info',
      priority: 'medium',
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await alertsService.createAlert(formData);
      showNotification('Alert created successfully', 'success');
      setOpen(false);
      loadAlerts();
    } catch (error) {
      showNotification('Failed to create alert', 'error');
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <Warning color="warning" />;
      case 'error':
        return <Error color="error" />;
      case 'success':
        return <CheckCircle color="success" />;
      default:
        return <Info color="info" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'success':
        return 'success';
      default:
        return 'info';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const generateOverdueAlerts = async () => {
    try {
      await alertsService.generateOverdueAlerts();
      showNotification('Overdue alerts generated', 'success');
      loadAlerts();
    } catch (error) {
      showNotification('Failed to generate overdue alerts', 'error');
    }
  };

  const generateUpcomingAlerts = async () => {
    try {
      await alertsService.generateUpcomingAlerts({ days_ahead: 3 });
      showNotification('Upcoming payment alerts generated', 'success');
      loadAlerts();
    } catch (error) {
      showNotification('Failed to generate upcoming alerts', 'error');
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Alerts & Notifications</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            onClick={generateOverdueAlerts}
          >
            Generate Overdue Alerts
          </Button>
          <Button
            variant="outlined"
            onClick={generateUpcomingAlerts}
          >
            Generate Upcoming Alerts
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAdd}
          >
            Add Alert
          </Button>
        </Box>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  label="Type"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="info">Info</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                  <MenuItem value="success">Success</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  label="Priority"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={readFilter}
                  onChange={(e) => setReadFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="false">Unread</MenuItem>
                  <MenuItem value="true">Read</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleMarkAllAsRead}
              >
                Mark All as Read
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <List>
            {alerts.map((alert) => (
              <ListItem
                key={alert.id}
                sx={{
                  bgcolor: alert.is_read ? 'transparent' : 'action.hover',
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                <ListItemIcon>
                  {getAlertIcon(alert.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle1" fontWeight={alert.is_read ? 'normal' : 'bold'}>
                        {alert.title}
                      </Typography>
                      <Chip
                        label={alert.type}
                        color={getTypeColor(alert.type)}
                        size="small"
                      />
                      <Chip
                        label={alert.priority}
                        color={getPriorityColor(alert.priority)}
                        size="small"
                      />
                      {!alert.is_read && (
                        <Badge color="error" variant="dot" />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {alert.message}
                      </Typography>
                      {alert.customer_name && (
                        <Typography variant="caption" color="text.secondary">
                          Customer: {alert.customer_name}
                          {alert.contract_number && ` - Contract: ${alert.contract_number}`}
                          {alert.installment_number && ` - Installment: #${alert.installment_number}`}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary" display="block">
                        {new Date(alert.created_at).toLocaleString()}
                      </Typography>
                    </Box>
                  }
                />
                <Box display="flex" gap={1}>
                  {!alert.is_read && (
                    <Button
                      size="small"
                      startIcon={<MarkAsUnread />}
                      onClick={() => handleMarkAsRead(alert.id)}
                    >
                      Mark as Read
                    </Button>
                  )}
                  <Button
                    size="small"
                    color="error"
                    startIcon={<Delete />}
                    onClick={() => handleDelete(alert.id)}
                  >
                    Delete
                  </Button>
                </Box>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Add New Alert</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  margin="normal"
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Type</InputLabel>
                  <Select
                    name="type"
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      type: e.target.value
                    }))}
                    label="Type"
                  >
                    <MenuItem value="info">Info</MenuItem>
                    <MenuItem value="warning">Warning</MenuItem>
                    <MenuItem value="error">Error</MenuItem>
                    <MenuItem value="success">Success</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Priority</InputLabel>
                  <Select
                    name="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      priority: e.target.value
                    }))}
                    label="Priority"
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained">
              Create Alert
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Alerts;