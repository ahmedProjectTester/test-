import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import theme from './theme';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Contracts from './pages/Contracts';
import Installments from './pages/Installments';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';

function App() {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <AppProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route 
                  path="/*" 
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Routes>
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/customers" element={<Customers />} />
                          <Route path="/contracts" element={<Contracts />} />
                          <Route path="/installments" element={<Installments />} />
                          <Route path="/payments" element={<Payments />} />
                          <Route path="/reports" element={<Reports />} />
                          <Route path="/alerts" element={<Alerts />} />
                          <Route path="/settings" element={<Settings />} />
                        </Routes>
                      </Layout>
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </Router>
          </AppProvider>
        </AuthProvider>
      </ThemeProvider>
    </LocalizationProvider>
  );
}

export default App;
