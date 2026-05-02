import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Stack,
  TextField,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Check as SaveIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { 
  useAccounts, 
  useCategories, 
  useTransaction, 
  useCreateTransaction, 
  useUpdateTransaction 
} from '../hooks/useApi';

const AddEditTransaction = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const { data: accounts, isLoading: isAccountsLoading } = useAccounts();
  const { data: categories, isLoading: isCategoriesLoading } = useCategories();
  const { data: transaction, isLoading: isTransactionLoading } = useTransaction(id);
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction(id || '');

  const [type, setType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(transaction.amount.toString());
      setAccountId(transaction.account['@id'] || '');
      setCategoryId(transaction.category?.['@id'] || '');
      setToAccountId(transaction.toAccount?.['@id'] || '');
      setNote(transaction.note || '');
      setDate(transaction.date.split('T')[0]);
    }
  }, [transaction]);

  const filteredCategories = categories?.filter(
    c => !c.isArchived && c.type === (type === 'TRANSFER' ? 'EXPENSE' : type)
  ) || [];

  const handleSave = async () => {
    const payload = {
      type,
      amount: parseFloat(amount),
      account: accountId,
      category: type === 'TRANSFER' ? undefined : (categoryId || undefined),
      toAccount: type === 'TRANSFER' ? toAccountId : undefined,
      note,
      date: new Date(date).toISOString(),
    };

    if (isEdit) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateMutation.mutateAsync(payload as any);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await createMutation.mutateAsync(payload as any);
    }
    navigate(-1);
  };

  const isLoading = isAccountsLoading || isCategoriesLoading || isTransactionLoading;

  if (isLoading) {
    return (
      <Layout title={isEdit ? t('transactions.editTitle') : t('transactions.addTitle')}>
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout
      title={isEdit ? t('transactions.editTitle') : t('transactions.addTitle')}
      navigationIcon={
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </IconButton>
      }
      actions={
        <IconButton onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
          <SaveIcon />
        </IconButton>
      }
    >
      <Box p={2}>
        <Stack spacing={3}>
          <ToggleButtonGroup
            value={type}
            exclusive
            onChange={(_, newType) => newType && setType(newType)}
            fullWidth
            color="primary"
          >
            <ToggleButton value="INCOME">{t('transactions.income')}</ToggleButton>
            <ToggleButton value="EXPENSE">{t('transactions.expense')}</ToggleButton>
            <ToggleButton value="TRANSFER">{t('transactions.transfer')}</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            label={t('transactions.fieldAmount')}
            variant="outlined"
            fullWidth
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputProps={{ step: "0.01" }}
          />

          <TextField
            label={t('transactions.fieldDate')}
            variant="outlined"
            fullWidth
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            select
            label={t('transactions.fieldAccount')}
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            fullWidth
          >
            {accounts?.map((option) => (
              <MenuItem key={option['@id']} value={option['@id']}>
                {option.name}
              </MenuItem>
            ))}
          </TextField>

          {type === 'TRANSFER' ? (
            <TextField
              select
              label={t('transactions.fieldToAccount')}
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              fullWidth
            >
              {accounts?.filter(a => a['@id'] !== accountId).map((option) => (
                <MenuItem key={option['@id']} value={option['@id']}>
                  {option.name}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              select
              label={t('transactions.fieldCategory')}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              fullWidth
            >
              <MenuItem value="">{t('transactions.categoryNone')}</MenuItem>
              {filteredCategories.map((option) => (
                <MenuItem key={option['@id']} value={option['@id']}>
                  {option.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            label={t('transactions.fieldNote')}
            variant="outlined"
            fullWidth
            multiline
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <Button 
            variant="contained" 
            size="large" 
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
            sx={{ mt: 2, height: 56, borderRadius: 3 }}
          >
            {isEdit ? t('transactions.updateButton') : t('transactions.saveButton')}
          </Button>
        </Stack>
      </Box>
    </Layout>
  );
};

export default AddEditTransaction;
