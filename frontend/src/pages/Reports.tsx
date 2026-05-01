import { useState } from 'react';
import {
  Box, Typography, CircularProgress, Stack, IconButton, Card, CardContent,
} from '@mui/material';
import {
  ChevronLeft as PrevIcon, ChevronRight as NextIcon,
} from '@mui/icons-material';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { useTransactions, useMonthlyTrend } from '../hooks/useApi';
import { formatAmount } from '../utils/formatAmount';

const COLORS = ['#4CAF50', '#FF5722', '#2196F3', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#607D8B'];

const Reports = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [viewDate, setViewDate] = useState(new Date());
  const month = viewDate.getMonth() + 1;
  const year = viewDate.getFullYear();

  const { data: transactions, isLoading: txLoading } = useTransactions({
    type: 'EXPENSE',
    'date[after]': new Date(year, month - 1, 1).toISOString(),
    'date[before]': new Date(year, month, 0, 23, 59, 59).toISOString(),
    itemsPerPage: 500,
  });

  const { data: trend, isLoading: trendLoading } = useMonthlyTrend(6);

  const prevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const now = new Date();
  const canGoNext =
    viewDate.getFullYear() < now.getFullYear() ||
    (viewDate.getFullYear() === now.getFullYear() && viewDate.getMonth() < now.getMonth());

  const categorySpend = transactions?.reduce<Record<string, { name: string; value: number; color: string }>>((acc, tx) => {
    const key = tx.category?.name ?? 'Uncategorized';
    if (!acc[key]) acc[key] = { name: key, value: 0, color: tx.category?.color ?? '#9e9e9e' };
    acc[key].value += tx.amount;
    return acc;
  }, {});

  const pieData = Object.values(categorySpend ?? {}).sort((a, b) => b.value - a.value);
  const totalExpense = pieData.reduce((s, d) => s + d.value, 0);
  const currency = user?.currency ?? 'USD';

  const barData = trend?.map((item) => ({
    name: item.month,
    Income: item.income,
    Expense: item.expense,
  })) ?? [];

  if (txLoading || trendLoading) {
    return (
      <Layout title={t('nav.reports')}>
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="Reports">
      <Box p={2}>
        <Stack spacing={3}>
          {/* Spending by Category */}
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <IconButton size="small" onClick={prevMonth}><PrevIcon /></IconButton>
                <Typography variant="titleMedium">
                  {viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </Typography>
                <IconButton size="small" onClick={nextMonth} disabled={!canGoNext}><NextIcon /></IconButton>
              </Box>

              {pieData.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" py={4}>
                  {t('reports.noExpenses')}
                </Typography>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData} cx="50%" cy="50%"
                        innerRadius={60} outerRadius={90}
                        paddingAngle={2} dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={entry.name} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatAmount(v, currency)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Stack spacing={0.5} mt={1}>
                    {pieData.map((entry, index) => (
                      <Box key={entry.name} display="flex" justifyContent="space-between" alignItems="center">
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: entry.color || COLORS[index % COLORS.length] }} />
                          <Typography variant="labelMedium">{entry.name}</Typography>
                        </Box>
                        <Typography variant="labelMedium" fontWeight="bold">
                          {formatAmount(entry.value, currency)}
                          <Typography component="span" variant="labelSmall" color="text.secondary" ml={0.5}>
                            ({Math.round((entry.value / totalExpense) * 100)}%)
                          </Typography>
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </>
              )}
            </CardContent>
          </Card>

          {/* Income vs Expense Trend */}
          <Card>
            <CardContent>
              <Typography variant="titleMedium" mb={2}>{t('reports.trend')}</Typography>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => v < 1000 ? String(v) : `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v: number) => formatAmount(v, currency)} />
                  <Legend />
                  <Bar dataKey="Income" fill="#4CAF50" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expense" fill="#FF5722" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </Layout>
  );
};

export default Reports;
