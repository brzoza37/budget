import React from 'react';
import {
  Box, Typography, Card, CardContent, IconButton, Fab,
  CircularProgress, Stack, Alert,
} from '@mui/material';
import {
  Add as AddIcon, AccountBalance as AccountIcon,
  TrendingUp as IncomeIcon, TrendingDown as ExpenseIcon,
  ChevronRight as ChevronRightIcon, BarChart as ReportsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { useAccounts, useTransactions, useStatsSummary } from '../hooks/useApi';
import { formatAmount } from '../utils/formatAmount';
import type { Account, Transaction } from '../types/api';

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
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

  const userCurrency = user?.currency ?? 'USD';

  return (
    <Layout
      title="Budget"
      actions={
        <>
          <IconButton onClick={() => navigate('/reports')}><ReportsIcon /></IconButton>
          <IconButton onClick={() => navigate('/accounts')}><AccountIcon /></IconButton>
        </>
      }
    >
      {stats?.missingRates && stats.missingRates.length > 0 && (
        <Alert severity="warning" sx={{ mx: 2, mt: 1 }}>
          {t('dashboard.missingRatesWarning', { currencies: stats.missingRates.join(', ') })}
        </Alert>
      )}
      <Box p={2}>
        {/* Total Balance */}
        <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', mb: 2 }}>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="labelLarge" sx={{ opacity: 0.8 }}>{t('dashboard.totalBalance')}</Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold', my: 1 }}>
              {formatAmount(stats?.totalBalance ?? 0, userCurrency)}
            </Typography>
          </CardContent>
        </Card>

        {/* Envelope Card */}
        {((stats?.plannedIncomeThisMonth ?? 0) > 0 || (stats?.plannedExpensesThisMonth ?? 0) > 0) && (
          <Card
            sx={{ cursor: 'pointer', border: 'none', bgcolor: 'background.paper', mb: 2 }}
            onClick={() => navigate('/plan')}
          >
            <CardContent sx={{ py: 2 }}>
              <Typography variant="labelMedium" color="text.secondary" sx={{ display: 'block', mb: 1.5, textTransform: 'uppercase' }}>
                {now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} Plan
              </Typography>
              <Stack spacing={0.5}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="success.main">{t('dashboard.plannedIn')}</Typography>
                  <Typography variant="body2" color="success.main" fontWeight="bold">
                    {formatAmount(stats?.plannedIncomeThisMonth ?? 0, userCurrency)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">{t('dashboard.committed')}</Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight="bold">
                    {formatAmount(stats?.plannedExpensesThisMonth ?? 0, userCurrency)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" sx={{ pt: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="body2" fontWeight="bold">{t('dashboard.freeToPlan')}</Typography>
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    color={(stats?.plannedIncomeThisMonth ?? 0) - (stats?.plannedExpensesThisMonth ?? 0) < 0 ? 'error.main' : 'text.primary'}
                  >
                    {formatAmount(
                      (stats?.plannedIncomeThisMonth ?? 0) - (stats?.plannedExpensesThisMonth ?? 0),
                      userCurrency
                    )}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Income / Expense */}
        <Stack direction="row" spacing={2} mb={2}>
          <SummaryCard
            title={t('dashboard.income')} amount={stats?.monthlyIncome ?? 0}
            currency={userCurrency} icon={<IncomeIcon />} color="#2E7D32"
          />
          <SummaryCard
            title={t('dashboard.expenses')} amount={stats?.monthlyExpense ?? 0}
            currency={userCurrency} icon={<ExpenseIcon />} color="#C62828"
          />
        </Stack>

        {/* Accounts */}
        <SectionHeader title={t('nav.accounts')} onAction={() => navigate('/accounts')} />
        <Box display="flex" gap={1.5} overflow="auto" pb={1} mb={2} sx={{ scrollbarWidth: 'none' }}>
          {accounts?.map((account) => (
            <AccountChip key={account.id} account={account} />
          ))}
        </Box>

        {/* Recent Transactions */}
        <SectionHeader title={t('dashboard.recentTransactions')} onAction={() => navigate('/transactions')} />
        <Stack spacing={1}>
          {transactions?.length === 0 && (
            <Typography variant="body2" color="text.secondary" align="center" py={2}>
              {t('dashboard.noTransactions').split('\n').map((line, i) => (
                <React.Fragment key={i}>{line}{i === 0 && <br />}</React.Fragment>
              ))}
            </Typography>
          )}
          {transactions?.map((transaction) => (
            <TransactionItem key={transaction.id} transaction={transaction} userCurrency={userCurrency} />
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

const SectionHeader = ({ title, onAction }: { title: string; onAction: () => void }) => {
  const { t } = useTranslation();
  return (
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
      <Typography variant="titleMedium">{title}</Typography>
      <Box
        onClick={onAction}
        sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'primary.main' }}
      >
        <Typography variant="labelMedium">{t('dashboard.seeAll')}</Typography>
        <ChevronRightIcon fontSize="small" />
      </Box>
    </Box>
  );
};

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

const TransactionItem = ({ transaction, userCurrency }: { transaction: Transaction; userCurrency: string }) => {
  const color = transaction.type === 'INCOME' ? '#2E7D32'
    : transaction.type === 'TRANSFER' ? '#1565C0' : '#C62828';
  const prefix = transaction.type === 'INCOME' ? '+' : transaction.type === 'EXPENSE' ? '-' : '';
  const currency = transaction.account?.currency ?? userCurrency;

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
