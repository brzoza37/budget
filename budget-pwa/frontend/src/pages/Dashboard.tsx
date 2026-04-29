import React from 'react';
import {
  Box, Typography, Card, CardContent, IconButton, Fab,
  CircularProgress, Stack,
} from '@mui/material';
import {
  Add as AddIcon, AccountBalance as AccountIcon,
  TrendingUp as IncomeIcon, TrendingDown as ExpenseIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAccounts, useTransactions, useStatsSummary } from '../hooks/useApi';
import { formatAmount } from '../utils/formatAmount';
import type { Account, Transaction } from '../types/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const now = new Date();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: transactions, isLoading: txLoading } = useTransactions({
    'order[date]': 'desc',
    itemsPerPage: 5,
  });
  const { data: stats, isLoading: statsLoading } = useStatsSummary(
    now.getFullYear(),
    now.getMonth() + 1,
  );

  const isLoading = accountsLoading || txLoading || statsLoading;

  if (isLoading) {
    return (
      <Layout title="Budget">
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  const userCurrency = accounts?.[0]?.currency ?? 'USD';

  return (
    <Layout
      title="Budget"
      actions={<IconButton onClick={() => navigate('/accounts')}><AccountIcon /></IconButton>}
    >
      <Box p={2}>
        {/* Total Balance */}
        <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', mb: 2 }}>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="labelLarge" sx={{ opacity: 0.8 }}>Total Balance</Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold', my: 1 }}>
              {formatAmount(stats?.totalBalance ?? 0, userCurrency)}
            </Typography>
            {(stats?.plannedExpensesUnpaid ?? 0) > 0 && (
              <>
                <Typography variant="labelMedium" sx={{ opacity: 0.9 }}>
                  Forecasted: {formatAmount(stats!.forecastedBalance, userCurrency)}
                </Typography>
                <Typography variant="labelSmall" sx={{ opacity: 0.7, display: 'block' }}>
                  After {formatAmount(stats!.plannedExpensesUnpaid, userCurrency)} in planned payments
                </Typography>
              </>
            )}
          </CardContent>
        </Card>

        {/* Income / Expense */}
        <Stack direction="row" spacing={2} mb={2}>
          <SummaryCard
            title="Income" amount={stats?.monthlyIncome ?? 0}
            currency={userCurrency} icon={<IncomeIcon />} color="#2E7D32"
          />
          <SummaryCard
            title="Expenses" amount={stats?.monthlyExpense ?? 0}
            currency={userCurrency} icon={<ExpenseIcon />} color="#C62828"
          />
        </Stack>

        {/* Accounts */}
        <SectionHeader title="Accounts" onAction={() => navigate('/accounts')} />
        <Box display="flex" gap={1.5} overflow="auto" pb={1} mb={2} sx={{ scrollbarWidth: 'none' }}>
          {accounts?.map((account) => (
            <AccountChip key={account.id} account={account} />
          ))}
        </Box>

        {/* Recent Transactions */}
        <SectionHeader title="Recent Transactions" onAction={() => navigate('/transactions')} />
        <Stack spacing={1}>
          {transactions?.length === 0 && (
            <Typography variant="body2" color="text.secondary" align="center" py={2}>
              No transactions yet. Tap + to add one!
            </Typography>
          )}
          {transactions?.map((transaction) => (
            <TransactionItem key={transaction.id} transaction={transaction} />
          ))}
        </Stack>
      </Box>

      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: { xs: 80, md: 16 }, right: 16 }}
        onClick={() => navigate('/transactions/add')}
      >
        <AddIcon />
      </Fab>
    </Layout>
  );
};

const SummaryCard = ({
  title, amount, currency, icon, color,
}: {
  title: string; amount: number; currency: string; icon: React.ReactNode; color: string;
}) => (
  <Card sx={{ flex: 1, bgcolor: `${color}10` }}>
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: '16px !important' }}>
      <Box sx={{
        bgcolor: color, color: 'white', borderRadius: '12px',
        width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="labelSmall" color="text.secondary">{title}</Typography>
        <Typography variant="h6" sx={{ color, fontWeight: 'bold' }}>
          {formatAmount(amount, currency)}
        </Typography>
      </Box>
    </CardContent>
  </Card>
);

const SectionHeader = ({ title, onAction }: { title: string; onAction: () => void }) => (
  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
    <Typography variant="titleMedium">{title}</Typography>
    <Box
      onClick={onAction}
      sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'primary.main' }}
    >
      <Typography variant="labelMedium">See all</Typography>
      <ChevronRightIcon fontSize="small" />
    </Box>
  </Box>
);

const AccountChip = ({ account }: { account: Account }) => (
  <Card sx={{
    minWidth: 140, bgcolor: `${account.color}15`,
    border: `1px solid ${account.color}30`, boxShadow: 'none',
  }}>
    <CardContent sx={{ p: '12px !important' }}>
      <Typography variant="labelMedium" color="text.secondary">{account.name}</Typography>
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: account.color }}>
        {formatAmount(account.balance, account.currency)}
      </Typography>
    </CardContent>
  </Card>
);

const TransactionItem = ({ transaction }: { transaction: Transaction }) => {
  const color = transaction.type === 'INCOME' ? '#2E7D32'
    : transaction.type === 'TRANSFER' ? '#1565C0' : '#C62828';
  const prefix = transaction.type === 'INCOME' ? '+' : transaction.type === 'EXPENSE' ? '-' : '';
  const currency = transaction.account?.currency ?? 'USD';

  return (
    <Card variant="outlined" sx={{ border: 'none', bgcolor: 'background.paper' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: '12px !important' }}>
        <Box sx={{
          width: 40, height: 40, borderRadius: '50%',
          bgcolor: transaction.type === 'INCOME' ? '#E8F5E9' : '#FFEBEE',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color,
        }}>
          {transaction.type === 'INCOME' ? <IncomeIcon /> : <ExpenseIcon />}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {transaction.category?.name ?? (transaction.type === 'TRANSFER' ? 'Transfer' : transaction.note ?? '—')}
          </Typography>
          <Typography variant="labelSmall" color="text.secondary">
            {transaction.date ? new Date(transaction.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 'bold', color }}>
          {prefix}{formatAmount(transaction.amount, currency)}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default Dashboard;
