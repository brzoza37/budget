import React from 'react';
import {
  Box, Typography, Card, CardContent, Fab, CircularProgress, Stack, IconButton,
} from '@mui/material';
import {
  Add as AddIcon, CheckCircle as PaidIcon,
  RadioButtonUnchecked as UnpaidIcon, Delete as DeleteIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { usePlannedPayments, useTogglePlannedPaymentPaid, useDeletePlannedPayment } from '../hooks/useApi';
import { formatAmount } from '../utils/formatAmount';
import type { PlannedPayment } from '../types/api';

const PlannedPayments = () => {
  const navigate = useNavigate();
  const { data: payments, isLoading } = usePlannedPayments();
  const toggleMutation = useTogglePlannedPaymentPaid();
  const deleteMutation = useDeletePlannedPayment();

  const handleToggle = async (payment: PlannedPayment) => {
    if (!payment.id) return;
    await toggleMutation.mutateAsync({ id: String(payment.id), isPaid: !payment.isPaid });
  };

  const handleDelete = async (payment: PlannedPayment) => {
    if (!payment.id) return;
    if (window.confirm(`Delete "${payment.name}"?`)) {
      await deleteMutation.mutateAsync(String(payment.id));
    }
  };

  if (isLoading) {
    return (
      <Layout title="Planned Payments">
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  const unpaid = payments?.filter((p) => !p.isPaid) ?? [];
  const paid = payments?.filter((p) => p.isPaid) ?? [];

  return (
    <Layout title="Planned Payments">
      <Box p={2}>
        {(!payments || payments.length === 0) && (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
            No planned payments found.
          </Typography>
        )}

        {unpaid.length > 0 && (
          <>
            <Typography variant="labelMedium" color="text.secondary" sx={{ display: 'block', mb: 1, textTransform: 'uppercase' }}>
              Upcoming
            </Typography>
            <Stack spacing={1.5} mb={3}>
              {unpaid.map((p) => (
                <PaymentItem key={p.id} payment={p} onToggle={() => handleToggle(p)} onDelete={() => handleDelete(p)} onClick={() => navigate(`/planned-payments/edit/${p.id}`)} />
              ))}
            </Stack>
          </>
        )}

        {paid.length > 0 && (
          <>
            <Typography variant="labelMedium" color="text.secondary" sx={{ display: 'block', mb: 1, textTransform: 'uppercase' }}>
              Paid
            </Typography>
            <Stack spacing={1.5}>
              {paid.map((p) => (
                <PaymentItem key={p.id} payment={p} onToggle={() => handleToggle(p)} onDelete={() => handleDelete(p)} onClick={() => navigate(`/planned-payments/edit/${p.id}`)} />
              ))}
            </Stack>
          </>
        )}
      </Box>

      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: { xs: 80, md: 16 }, right: 16 }}
        onClick={() => navigate('/planned-payments/add')}
      >
        <AddIcon />
      </Fab>
    </Layout>
  );
};

const PaymentItem = ({
  payment, onToggle, onDelete, onClick,
}: {
  payment: PlannedPayment; onToggle: () => void; onDelete: () => void; onClick: () => void;
}) => (
  <Card
    variant="outlined"
    sx={{ cursor: 'pointer', border: 'none', bgcolor: 'background.paper', opacity: payment.isPaid ? 0.6 : 1 }}
  >
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: '12px !important' }}>
      <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        color={payment.isPaid ? 'success' : 'default'}
      >
        {payment.isPaid ? <PaidIcon /> : <UnpaidIcon />}
      </IconButton>
      <Box sx={{ flex: 1 }} onClick={onClick}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, textDecoration: payment.isPaid ? 'line-through' : 'none' }}
        >
          {payment.name}
        </Typography>
        <Typography variant="labelSmall" color="text.secondary">
          Due {new Date(payment.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          {payment.category?.name && ` • ${payment.category.name}`}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
        {formatAmount(payment.amount, payment.account?.currency ?? 'USD')}
      </Typography>
      <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </CardContent>
  </Card>
);

export default PlannedPayments;
