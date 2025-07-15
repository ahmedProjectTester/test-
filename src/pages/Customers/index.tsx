import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { Customer } from "@/types";
import { generateId, now } from "@/utils/id";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  IconButton,
  Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useState } from "react";

function CustomerFormDialog({
  open,
  onClose,
  customer,
}: {
  open: boolean;
  onClose: () => void;
  customer?: Customer | null;
}) {
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");

  const handleSave = async () => {
    if (!name.trim()) return;
    if (customer) {
      await db.customers.update(customer.id, {
        name,
        phone,
        address,
        updatedAt: now(),
      });
    } else {
      const newCustomer: Customer = {
        id: generateId(),
        name,
        phone,
        address,
        status: "regular",
        createdAt: now(),
        updatedAt: now(),
      };
      await db.customers.add(newCustomer);
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{customer ? "Edit Customer" : "Add Customer"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <TextField label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function CustomersPage() {
  const customers = useLiveQuery(() => db.customers.toArray(), []);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filtered = customers?.filter((c) =>
    [c.name, c.phone].some((field) => field?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleDelete = async (id: string) => {
    if (confirm("Delete this customer?")) {
      await db.customers.delete(id);
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5">Customers</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => { setSelectedCustomer(null); setOpen(true); }}>
          Add Customer
        </Button>
      </Box>

      <TextField
        fullWidth
        placeholder="Search by name or phone"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }}
      />

      {filtered?.length ? (
        filtered.map((customer) => (
          <Box
            key={customer.id}
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              p: 2,
              mb: 1,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography variant="subtitle1">{customer.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {customer.phone} | {customer.address}
              </Typography>
            </Box>
            <Box>
              <IconButton
                color="primary"
                onClick={() => { setSelectedCustomer(customer); setOpen(true); }}
              >
                <EditIcon />
              </IconButton>
              <IconButton color="error" onClick={() => handleDelete(customer.id)}>
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>
        ))
      ) : (
        <Typography>No customers found</Typography>
      )}

      <CustomerFormDialog
        open={open}
        onClose={() => setOpen(false)}
        customer={selectedCustomer}
      />
    </Box>
  );
}