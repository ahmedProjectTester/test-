import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { Box, Grid, Paper, Typography } from "@mui/material";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function DashboardPage() {
  const customers = useLiveQuery(() => db.customers.count(), []);
  const paidInstallments = useLiveQuery(() =>
    db.installments.where("status").equals("paid").count(),
    []
  );
  const lateInstallments = useLiveQuery(() =>
    db.installments.where("status").equals("late").count(),
    []
  );

  const alertsCount = useLiveQuery(() => db.alerts.count(), []);

  const totalAmounts = useLiveQuery(async () => {
    const payments = await db.payments.toArray();
    return payments.reduce((sum, p) => sum + p.amount, 0);
  }, []);

  const pieData = {
    labels: ["Paid", "Late"],
    datasets: [
      {
        data: [paidInstallments ?? 0, lateInstallments ?? 0],
        backgroundColor: ["#4caf50", "#f44336"],
        borderWidth: 1,
      },
    ],
  };

  const stats = [
    { label: "Customers", value: customers ?? "-" },
    { label: "Paid Installments", value: paidInstallments ?? "-" },
    { label: "Late Installments", value: lateInstallments ?? "-" },
    { label: "Alerts", value: alertsCount ?? "-" },
    { label: "Total Payments", value: totalAmounts ?? "-" },
  ];

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Dashboard
      </Typography>

      <Grid container spacing={2}>
        {stats.map((s) => (
          <Grid item xs={12} sm={6} md={3} key={s.label}>
            <Paper sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="h6">{s.label}</Typography>
              <Typography variant="h4">{s.value}</Typography>
            </Paper>
          </Grid>
        ))}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Installments Status
            </Typography>
            <Pie data={pieData} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}