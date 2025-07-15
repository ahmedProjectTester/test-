import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LinearProgress from "@mui/material/LinearProgress";
import Box from "@mui/material/Box";
import Layout from "@/components/Layout";

const DashboardPage = lazy(() => import("@/pages/Dashboard"));
const CustomersPage = lazy(() => import("@/pages/Customers"));
const ContractsPage = lazy(() => import("@/pages/Contracts"));
const InstallmentsPage = lazy(() => import("@/pages/Installments"));
const PaymentsPage = lazy(() => import("@/pages/Payments"));
const ReportsPage = lazy(() => import("@/pages/Reports"));
const AlertsPage = lazy(() => import("@/pages/Alerts"));
const SettingsPage = lazy(() => import("@/pages/Settings"));

export default function App() {
  return (
    <Suspense
      fallback={
        <Box sx={{ width: "100%", p: 2 }}>
          <LinearProgress />
        </Box>
      }
    >
      <Routes>
        <Route path="/" element={<Layout />}> {/* nested routes inside layout*/}
          <Route index element={<DashboardPage />} />
          <Route path="customers/*" element={<CustomersPage />} />
          <Route path="contracts/*" element={<ContractsPage />} />
          <Route path="installments/*" element={<InstallmentsPage />} />
          <Route path="payments/*" element={<PaymentsPage />} />
          <Route path="reports/*" element={<ReportsPage />} />
          <Route path="alerts/*" element={<AlertsPage />} />
          <Route path="settings/*" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}