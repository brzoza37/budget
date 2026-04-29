import React from 'react';
import {
  Box, Typography, Fab, CircularProgress, Stack, LinearProgress, IconButton,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useBudgets, useDeleteBudget } from '../hooks/useApi';
import { formatAmount } from '../utils/formatAmount';
import type { Budget } from '../types/api';

const Budget = () => {
  const navigate = useNavigate();
  const { data: budgets, isLoading } = useBudgets();
  const deleteMutation = useDeleteBudget();

  const handleDelete = async (budget: Budget) => {
    if (!budget.id) return;
    if (window.confirm(`Delete budget for ${budget.category?.name ?? 'this category'}?`)) {
      await deleteMutation.mutateAsync(String(budget.id));
    }
  };

  if (isLoading) {
    return (
      <Layout title="Budget">
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="Budget">
      <Box p={2}>
        <Stack spacing={2.5}>
          {(!budgets || budgets.length === 0) && (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
              No budget targets set. Tap + to add one.
            </Typography>
          )}
          {budgets?.map((budget) => (
            <BudgetItem
              key={budget.id}
              budget={budget}
              onClick={() => navigate(`/budget/edit/${budget.id}`)}
              onDelete={() => handleDelete(budget)}
            />
          ))}
        </Stack>
      </Box>

      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: { xs: 80, md: 16 }, right: 16 }}
        onClick={() => navigate('/budget/add')}
      >
        <AddIcon />
      </Fab>
    </Layout>
  );
};

const BudgetItem = ({
  budget, onClick, onDelete,
}: {
  budget: Budget; onClick: () => void; onDelete: () => void;
}) => {
  const spent = budget.spent ?? 0;
  const progress = Math.min((spent / budget.amount) * 100, 100);
  const isOverBudget = spent > budget.amount;
  const categoryColor = budget.category?.color ?? '#9e9e9e';
  const currency = 'USD';

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Box sx={{ cursor: 'pointer', flex: 1 }} onClick={onClick}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {budget.category?.name ?? 'Uncategorized'}
            <Typography component="span" variant="labelSmall" color="text.secondary" sx={{ ml: 1 }}>
              {budget.month}/{budget.year}
            </Typography>
          </Typography>
          <Typography variant="labelSmall" color="text.secondary">
            {formatAmount(spent, currency)} of {formatAmount(budget.amount, currency)}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: isOverBudget ? 'error.main' : 'text.primary' }}>
            {isOverBudget ? 'Over ' : 'Left '}
            {formatAmount(Math.abs(budget.amount - spent), currency)}
          </Typography>
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 8, borderRadius: 4,
          bgcolor: `${categoryColor}20`,
          '& .MuiLinearProgress-bar': {
            bgcolor: isOverBudget ? 'error.main' : categoryColor,
            borderRadius: 4,
          },
        }}
      />
    </Box>
  );
};

export default Budget;
