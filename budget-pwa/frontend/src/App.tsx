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
import MonthlyPlan from './pages/MonthlyPlan';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import AddEditBudget from './pages/AddEditBudget';
import AddEditPlanItem from './pages/AddEditPlanItem';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CssBaseline />
      <Router>
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
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
            <Route path="/plan" element={<MonthlyPlan />} />
            <Route path="/plan/add" element={<AddEditPlanItem />} />
            <Route path="/plan/edit/:id" element={<AddEditPlanItem />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Box>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
