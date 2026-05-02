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
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import {
  useCategories,
  useBudget,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
} from '../hooks/useApi';

const AddEditBudget = () => {
  const { t, i18n } = useTranslation();
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(new Date(2000, i, 1)),
  }));
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: budget, isLoading: budgetLoading } = useBudget(id);
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget(id || '');
  const deleteMutation = useDeleteBudget();

  const [formData, setFormData] = useState(() => {
    const now = new Date();
    return { amount: '', category: '', month: now.getMonth() + 1, year: now.getFullYear() };
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await updateMutation.mutateAsync(payload as any);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await createMutation.mutateAsync(payload as any);
      }
      navigate('/budget');
    } catch (error) {
      console.error('Failed to save budget:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(t('budget.deleteConfirm'))) {
      try {
        await deleteMutation.mutateAsync(id!);
        navigate('/budget');
      } catch (error) {
        console.error('Failed to delete budget:', error);
      }
    }
  };

  if (categoriesLoading || (isEdit && budgetLoading)) {
    return (
      <Layout title={isEdit ? t('budget.editTitle') : t('budget.addTitle')}>
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout
      title={isEdit ? t('budget.editTitle') : t('budget.addTitle')}
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
            fullWidth label={t('budget.fieldAmount')} type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required variant="outlined" inputProps={{ step: '0.01', min: '0' }}
          />
          <TextField
            fullWidth select label={t('budget.fieldCategory')}
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required variant="outlined" disabled={isEdit}
          >
            {categories?.map((cat) => (
              <MenuItem key={cat.id} value={cat['@id']}>{cat.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth select label={t('budget.fieldMonth')}
            value={formData.month}
            onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
            required variant="outlined"
          >
            {months.map((m) => (
              <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth label={t('budget.fieldYear')} type="number"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
            required variant="outlined" inputProps={{ min: 2020, max: 2100 }}
          />
          {(createMutation.isError || updateMutation.isError) && (
            <Alert severity="error">{t('budget.saveError')}</Alert>
          )}
          <Button
            fullWidth variant="contained" size="large" type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            sx={{ mt: 2, borderRadius: 2, py: 1.5 }}
          >
            {isEdit ? t('budget.updateButton') : t('budget.saveButton')}
          </Button>
        </Stack>
      </Box>
    </Layout>
  );
};

export default AddEditBudget;
