export interface BaseEntity {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export interface Customer extends BaseEntity {
  name: string;
  phone: string;
  address?: string;
  status?: "regular" | "late" | "expired";
  notes?: string;
}

export interface Contract extends BaseEntity {
  customerId: string;
  totalAmount: number;
  numberOfInstallments: number;
  installmentAmount: number;
  startDate: string; // ISO date
  periodMonths: number;
  responsibleUserId?: string;
}

export type InstallmentStatus = "paid" | "unpaid" | "late";

export interface Installment extends BaseEntity {
  contractId: string;
  dueDate: string; // ISO date
  amount: number;
  status: InstallmentStatus;
  paidAt?: string; // ISO date
}

export interface Payment extends BaseEntity {
  customerId: string;
  installmentId?: string;
  amount: number;
  date: string;
  method: "cash" | "bank" | "electronic";
}

export interface Alert extends BaseEntity {
  title: string;
  message: string;
  date: string;
  read: boolean;
}

export interface Setting extends BaseEntity {
  key: string;
  value: any;
}

export interface User extends BaseEntity {
  username: string;
  role: "admin" | "employee" | "viewer";
  passwordHash: string;
}