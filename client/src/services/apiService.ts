import api from './authService';

export const dashboardService = {
  getStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  getPaymentTrends: async () => {
    const response = await api.get('/dashboard/payment-trends');
    return response.data;
  },

  getInstallmentStatus: async () => {
    const response = await api.get('/dashboard/installment-status');
    return response.data;
  },

  getRecentActivities: async () => {
    const response = await api.get('/dashboard/recent-activities');
    return response.data;
  },

  getUpcomingDues: async () => {
    const response = await api.get('/dashboard/upcoming-dues');
    return response.data;
  }
};

export const customersService = {
  getCustomers: async (params: any) => {
    const response = await api.get('/customers', { params });
    return response.data;
  },

  getCustomer: async (id: number) => {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },

  createCustomer: async (customerData: any) => {
    const response = await api.post('/customers', customerData);
    return response.data;
  },

  updateCustomer: async (id: number, customerData: any) => {
    const response = await api.put(`/customers/${id}`, customerData);
    return response.data;
  },

  deleteCustomer: async (id: number) => {
    const response = await api.delete(`/customers/${id}`);
    return response.data;
  },

  getCustomerContracts: async (id: number) => {
    const response = await api.get(`/customers/${id}/contracts`);
    return response.data;
  }
};

export const contractsService = {
  getContracts: async (params: any) => {
    const response = await api.get('/contracts', { params });
    return response.data;
  },

  getContract: async (id: number) => {
    const response = await api.get(`/contracts/${id}`);
    return response.data;
  },

  createContract: async (contractData: any) => {
    const response = await api.post('/contracts', contractData);
    return response.data;
  },

  updateContract: async (id: number, contractData: any) => {
    const response = await api.put(`/contracts/${id}`, contractData);
    return response.data;
  },

  deleteContract: async (id: number) => {
    const response = await api.delete(`/contracts/${id}`);
    return response.data;
  },

  getContractInstallments: async (id: number) => {
    const response = await api.get(`/contracts/${id}/installments`);
    return response.data;
  }
};

export const installmentsService = {
  getInstallments: async (params: any) => {
    const response = await api.get('/installments', { params });
    return response.data;
  },

  getInstallment: async (id: number) => {
    const response = await api.get(`/installments/${id}`);
    return response.data;
  },

  updateInstallmentStatus: async (id: number, statusData: any) => {
    const response = await api.put(`/installments/${id}/status`, statusData);
    return response.data;
  },

  getOverdueInstallments: async () => {
    const response = await api.get('/installments/overdue/list');
    return response.data;
  },

  addLateFee: async (id: number, lateFeeData: any) => {
    const response = await api.post(`/installments/${id}/late-fee`, lateFeeData);
    return response.data;
  },

  rescheduleInstallment: async (id: number, rescheduleData: any) => {
    const response = await api.post(`/installments/${id}/reschedule`, rescheduleData);
    return response.data;
  },

  getUpcomingInstallments: async () => {
    const response = await api.get('/installments/upcoming/list');
    return response.data;
  },

  getInstallmentPayments: async (id: number) => {
    const response = await api.get(`/installments/${id}/payments`);
    return response.data;
  }
};

export const paymentsService = {
  getPayments: async (params: any) => {
    const response = await api.get('/payments', { params });
    return response.data;
  },

  getPayment: async (id: number) => {
    const response = await api.get(`/payments/${id}`);
    return response.data;
  },

  createPayment: async (paymentData: any) => {
    const response = await api.post('/payments', paymentData);
    return response.data;
  },

  updatePayment: async (id: number, paymentData: any) => {
    const response = await api.put(`/payments/${id}`, paymentData);
    return response.data;
  },

  deletePayment: async (id: number) => {
    const response = await api.delete(`/payments/${id}`);
    return response.data;
  },

  getPaymentMethodsSummary: async () => {
    const response = await api.get('/payments/methods/summary');
    return response.data;
  }
};

export const reportsService = {
  getMonthlyPayments: async (params: any) => {
    const response = await api.get('/reports/monthly-payments', { params });
    return response.data;
  },

  getOverdueReport: async () => {
    const response = await api.get('/reports/overdue');
    return response.data;
  },

  getIncomeReport: async (params: any) => {
    const response = await api.get('/reports/income', { params });
    return response.data;
  },

  getCustomerPaymentHistory: async (customerId: number) => {
    const response = await api.get(`/reports/customer-payments/${customerId}`);
    return response.data;
  },

  exportReport: async (type: string, params: any) => {
    const response = await api.get(`/reports/export/${type}`, { 
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  getCollectionPerformance: async (params: any) => {
    const response = await api.get('/reports/collection-performance', { params });
    return response.data;
  },

  getTopCustomers: async (params: any) => {
    const response = await api.get('/reports/top-customers', { params });
    return response.data;
  }
};

export const alertsService = {
  getAlerts: async (params: any) => {
    const response = await api.get('/alerts', { params });
    return response.data;
  },

  getAlert: async (id: number) => {
    const response = await api.get(`/alerts/${id}`);
    return response.data;
  },

  createAlert: async (alertData: any) => {
    const response = await api.post('/alerts', alertData);
    return response.data;
  },

  updateAlert: async (id: number, alertData: any) => {
    const response = await api.put(`/alerts/${id}`, alertData);
    return response.data;
  },

  deleteAlert: async (id: number) => {
    const response = await api.delete(`/alerts/${id}`);
    return response.data;
  },

  markAsRead: async (id: number) => {
    const response = await api.put(`/alerts/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.put('/alerts/read/all');
    return response.data;
  },

  getTodayAlerts: async () => {
    const response = await api.get('/alerts/daily/today');
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get('/alerts/unread/count');
    return response.data;
  },

  generateOverdueAlerts: async () => {
    const response = await api.post('/alerts/generate/overdue');
    return response.data;
  },

  generateUpcomingAlerts: async (data: any) => {
    const response = await api.post('/alerts/generate/upcoming', data);
    return response.data;
  }
};

export const settingsService = {
  getSettings: async () => {
    const response = await api.get('/settings');
    return response.data;
  },

  getSetting: async (key: string) => {
    const response = await api.get(`/settings/${key}`);
    return response.data;
  },

  updateSetting: async (key: string, settingData: any) => {
    const response = await api.put(`/settings/${key}`, settingData);
    return response.data;
  },

  createSetting: async (settingData: any) => {
    const response = await api.post('/settings', settingData);
    return response.data;
  },

  deleteSetting: async (key: string) => {
    const response = await api.delete(`/settings/${key}`);
    return response.data;
  },

  getSystemConfig: async () => {
    const response = await api.get('/settings/config/system');
    return response.data;
  },

  getCompanyConfig: async () => {
    const response = await api.get('/settings/config/company');
    return response.data;
  },

  updateSystemConfig: async (configData: any) => {
    const response = await api.put('/settings/config/system', configData);
    return response.data;
  },

  updateCompanyConfig: async (configData: any) => {
    const response = await api.put('/settings/config/company', configData);
    return response.data;
  },

  createBackup: async () => {
    const response = await api.post('/settings/backup');
    return response.data;
  },

  getBackups: async () => {
    const response = await api.get('/settings/backups');
    return response.data;
  }
};