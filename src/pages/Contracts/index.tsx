import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { Contract, Customer, Installment } from "@/types";
import { generateId, now } from "@/utils/id";
import dayjs from "dayjs";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { jsPDF } from "jspdf";

interface ContractWithCustomer extends Contract {
  customer?: Customer;
}

function ContractFormDialog({
  open,
  onClose,
  contract,
  customers,
}: {
  open: boolean;
  onClose: () => void;
  contract?: Contract | null;
  customers: Customer[];
}) {
  const [customerId, setCustomerId] = useState(contract?.customerId ?? "");
  const [totalAmount, setTotalAmount] = useState(contract?.totalAmount ?? 0);
  const [numberOfInstallments, setNumberOfInstallments] = useState(
    contract?.numberOfInstallments ?? 1
  );
  const [startDate, setStartDate] = useState(
    contract?.startDate ?? dayjs().format("YYYY-MM-DD")
  );
  const [periodMonths, setPeriodMonths] = useState(contract?.periodMonths ?? 1);
  const [responsibleUserId, setResponsibleUserId] = useState(
    contract?.responsibleUserId ?? ""
  );

  const installmentAmount = useMemo(() => {
    return numberOfInstallments ? totalAmount / numberOfInstallments : 0;
  }, [totalAmount, numberOfInstallments]);

  // Generate installments array for preview
  const previewInstallments = useMemo(() => {
    const interval = periodMonths / numberOfInstallments;
    return Array.from({ length: numberOfInstallments }).map((_, idx) => {
      const due = dayjs(startDate).add(interval * idx, "month").format("YYYY-MM-DD");
      return { index: idx + 1, due, amount: installmentAmount.toFixed(2) };
    });
  }, [installmentAmount, numberOfInstallments, periodMonths, startDate]);

  const handleSave = async () => {
    if (!customerId) return;

    if (contract) {
      // Updating contract – simplistic approach: delete and recreate installments
      await db.contracts.update(contract.id, {
        customerId,
        totalAmount,
        numberOfInstallments,
        installmentAmount,
        startDate,
        periodMonths,
        responsibleUserId,
        updatedAt: now(),
      });

      // Remove existing installments of this contract and recreate
      await db.installments
        .where("contractId")
        .equals(contract.id)
        .delete();

      await createInstallments(contract.id);
    } else {
      const id = generateId();
      const newContract: Contract = {
        id,
        customerId,
        totalAmount,
        numberOfInstallments,
        installmentAmount,
        startDate,
        periodMonths,
        responsibleUserId,
        createdAt: now(),
        updatedAt: now(),
      };
      await db.contracts.add(newContract);

      await createInstallments(id);
    }
    onClose();
  };

  const createInstallments = async (contractId: string) => {
    const interval = periodMonths / numberOfInstallments;
    const bulk: Installment[] = Array.from({ length: numberOfInstallments }).map((_, idx) => {
      const dueDate = dayjs(startDate).add(interval * idx, "month").format("YYYY-MM-DD");
      return {
        id: generateId(),
        contractId,
        dueDate,
        amount: installmentAmount,
        status: "unpaid",
        createdAt: now(),
        updatedAt: now(),
      };
    });
    await db.installments.bulkAdd(bulk);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{contract ? "Edit Contract" : "New Contract"}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Customer"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              fullWidth
              required
            >
              {customers.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Total Amount"
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(Number(e.target.value))}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="# Installments"
              type="number"
              value={numberOfInstallments}
              onChange={(e) => setNumberOfInstallments(Number(e.target.value))}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Period (months)"
              type="number"
              value={periodMonths}
              onChange={(e) => setPeriodMonths(Number(e.target.value))}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Installment Amount"
              type="number"
              value={installmentAmount.toFixed(2)}
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Responsible Employee (optional)"
              value={responsibleUserId}
              onChange={(e) => setResponsibleUserId(e.target.value)}
              fullWidth
            />
          </Grid>
        </Grid>

        <Typography variant="subtitle1" sx={{ mt: 3 }}>
          Installment Schedule Preview
        </Typography>
        <Paper variant="outlined" sx={{ maxHeight: 200, overflow: "auto", p: 1 }}>
          {previewInstallments.map((ins) => (
            <Typography key={ins.index} variant="body2">
              {ins.index}. Due {ins.due}: {ins.amount}
            </Typography>
          ))}
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ContractsPage() {
  const contracts = useLiveQuery(() => db.contracts.toArray(), []);
  const customers = useLiveQuery(() => db.customers.toArray(), []);

  const contractsWithCustomer: ContractWithCustomer[] | undefined = useMemo(() => {
    if (!contracts || !customers) return undefined;
    return contracts.map((ct) => ({
      ...ct,
      customer: customers.find((c) => c.id === ct.customerId),
    }));
  }, [contracts, customers]);

  const [open, setOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  const handleDelete = async (id: string) => {
    if (confirm("Delete this contract and its installments?")) {
      await db.contracts.delete(id);
      await db.installments.where("contractId").equals(id).delete();
    }
  };

  const handlePdf = (ct: ContractWithCustomer) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Contract", 10, 15);
    doc.setFontSize(12);
    doc.text(`Customer: ${ct.customer?.name ?? ""}`, 10, 25);
    doc.text(`Total Amount: ${ct.totalAmount}`, 10, 32);
    doc.text(`# Installments: ${ct.numberOfInstallments}`, 10, 39);
    doc.text(`Installment Amount: ${ct.installmentAmount.toFixed(2)}`, 10, 46);
    doc.text(`Start Date: ${ct.startDate}`, 10, 53);
    doc.text(`Period (months): ${ct.periodMonths}`, 10, 60);
    doc.save(`contract_${ct.id}.pdf`);
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5">Contracts</Typography>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => {
            setSelectedContract(null);
            setOpen(true);
          }}
          disabled={!customers?.length}
        >
          New Contract
        </Button>
      </Box>

      {contractsWithCustomer?.length ? (
        contractsWithCustomer.map((ct) => (
          <Paper
            key={ct.id}
            sx={{ p: 2, mb: 1, display: "flex", justifyContent: "space-between" }}
          >
            <Box>
              <Typography variant="subtitle1">
                {ct.customer?.name} — {ct.totalAmount} ({ct.numberOfInstallments} × {ct.installmentAmount.toFixed(2)})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Start: {ct.startDate} | Period: {ct.periodMonths} months
              </Typography>
            </Box>
            <Box>
              <IconButton
                color="primary"
                onClick={() => {
                  setSelectedContract(ct);
                  setOpen(true);
                }}
              >
                <EditIcon />
              </IconButton>
              <IconButton color="secondary" onClick={() => handlePdf(ct)}>
                <PictureAsPdfIcon />
              </IconButton>
              <IconButton color="error" onClick={() => handleDelete(ct.id)}>
                <DeleteIcon />
              </IconButton>
            </Box>
          </Paper>
        ))
      ) : (
        <Typography>No contracts yet</Typography>
      )}

      <ContractFormDialog
        open={open}
        onClose={() => setOpen(false)}
        contract={selectedContract}
        customers={customers ?? []}
      />
    </Box>
  );
}