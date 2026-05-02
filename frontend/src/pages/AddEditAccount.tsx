import React, { useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  Stack,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
  Grid,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Check as SaveIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { useAccount, useCreateAccount, useUpdateAccount } from '../hooks/useApi';

const AddEditAccount = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const { data: account, isLoading: isAccountLoading } = useAccount(id);
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount(id || '');

  const [name, setName] = useState('');
  const [type, setType] = useState('BANK');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [color, setColor] = useState('#4CAF50');

  useEffect(() => {
    if (account) {
      setName(account.name);
      setType(account.type);
      setBalance(account.balance.toString());
      setCurrency(account.currency);
      setColor(account.color);
    }
  }, [account]);

  const accountTypes = ['CASH', 'BANK', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'OTHER'];
  const colors = ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722'];

  const handleSave = async () => {
    const payload = {
      name,
      type,
      balance: parseFloat(balance),
      currency,
      color,
      icon: 'account_balance_wallet', // default for now
      isArchived: account?.isArchived || false,
    };

    if (isEdit) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
    navigate(-1);
  };

  const isLoading = isAccountLoading;

  if (isLoading) {
    return (
      <Layout title={isEdit ? t('accounts.editTitle') : t('accounts.addTitle')}>
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout
      title={isEdit ? t('accounts.editTitle') : t('accounts.addTitle')}
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
          <TextField
            label={t('accounts.fieldName')}
            variant="outlined"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('accounts.fieldNamePlaceholder')}
          />

          <TextField
            select
            label={t('accounts.fieldType')}
            value={type}
            onChange={(e) => setType(e.target.value)}
            fullWidth
          >
            {accountTypes.map((option) => (
              <MenuItem key={option} value={option}>
                {t(`accounts.types.${option.toLowerCase()}`)}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label={t('accounts.fieldBalance')}
            variant="outlined"
            fullWidth
            type="number"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            inputProps={{ step: "0.01" }}
          />

          <TextField
            select
            label={t('accounts.fieldCurrency')}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            fullWidth
          >
            {['USD', 'EUR', 'GBP', 'PLN', 'JPY'].map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </TextField>

          <Box>
            <Box mb={1} ml={1}>
              <Box component="span" fontSize="0.75rem" color="text.secondary">{t('accounts.fieldColor')}</Box>
            </Box>
            <Grid container spacing={1}>
              {colors.map((c) => (
                <Grid item key={c} xs={3} sm={2} md={1.5}>
                  <Box
                    onClick={() => setColor(c)}
                    sx={{
                      height: 40,
                      bgcolor: c,
                      borderRadius: 1,
                      cursor: 'pointer',
                      border: color === c ? '3px solid white' : 'none',
                      boxShadow: color === c ? '0 0 0 2px #4CAF50' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>

          <Button 
            variant="contained" 
            size="large" 
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
            sx={{ mt: 2, height: 56, borderRadius: 3 }}
          >
            {isEdit ? t('accounts.updateButton') : t('accounts.saveButton')}
          </Button>
        </Stack>
      </Box>
    </Layout>
  );
};

export default AddEditAccount;
