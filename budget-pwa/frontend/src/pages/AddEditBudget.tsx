import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  MenuItem,
  Stack,
  CircularProgress,
  IconButton,
  Alert,
} from '@mui/material';
import { Delete as DeleteIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  useCategories,
  useBudget,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
} from '../hooks/useApi';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const currentDate = new Date();

const AddEditBudget = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: budget, isLoading: budgetLoading } = useBudget(id);
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget(id || '');
  const deleteMutation = useDeleteBudget();

  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
  });

  useEffect(() => {
    if (budget) {
      setFormData({
        amount: budget.amount.toString(),
        category: budget.category?.['@id'] || '',
        month: budget.month,
        year: budget.year,
      });
    }
  }, [budget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      amount: parseFloat(formData.amount),
      category: formData.category,
      month: formData.month,
      year: formData.year,
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync(payload);
      } else {
        await createMutation.mutateAsync(payload);
      }
      navigate('/budget');
    } catch (error) {
      console.error('Failed to save budget:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this budget?')) {
      await deleteMutation.mutateAsync(id!);
      navigate('/budget');
    }
  };

  if (categoriesLoading || (isEdit && budgetLoading)) {
    return (
      <Layout title={isEdit ? 'Edit Budget' : 'Add Budget'}>
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout
      title={isEdit ? 'Edit Budget' : 'Add Budget'}
      navigationIcon={<IconButton onClick={() => navigate(-1)}><ArrowBackIcon /></IconButton>}
      actions={
        isEdit ? (
          <IconButton onClick={handleDelete} color="error">
            <DeleteIcon />
          </IconButton>
        ) : undefined
      }
    >
      <Box p={2} component="form" onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <TextField
            fullWidth label="Amount" type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required variant="outlined" inputProps={{ step: '0.01', min: '0' }}
          />
          <TextField
            fullWidth select label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required variant="outlined" disabled={isEdit}
          >
            {categories?.map((cat) => (
              <MenuItem key={cat.id} value={cat['@id']}>{cat.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth select label="Month"
            value={formData.month}
            onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
            required variant="outlined"
          >
            {MONTHS.map((m) => (
              <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth label="Year" type="number"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
            required variant="outlined" inputProps={{ min: 2020, max: 2100 }}
          />
          {(createMutation.isError || updateMutation.isError) && (
            <Alert severity="error">An error occurred while saving the budget.</Alert>
          )}
          <Button
            fullWidth variant="contained" size="large" type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            sx={{ mt: 2, borderRadius: 2, py: 1.5 }}
          >
            {isEdit ? 'Update Budget' : 'Add Budget'}
          </Button>
        </Stack>
      </Box>
    </Layout>
  );
};

export default AddEditBudget;
