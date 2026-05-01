import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, IconButton, Fab,
  CircularProgress, Stack, Drawer, ToggleButtonGroup, ToggleButton,
  Button, Snackbar, Alert,
} from '@mui/material';
import {
  Add as AddIcon, FilterList as FilterIcon, Sell as CategoriesIcon,
  TrendingUp as IncomeIcon, TrendingDown as ExpenseIcon,
  ArrowForward as TransferIcon, Delete as DeleteIcon,
  FileDownload as DownloadIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { useTransactions, useDeleteTransaction } from '../hooks/useApi';
import { formatAmount } from '../utils/formatAmount';
import type { Transaction } from '../types/api';
import apiClient from '../api/apiClient';
import { exportToCsv } from '../utils/exportToCsv';

type TypeFilter = 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER';

const Transactions = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userCurrency = user?.currency ?? 'USD';
  const navigate = useNavigate();
  const [filterOpen, setFilterOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');

  const params: Record<string, string> = { 'order[date]': 'desc' };
  if (typeFilter !== 'ALL') params.type = typeFilter;

  const { data: transactions, isLoading } = useTransactions(params);
  const deleteMutation = useDeleteTransaction();

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportSnack, setExportSnack] = useState('');

  const handleExport = async () => {
    setExporting(true);
    setExportError('');
    try {
      const exportParams = { ...params, itemsPerPage: 1000 };
      const { data } = await apiClient.get<{ 'hydra:member': Transaction[] }>('/transactions', { params: exportParams });
      const txs = data['hydra:member'];
      if (txs.length === 0) {
        setExportSnack(t('transactions.noTransactionsToExport'));
        return;
      }
      exportToCsv(txs);
    } catch (err) {
      console.error('CSV export failed', err);
      setExportError(t('transactions.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const grouped = useMemo(() => {
    if (!transactions) return [];
    const map = new Map<string, Transaction[]>();
    for (const tx of transactions) {
      const key = tx.date ? new Date(tx.date).toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      }) : 'Unknown date';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(tx);
    }
    return Array.from(map.entries());
  }, [transactions]);

  const handleDelete = async (tx: Transaction) => {
    if (!tx.id) return;
    if (window.confirm(t('transactions.deleteConfirm', { amount: formatAmount(tx.amount, tx.account?.currency ?? userCurrency) }))) {
      await deleteMutation.mutateAsync(String(tx.id));
    }
  };

  if (isLoading) {
    return (
      <Layout title={t('transactions.title')}>
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout
      title={t('transactions.title')}
      actions={
        <Box display="flex" gap={1}>
          <IconButton onClick={() => navigate('/categories')} aria-label="Manage categories">
            <CategoriesIcon />
          </IconButton>
          <IconButton onClick={handleExport} disabled={exporting} title={t('transactions.exportCsv')} aria-label={t('transactions.exportCsv')}>
            {exporting ? <CircularProgress size={20} /> : <DownloadIcon />}
          </IconButton>
          <IconButton onClick={() => setFilterOpen(true)}>
            <FilterIcon color={typeFilter !== 'ALL' ? 'primary' : 'inherit'} />
          </IconButton>
        </Box>
      }
    >
      {exportError && (
        <Alert severity="error" onClose={() => setExportError('')} sx={{ mx: 2, mt: 1 }}>
          {exportError}
        </Alert>
      )}
      <Snackbar
        open={!!exportSnack}
        autoHideDuration={3000}
        onClose={() => setExportSnack('')}
        message={exportSnack}
      />
      <Box p={2}>
        {typeFilter !== 'ALL' && (
          <Box mb={1}>
            <Button size="small" onClick={() => setTypeFilter('ALL')} variant="outlined">
              {t('transactions.clearFilter', { type: typeFilter })}
            </Button>
          </Box>
        )}

        {grouped.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="60vh" textAlign="center">
            <Typography variant="body2" color="text.secondary">
              {t('transactions.noTransactions')}<br />{t('transactions.addFirst')}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={0}>
            {grouped.map(([date, txs]) => (
              <Box key={date}>
                <Typography
                  variant="labelMedium"
                  color="text.secondary"
                  sx={{ display: 'block', px: 0.5, pt: 2, pb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}
                >
                  {date}
                </Typography>
                <Stack spacing={1}>
                  {txs.map((tx) => (
                    <TransactionListItem
                      key={tx.id}
                      transaction={tx}
                      userCurrency={userCurrency}
                      onClick={() => navigate(`/transactions/edit/${tx.id}`)}
                      onDelete={() => handleDelete(tx)}
                    />
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: { xs: 80, md: 16 }, right: 16 }}
        onClick={() => navigate('/transactions/add')}
      >
        <AddIcon />
      </Fab>

      <Drawer anchor="bottom" open={filterOpen} onClose={() => setFilterOpen(false)}>
        <Box p={3}>
          <Typography variant="titleMedium" mb={2}>{t('transactions.filterByType')}</Typography>
          <ToggleButtonGroup
            value={typeFilter} exclusive fullWidth color="primary"
            onChange={(_, v) => { if (v) { setTypeFilter(v); setFilterOpen(false); } }}
          >
            <ToggleButton value="ALL">{t('transactions.all')}</ToggleButton>
            <ToggleButton value="INCOME">{t('transactions.income')}</ToggleButton>
            <ToggleButton value="EXPENSE">{t('transactions.expense')}</ToggleButton>
            <ToggleButton value="TRANSFER">{t('transactions.transfer')}</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Drawer>
    </Layout>
  );
};

const TransactionListItem = ({
  transaction, onClick, onDelete, userCurrency,
}: {
  transaction: Transaction; onClick: () => void; onDelete: () => void; userCurrency: string;
}) => {
  const color = transaction.type === 'INCOME' ? '#2E7D32'
    : transaction.type === 'TRANSFER' ? '#1565C0' : '#C62828';
  const prefix = transaction.type === 'INCOME' ? '+' : transaction.type === 'EXPENSE' ? '-' : '';
  const currency = transaction.account?.currency ?? userCurrency;

  return (
    <Card
      onClick={onClick}
      variant="outlined"
      sx={{ cursor: 'pointer', '&:active': { bgcolor: 'action.selected' }, border: 'none', bgcolor: 'background.paper' }}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: '12px !important' }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: '50%',
          bgcolor: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color,
        }}>
          {transaction.type === 'INCOME' ? <IncomeIcon />
            : transaction.type === 'TRANSFER' ? <TransferIcon /> : <ExpenseIcon />}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {transaction.category?.name ?? (transaction.type === 'TRANSFER' ? 'Transfer' : '—')}
          </Typography>
          <Typography variant="labelSmall" color="text.secondary" sx={{ display: 'block' }}>
            {transaction.account?.name}
            {transaction.toAccount && ` → ${transaction.toAccount.name}`}
            {transaction.note && ` • ${transaction.note}`}
          </Typography>
        </Box>
        <Box textAlign="right" display="flex" alignItems="center" gap={1}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color }}>
              {prefix}{formatAmount(transaction.amount, currency)}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
};

export default Transactions;
