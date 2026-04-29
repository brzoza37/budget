import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  MenuItem,
  Stack,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { 
  useCategories, 
  usePlannedPayment, 
  useCreatePlannedPayment, 
  useUpdatePlannedPayment,
  useDeletePlannedPayment
} from '../hooks/useApi';

const AddEditPlannedPayment = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: payment, isLoading: paymentLoading } = usePlannedPayment(id);
  const createMutation = useCreatePlannedPayment();
  const updateMutation = useUpdatePlannedPayment(id || '');
  const deleteMutation = useDeletePlannedPayment();

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    dueDate: new Date().toISOString().split('T')[0],
    isPaid: false,
    category: '',
  });

  useEffect(() => {
    if (payment) {
      setFormData({
        name: payment.name,
        amount: payment.amount.toString(),
        dueDate: payment.dueDate.split('T')[0],
        isPaid: payment.isPaid,
        category: payment.category?.['@id'] || '',
      });
    }
  }, [payment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      amount: parseFloat(formData.amount),
      dueDate: formData.dueDate,
      isPaid: formData.isPaid,
      category: formData.category,
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync(payload);
      } else {
        await createMutation.mutateAsync(payload);
      }
      navigate('/planned-payments');
    } catch (error) {
      console.error('Failed to save planned payment:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this planned payment?')) {
      try {
        await deleteMutation.mutateAsync(id!);
        navigate('/planned-payments');
      } catch (error) {
        console.error('Failed to delete planned payment:', error);
      }
    }
  };

  if (categoriesLoading || (isEdit && paymentLoading)) {
    return (
      <Layout title={isEdit ? 'Edit Payment' : 'Add Payment'}>
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout 
      title={isEdit ? 'Edit Payment' : 'Add Payment'}
      headerActions={
        isEdit && (
          <IconButton onClick={handleDelete} color="error">
            <DeleteIcon />
          </IconButton>
        )
      }
    >
      <Box p={2} component="form" onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <TextField
            fullWidth
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            variant="outlined"
          />

          <TextField
            fullWidth
            label="Amount"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
            variant="outlined"
          />

          <TextField
            fullWidth
            label="Due Date"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            required
            variant="outlined"
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            fullWidth
            select
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
            variant="outlined"
          >
            {categories?.map((category) => (
              <MenuItem key={category.id} value={category['@id']}>
                {category.name}
              </MenuItem>
            ))}
          </TextField>

          <FormControlLabel
            control={
              <Switch
                checked={formData.isPaid}
                onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
              />
            }
            label="Mark as Paid"
          />

          {(createMutation.isError || updateMutation.isError) && (
            <Alert severity="error">
              An error occurred while saving the payment.
            </Alert>
          )}

          <Button
            fullWidth
            variant="contained"
            size="large"
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            sx={{ mt: 2, borderRadius: 2, py: 1.5 }}
          >
            {isEdit ? 'Update Payment' : 'Add Payment'}
          </Button>
        </Stack>
      </Box>
    </Layout>
  );
};

export default AddEditPlannedPayment;
