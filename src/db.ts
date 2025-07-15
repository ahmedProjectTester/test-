import Dexie, { Table } from "dexie";
import { Customer, Contract, Installment, Payment, Alert, Setting, User } from "@/types";

class InstallmentDB extends Dexie {
  customers!: Table<Customer, string>;
  contracts!: Table<Contract, string>;
  installments!: Table<Installment, string>;
  payments!: Table<Payment, string>;
  alerts!: Table<Alert, string>;
  settings!: Table<Setting, string>;
  users!: Table<User, string>;

  constructor() {
    super("installmentDB");
    this.version(1).stores({
      customers: "id, name, phone",
      contracts: "id, customerId, totalAmount, startDate",
      installments: "id, contractId, dueDate, status",
      payments: "id, customerId, amount, date",
      alerts: "id, date, type",
      settings: "id",
      users: "id, username",
    });
  }
}

export const db = new InstallmentDB();