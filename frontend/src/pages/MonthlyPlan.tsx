import { useState } from 'react';
import {
  Box, Typography, Fab, CircularProgress, Stack, IconButton,
  Card, CardContent, Dialog, DialogTitle, DialogContent,
  DialogActions, Button,
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircle as PaidIcon,
  RadioButtonUnchecked as UnpaidIcon,
  Delete as DeleteIcon,
  Repeat as RecurringIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  TrendingUp as IncomeIcon,
  TrendingDown as ExpenseIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import ConfirmSheet from '../components/ConfirmSheet';
import {
  usePlannedItems,
  useDeletePlannedItem,
  useConfirmPlannedItem,
  useGenerateMonth,
} from '../hooks/useApi';
import { formatAmount } from '../utils/formatAmount';
import type { PlannedItem } from '../types/api';

const MonthlyPlan = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [viewDate, setViewDate] = useState(new Date());
  const month = viewDate.getMonth() + 1;
  const year = viewDate.getFullYear();

  const [confirmItem, setConfirmItem] = useState<PlannedItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<PlannedItem | null>(null);

  const generateMutation = useGenerateMonth();
  const { data: items, isLoading } = usePlannedItems(month, year);
  const deleteMutation = useDeletePlannedItem();
  const confirmMutation = useConfirmPlannedItem();

  const prevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => {
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    setViewDate(next);
    generateMutation.mutate({ month: next.getMonth() + 1, year: next.getFullYear() });
  };

  const incomeItems = items?.filter((p) => p.type === 'INCOME') ?? [];
  const expenseItems = items?.filter((p) => p.type === 'EXPENSE') ?? [];

  const handleConfirm = async (payload: { amount: number; accountId: number; date: string }) => {
    if (!confirmItem?.id) return;
    await confirmMutation.mutateAsync({ id: confirmItem.id, payload });
    setConfirmItem(null);
  };

  const handleDelete = async () => {
    if (!deleteItem?.id) return;
    await deleteMutation.mutateAsync(String(deleteItem.id));
    setDeleteItem(null);
  };

  if (isLoading) {
    return (
      <Layout title={t('plan.title')}>
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title={t('plan.title')}>
      <Box p={2}>
        {/* Month navigator */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <IconButton size="small" onClick={prevMonth}><PrevIcon /></IconButton>
          <Typography variant="titleMedium">
            {viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </Typography>
          <IconButton size="small" onClick={nextMonth}><NextIcon /></IconButton>
        </Box>

        {incomeItems.length === 0 && expenseItems.length === 0 && (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
            {t('plan.noItems')}
          </Typography>
        )}

        {/* Income section */}
        {incomeItems.length > 0 && (
          <>
            <Typography variant="labelMedium" color="success.main" sx={{ display: 'block', mb: 1, textTransform: 'uppercase' }}>
              {t('plan.income')}
            </Typography>
            <Stack spacing={1.5} mb={3}>
              {incomeItems.map((item) => (
                <PlanItemRow
                  key={item.id}
                  item={item}
                  onConfirm={() => setConfirmItem(item)}
                  onDelete={() => setDeleteItem(item)}
                  onClick={() => navigate(`/plan/edit/${item.id}`)}
                />
              ))}
            </Stack>
          </>
        )}

        {/* Expense section */}
        {expenseItems.length > 0 && (
          <>
            <Typography variant="labelMedium" color="text.secondary" sx={{ display: 'block', mb: 1, textTransform: 'uppercase' }}>
              {t('plan.expenses')}
            </Typography>
            <Stack spacing={1.5}>
              {expenseItems.map((item) => (
                <PlanItemRow
                  key={item.id}
                  item={item}
                  onConfirm={() => setConfirmItem(item)}
                  onDelete={() => setDeleteItem(item)}
                  onClick={() => navigate(`/plan/edit/${item.id}`)}
                />
              ))}
            </Stack>
          </>
        )}
      </Box>

      {/* Confirm sheet */}
      <ConfirmSheet
        item={confirmItem}
        open={!!confirmItem}
        onClose={() => setConfirmItem(null)}
        onConfirm={handleConfirm}
        isLoading={confirmMutation.isPending}
      />

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteItem} onClose={() => setDeleteItem(null)}>
        <DialogTitle>{t('plan.deleteItem')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('plan.deleteItemConfirm', { name: deleteItem?.name })}
            {deleteItem?.recurringEvent && ` ${t('plan.deleteItemRecurring')}`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteItem(null)}>{t('common.cancel')}</Button>
          <Button color="error" onClick={handleDelete} disabled={deleteMutation.isPending}>{t('common.delete')}</Button>
        </DialogActions>
      </Dialog>

      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: { xs: 80, md: 16 }, right: 16 }}
        onClick={() => navigate('/plan/add')}
      >
        <AddIcon />
      </Fab>
    </Layout>
  );
};

const PlanItemRow = ({
  item, onConfirm, onDelete, onClick,
}: {
  item: PlannedItem;
  onConfirm: () => void;
  onDelete: () => void;
  onClick: () => void;
}) => {
  const { t } = useTranslation();
  const isPartial = !item.isPaid && (item.paidAmount ?? 0) > 0;
  const currency = item.account?.currency ?? 'USD';

  return (
    <Card
      variant="outlined"
      sx={{ border: 'none', bgcolor: 'background.paper', opacity: item.isPaid ? 0.6 : 1 }}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: '12px !important' }}>
        <IconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); onConfirm(); }}
          color={item.isPaid ? 'success' : item.type === 'INCOME' ? 'success' : 'default'}
          disabled={item.isPaid}
        >
          {item.isPaid ? <PaidIcon /> : <UnpaidIcon />}
        </IconButton>

        <Box sx={{ flex: 1 }} onClick={onClick}>
          <Box display="flex" alignItems="center" gap={0.5}>
            {item.type === 'INCOME'
              ? <IncomeIcon sx={{ fontSize: 14, color: 'success.main' }} />
              : <ExpenseIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            }
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, textDecoration: item.isPaid ? 'line-through' : 'none' }}
            >
              {item.name}
            </Typography>
            {item.recurringEvent && (
              <RecurringIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
            )}
          </Box>
          <Typography variant="labelSmall" color="text.secondary">
            {t('plan.due', { date: new Date(item.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) })}
            {item.category?.name && ` • ${item.category.name}`}
            {isPartial && ` • ${formatAmount(item.paidAmount!, currency)} paid`}
          </Typography>
        </Box>

        <Typography variant="body2" sx={{ fontWeight: 'bold', color: item.type === 'INCOME' ? 'success.main' : 'inherit' }}>
          {item.type === 'INCOME' ? '+' : ''}{formatAmount(item.amount, currency)}
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
};

export default MonthlyPlan;
