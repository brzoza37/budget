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
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CssBaseline />
      <Router>
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
            <Route path="/transactions/add" element={<ProtectedRoute><AddEditTransaction /></ProtectedRoute>} />
            <Route path="/transactions/edit/:id" element={<ProtectedRoute><AddEditTransaction /></ProtectedRoute>} />
            <Route path="/accounts" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
            <Route path="/accounts/add" element={<ProtectedRoute><AddEditAccount /></ProtectedRoute>} />
            <Route path="/accounts/edit/:id" element={<ProtectedRoute><AddEditAccount /></ProtectedRoute>} />
            <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
            <Route path="/categories/add" element={<ProtectedRoute><AddEditCategory /></ProtectedRoute>} />
            <Route path="/categories/edit/:id" element={<ProtectedRoute><AddEditCategory /></ProtectedRoute>} />
            <Route path="/budget" element={<ProtectedRoute><Budget /></ProtectedRoute>} />
            <Route path="/budget/add" element={<ProtectedRoute><AddEditBudget /></ProtectedRoute>} />
            <Route path="/budget/edit/:id" element={<ProtectedRoute><AddEditBudget /></ProtectedRoute>} />
            <Route path="/plan" element={<ProtectedRoute><MonthlyPlan /></ProtectedRoute>} />
            <Route path="/plan/add" element={<ProtectedRoute><AddEditPlanItem /></ProtectedRoute>} />
            <Route path="/plan/edit/:id" element={<ProtectedRoute><AddEditPlanItem /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          </Routes>
        </Box>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
