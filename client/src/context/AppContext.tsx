import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

interface Notification {
  message: string;
  severity: AlertColor;
  open: boolean;
}

interface AppContextType {
  showNotification: (message: string, severity?: AlertColor) => void;
  hideNotification: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [notification, setNotification] = useState<Notification>({
    message: '',
    severity: 'info',
    open: false
  });
  const [loading, setLoading] = useState(false);

  const showNotification = (message: string, severity: AlertColor = 'info') => {
    setNotification({
      message,
      severity,
      open: true
    });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  const value = {
    showNotification,
    hideNotification,
    loading,
    setLoading
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={hideNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={hideNotification}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </AppContext.Provider>
  );
};