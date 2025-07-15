# Installment Management System

A desktop-like web application for managing customers, contracts and installment payments. The data is stored locally in the browser (IndexedDB) and can be exported (PDF / Excel / JSON).

## Tech Stack

- React 18 + Vite + TypeScript
- Material-UI (MUI v5) for a modern, responsive UI
- Dexie.js – IndexedDB wrapper for offline/local storage
- Chart.js – graphs on the dashboard
- jsPDF, xlsx & file-saver – PDF and Excel exports

## Getting Started

1. Install dependencies:

```bash
pnpm install  # or npm install / yarn install
```

2. Start the dev server:

```bash
pnpm dev
```

3. Open http://localhost:5173 in your browser.

The project is scaffolded so you can continue implementing business logic for Contracts, Installments, Payments, Reports, Alerts and Settings.

## Project Structure

```
src/
  pages/           # Route components (Dashboard, Customers, …)
  components/      # Shared UI components / layout
  db.ts            # Dexie database & schema
  types.ts         # Shared TypeScript interfaces
  utils/           # Helper functions (ID, dates, etc.)
```

Enjoy!