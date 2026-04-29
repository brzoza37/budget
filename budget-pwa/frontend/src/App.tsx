import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline, Box } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import AddEditTransaction from './pages/AddEditTransaction';
import Accounts from './pages/Accounts';
import AddEditAccount from './pages/AddEditAccount';
import Categories from './pages/Categories';
import AddEditCategory from './pages/AddEditCategory';
import Budget from './pages/Budget';
import PlannedPayments from './pages/PlannedPayments';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import AddEditBudget from './pages/AddEditBudget';
import AddEditPlannedPayment from './pages/AddEditPlannedPayment';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CssBaseline />
      <Router>
        <Box sx={{ pb: { xs: 8, md: 0 }, minHeight: '100vh', bgcolor: 'background.default' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/transactions/add" element={<AddEditTransaction />} />
            <Route path="/transactions/edit/:id" element={<AddEditTransaction />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/accounts/add" element={<AddEditAccount />} />
            <Route path="/accounts/edit/:id" element={<AddEditAccount />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/categories/add" element={<AddEditCategory />} />
            <Route path="/categories/edit/:id" element={<AddEditCategory />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/budget/add" element={<AddEditBudget />} />
            <Route path="/budget/edit/:id" element={<AddEditBudget />} />
            <Route path="/planned-payments" element={<PlannedPayments />} />
            <Route path="/planned-payments/add" element={<AddEditPlannedPayment />} />
            <Route path="/planned-payments/edit/:id" element={<AddEditPlannedPayment />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Box>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
